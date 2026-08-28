"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { getConsents, getConsentById } from "@/app/actions/adminData";
import { ConsentCard } from "@/components/admin/ConsentCard";
import { ConsentDetailsModal } from "@/components/admin/ConsentDetailsModal";
import { useIsSuperAdmin } from "@/lib/adminSession";
import type { ConsentWithRelations } from "@/lib/types";


const TIME_FILTERS = [
  { id: "today", label: "היום" },
  { id: "7d", label: "7 ימים אחרונים" },
  { id: "30d", label: "30 ימים אחרונים" },
  { id: "all", label: "הכל" },
] as const;

type TimeFilterId = (typeof TIME_FILTERS)[number]["id"];

/** Returns the ISO cutoff a consent's created_at must be >= to match the filter, or null for "all". */
function cutoffForFilter(filter: TimeFilterId): string | null {
  const now = new Date();
  switch (filter) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start.toISOString();
    }
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case "all":
      return null;
  }
}

/**
 * Realtime customer registry feed for the admin dashboard. Loads consents
 * for the selected time range, then subscribes to Supabase Realtime
 * (Postgres CDC over websockets) so newly signed consents appear instantly
 * — as long as they fall within the currently selected range.
 */
export function LiveQueue() {
  const [filter, setFilter] = useState<TimeFilterId>("today");
  const [consents, setConsents] = useState<ConsentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<ConsentWithRelations | null>(null);
  const isSuperAdmin = useIsSuperAdmin();

  useEffect(() => {
    let cancelled = false;
    const cutoff = cutoffForFilter(filter);

    async function load() {
      setLoading(true);
      try {
        const data = await getConsents(cutoff);
        if (cancelled) return;
        setError(null);
        setConsents(data);
      } catch (fetchError: any) {
        if (cancelled) return;
        setError(fetchError.message);
      }
      if (!cancelled) setLoading(false);
    }

    load();

    const channel = supabaseBrowser
      .channel(`admin-events-${filter}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_events" },
        async (payload) => {
          const newRow = payload.new as { event_type: string; consent_id: string; created_at: string };
          if (newRow.event_type !== 'INSERT') return;
          // Only surface it live if it actually falls within the active filter.
          if (cutoff && newRow.created_at < cutoff) return;

          try {
            const data = await getConsentById(newRow.consent_id);
            if (data) {
              setConsents((prev) => {
                // Prevent duplicates if already fetched or via multiple tabs
                if (prev.some(c => c.id === data.id)) return prev;
                return [data, ...prev].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
              });
            }
          } catch (err) {
            console.error("Failed to fetch new consent:", err);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_events" },
        (payload) => {
          const newRow = payload.new as { event_type: string; consent_id: string; created_at: string };
          if (newRow.event_type !== 'DELETE') return;

          setConsents((prev) => prev.filter((c) => c.id !== newRow.consent_id));
        }
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      cancelled = true;
      supabaseBrowser.removeChannel(channel);
    };
  }, [filter]);

  const flaggedCount = consents.filter((c) => c.has_medical_issue || c.has_behavioral_issue).length;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">מאגר לקוחות</h1>
          <p className="text-sm text-slate-500">
            {consents.length} רשומות מוצגות
            {flaggedCount > 0 && <span className="text-red-600"> · {flaggedCount} מסומנים</span>}
          </p>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            connected ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-brand-500" : "bg-slate-400"}`} />
          {connected ? "מחובר" : "מתחבר…"}
        </span>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TIME_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === f.id
                ? "bg-brand-600 text-white shadow-sm"
                : "border border-brand-200 bg-white text-brand-700 active:bg-brand-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="py-8 text-center text-slate-400">טוען נתונים…</p>}
      {error && <p className="py-8 text-center text-red-600">{error}</p>}

      {!loading && !error && consents.length === 0 && (
        <p className="py-16 text-center text-slate-400">
          {filter === "today" ? "עדיין אין נרשמים היום." : "אין רשומות בטווח התאריכים שנבחר."}
        </p>
      )}

      <div className="space-y-3">
        {consents.map((consent) => (
          <ConsentCard key={consent.id} consent={consent} onClick={() => setSelectedConsent(consent)} />
        ))}
      </div>

      {selectedConsent && (
        <ConsentDetailsModal
          consent={selectedConsent}
          onClose={() => setSelectedConsent(null)}
          isSuperAdmin={isSuperAdmin}
          onDeleted={(id) => {
            setConsents((prev) => prev.filter((c) => c.id !== id));
            setSelectedConsent(null);
          }}
        />
      )}
    </div>
  );
}
