"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ConsentCard } from "@/components/admin/ConsentCard";
import { ConsentDetailsModal } from "@/components/admin/ConsentDetailsModal";
import type { ConsentWithRelations } from "@/lib/types";

const CONSENT_SELECT = "*, customers ( full_name, phone_number ), dogs ( name )";
const RESULT_LIMIT = 500;

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

  useEffect(() => {
    let cancelled = false;
    const cutoff = cutoffForFilter(filter);

    async function load() {
      setLoading(true);
      let query = supabaseBrowser
        .from("consents")
        .select(CONSENT_SELECT)
        .order("created_at", { ascending: false })
        .limit(RESULT_LIMIT);
      if (cutoff) query = query.gte("created_at", cutoff);

      const { data, error: fetchError } = await query;

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setError(null);
        setConsents((data ?? []) as unknown as ConsentWithRelations[]);
      }
      setLoading(false);
    }

    load();

    const channel = supabaseBrowser
      .channel(`consents-registry-${filter}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "consents" },
        async (payload) => {
          const newRow = payload.new as { id: string; created_at: string };
          // Only surface it live if it actually falls within the active filter.
          if (cutoff && newRow.created_at < cutoff) return;

          const { data } = await supabaseBrowser
            .from("consents")
            .select(CONSENT_SELECT)
            .eq("id", newRow.id)
            .single();

          if (data) {
            setConsents((prev) => [data as unknown as ConsentWithRelations, ...prev]);
          }
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
        <ConsentDetailsModal consent={selectedConsent} onClose={() => setSelectedConsent(null)} />
      )}
    </div>
  );
}
