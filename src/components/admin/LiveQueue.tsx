"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { getAdminPin, useIsSuperAdmin } from "@/lib/adminSession";
import { getConsentById, getConsents } from "@/app/actions/adminData";
import { cutoffForFilter, type TimeFilterId } from "@/lib/timeFilters";
import { ConsentCard } from "@/components/admin/ConsentCard";
import { ConsentDetailsModal } from "@/components/admin/ConsentDetailsModal";
import type { ConsentWithRelations } from "@/lib/types";

const RESULT_LIMIT = 500;

const TIME_FILTERS = [
  { id: "today", label: "היום" },
  { id: "7d", label: "7 ימים אחרונים" },
  { id: "30d", label: "30 ימים אחרונים" },
  { id: "all", label: "הכל" },
] as const;

/**
 * Realtime customer registry feed for the admin dashboard. Loads consents
 * for the selected time range via the `getConsents` Server Action (which
 * re-verifies the admin PIN and queries with the service_role key, bypassing
 * RLS server-side), then subscribes to Realtime on `admin_events` — a
 * ping-only table (id/event_type/consent_id, no PII) that a database trigger
 * populates on every consent insert/delete. RLS denies `anon` SELECT on
 * `consents` directly, so subscribing to that table would silently stop
 * delivering anything; `admin_events` is what the Live Queue actually
 * listens to, and each ping is turned into a real row via `getConsentById`.
 */
export function LiveQueue() {
  const [filter, setFilter] = useState<TimeFilterId>("today");
  const [consents, setConsents] = useState<ConsentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<ConsentWithRelations | null>(null);
  const isSuperAdmin = useIsSuperAdmin();

  // Initial load (and reload) whenever the time-range filter changes.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const pin = getAdminPin();
      const result = pin ? await getConsents(pin, filter) : { error: "יש להתחבר מחדש." };

      if (cancelled) return;
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setConsents((result.data ?? []).slice(0, RESULT_LIMIT));
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  // Realtime subscription: independent of `filter` re-fetching above, since
  // it only needs to react to pings, not re-run the range query.
  useEffect(() => {
    const cutoff = cutoffForFilter(filter);

    const channel = supabaseBrowser
      .channel(`admin-events-${filter}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_events" },
        async (payload) => {
          const event = payload.new as { event_type: "insert" | "delete"; consent_id: string; created_at: string };

          if (event.event_type === "delete") {
            setConsents((prev) => prev.filter((c) => c.id !== event.consent_id));
            return;
          }

          const pin = getAdminPin();
          if (!pin) return;
          const result = await getConsentById(pin, event.consent_id);
          if (!result.data) return;
          // Only surface it live if it actually falls within the active filter.
          if (cutoff && result.data.created_at < cutoff) return;
          setConsents((prev) => [result.data as ConsentWithRelations, ...prev]);
        }
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      setConnected(false);
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
