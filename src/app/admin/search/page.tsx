"use client";

import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ConsentCard } from "@/components/admin/ConsentCard";
import { ConsentDetailsModal } from "@/components/admin/ConsentDetailsModal";
import { useIsSuperAdmin } from "@/lib/adminSession";
import type { ConsentWithRelations } from "@/lib/types";

const RESULT_LIMIT = 25;

async function searchConsents(query: string): Promise<ConsentWithRelations[]> {
  const pattern = `%${query}%`;

  const [byPhone, byOwner, byDog] = await Promise.all([
    supabaseBrowser
      .from("consents")
      .select("*, customers ( full_name, phone_number ), dogs ( name )")
      .ilike("customer_phone", pattern)
      .order("created_at", { ascending: false })
      .limit(RESULT_LIMIT),
    supabaseBrowser
      .from("consents")
      .select("*, customers!inner ( full_name, phone_number ), dogs ( name )")
      .ilike("customers.full_name", pattern)
      .order("created_at", { ascending: false })
      .limit(RESULT_LIMIT),
    supabaseBrowser
      .from("consents")
      .select("*, customers ( full_name, phone_number ), dogs!inner ( name )")
      .ilike("dogs.name", pattern)
      .order("created_at", { ascending: false })
      .limit(RESULT_LIMIT),
  ]);

  const merged = new Map<string, ConsentWithRelations>();
  for (const result of [byPhone, byOwner, byDog]) {
    for (const row of (result.data ?? []) as unknown as ConsentWithRelations[]) {
      merged.set(row.id, row);
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, RESULT_LIMIT);
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ConsentWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConsent, setSelectedConsent] = useState<ConsentWithRelations | null>(null);
  const isSuperAdmin = useIsSuperAdmin();
  const trimmed = useMemo(() => query.trim(), [query]);
  const debouncedTrimmed = useDebounce(trimmed, 300);

  useEffect(() => {
    if (debouncedTrimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    let cancelled = false;
    const search = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchConsents(debouncedTrimmed);
        if (!cancelled) setResults(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "החיפוש נכשל.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    search();

    return () => {
      cancelled = true;
    };
  }, [debouncedTrimmed]);

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold text-brand-900">חיפוש לקוח</h1>

      <input
        type="search"
        autoFocus
        placeholder="חיפוש לפי שם, טלפון או שם כלב"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />

      {loading && <p className="py-8 text-center text-slate-400">מחפש…</p>}
      {error && <p className="py-8 text-center text-red-600">{error}</p>}

      {!loading && trimmed.length >= 2 && results.length === 0 && !error && (
        <p className="py-16 text-center text-slate-400">לא נמצאו תוצאות עבור &ldquo;{trimmed}&rdquo;.</p>
      )}

      {trimmed.length < 2 && (
        <p className="py-16 text-center text-slate-400">הקלידו לפחות 2 תווים כדי לחפש.</p>
      )}

      <div className="space-y-3">
        {results.map((consent) => (
          <ConsentCard key={consent.id} consent={consent} onClick={() => setSelectedConsent(consent)} />
        ))}
      </div>

      {selectedConsent && (
        <ConsentDetailsModal
          consent={selectedConsent}
          onClose={() => setSelectedConsent(null)}
          isSuperAdmin={isSuperAdmin}
          onDeleted={(id) => {
            setResults((prev) => prev.filter((c) => c.id !== id));
            setSelectedConsent(null);
          }}
        />
      )}
    </div>
  );
}
