"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ConsentCard } from "@/components/admin/ConsentCard";
import type { ConsentWithRelations } from "@/lib/types";

const CONSENT_SELECT = "*, customers ( full_name, phone_number ), dogs ( name )";

function startOfTodayISO() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

/**
 * Realtime "today's signed consents" feed for the admin dashboard.
 * Loads today's rows once, then subscribes to Supabase Realtime (Postgres
 * CDC over websockets) so newly signed consents appear instantly without
 * a page refresh.
 */
export function LiveQueue() {
  const [consents, setConsents] = useState<ConsentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadToday() {
      setLoading(true);
      const { data, error: fetchError } = await supabaseBrowser
        .from("consents")
        .select(CONSENT_SELECT)
        .gte("created_at", startOfTodayISO())
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setConsents((data ?? []) as unknown as ConsentWithRelations[]);
      }
      setLoading(false);
    }

    loadToday();

    const channel = supabaseBrowser
      .channel("consents-live-queue")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "consents" },
        async (payload) => {
          const newId = (payload.new as { id: string }).id;
          const { data } = await supabaseBrowser
            .from("consents")
            .select(CONSENT_SELECT)
            .eq("id", newId)
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
  }, []);

  const flaggedCount = consents.filter((c) => c.has_medical_issue || c.has_behavioral_issue).length;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">תורים להיום</h1>
          <p className="text-sm text-slate-500">
            {consents.length} נרשמו היום
            {flaggedCount > 0 && <span className="text-red-600"> · {flaggedCount} מסומנים</span>}
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            connected ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-brand-500" : "bg-slate-400"}`} />
          {connected ? "מחובר" : "מתחבר…"}
        </span>
      </div>

      {loading && <p className="py-8 text-center text-slate-400">טוען את תורי היום…</p>}
      {error && <p className="py-8 text-center text-red-600">{error}</p>}

      {!loading && !error && consents.length === 0 && (
        <p className="py-16 text-center text-slate-400">עדיין אין נרשמים היום.</p>
      )}

      <div className="space-y-3">
        {consents.map((consent) => (
          <ConsentCard key={consent.id} consent={consent} />
        ))}
      </div>
    </div>
  );
}
