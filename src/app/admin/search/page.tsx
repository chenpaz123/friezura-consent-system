"use client";

import { useEffect, useMemo, useState } from "react";
import { searchConsents as serverSearchConsents } from "@/app/actions/adminData";
import { ConsentCard } from "@/components/admin/ConsentCard";
import { ConsentDetailsModal } from "@/components/admin/ConsentDetailsModal";
import { useIsSuperAdmin } from "@/lib/adminSession";
import type { ConsentWithRelations } from "@/lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ConsentWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConsent, setSelectedConsent] = useState<ConsentWithRelations | null>(null);
  const isSuperAdmin = useIsSuperAdmin();
  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await serverSearchConsents(trimmed);
        if (!cancelled) setResults(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "החיפוש נכשל.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

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
