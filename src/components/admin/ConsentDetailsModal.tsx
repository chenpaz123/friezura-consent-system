"use client";

import { useEffect } from "react";
import { formatIsraeliDate, formatIsraeliTime } from "@/lib/date";
import type { ConsentWithRelations } from "@/lib/types";

interface ConsentDetailsModalProps {
  consent: ConsentWithRelations;
  onClose: () => void;
}

function InfoRow({ label, value, dir }: { label: string; value: string; dir?: "ltr" | "rtl" }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="font-medium text-slate-500">{label}</span>
      <span dir={dir} className="font-semibold text-slate-800">
        {value}
      </span>
    </div>
  );
}

/**
 * Full-detail readout for a single signed consent, opened by tapping a
 * ConsentCard in the Live Queue or Search tabs. Strictly RTL/Hebrew, and
 * shows everything captured on the client form: identifying info, the
 * health/behavior questionnaire answers (verbatim), the coat-condition
 * agreement, and the rendered signature.
 */
export function ConsentDetailsModal({ consent, onClose }: ConsentDetailsModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const createdAt = new Date(consent.created_at);

  return (
    <div
      dir="rtl"
      // m-0 guards against a sibling `space-y-*`/`space-x-*` wrapper adding a
      // stray margin to this fixed-position overlay (margins still apply to
      // `position: fixed` elements), which would throw off its viewport-edge
      // alignment and silently break backdrop-click-to-close.
      className="fixed inset-0 z-50 m-0 flex items-end justify-center bg-slate-900/60 sm:items-center sm:px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="text-lg font-bold text-brand-900">פרטי טיפול מלאים</h2>
            <p dir="ltr" className="text-xs text-slate-400">
              {formatIsraeliDate(createdAt)} · {formatIsraeliTime(createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          {/* Basic info */}
          <section>
            <h3 className="mb-2 text-sm font-bold text-brand-900">פרטים בסיסיים</h3>
            <div className="rounded-xl bg-slate-50 px-4">
              <InfoRow label="תאריך" value={formatIsraeliDate(createdAt)} dir="ltr" />
              <InfoRow label="שם הלקוח/ה" value={consent.customers?.full_name ?? "לא ידוע"} />
              <InfoRow label="טלפון" value={consent.customers?.phone_number ?? "לא ידוע"} dir="ltr" />
              <InfoRow label="שם הכלב" value={consent.dogs?.name ?? "לא ידוע"} />
            </div>
          </section>

          {/* Questionnaire */}
          <section>
            <h3 className="mb-2 text-sm font-bold text-brand-900">שאלון בריאותי והתנהגותי</h3>
            <div className="space-y-2">
              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  consent.has_medical_issue ? "bg-red-50 text-red-800" : "bg-brand-50 text-brand-800"
                }`}
              >
                <p className="font-semibold">
                  {consent.has_medical_issue ? "⚠️ קיימת בעיה רפואית" : "✓ הכלב בריא ואינו מקבל תרופות"}
                </p>
                {consent.has_medical_issue && consent.medical_details && (
                  <p className="mt-1 whitespace-pre-wrap text-red-900">{consent.medical_details}</p>
                )}
              </div>

              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  consent.has_behavioral_issue ? "bg-red-50 text-red-800" : "bg-brand-50 text-brand-800"
                }`}
              >
                <p className="font-semibold">
                  {consent.has_behavioral_issue
                    ? "⚠️ הכלב רגיש / אינו רגיל לפעולה מסוימת"
                    : "✓ אין רגישות התנהגותית ידועה"}
                </p>
                {consent.has_behavioral_issue && consent.behavioral_details && (
                  <p className="mt-1 whitespace-pre-wrap text-red-900">{consent.behavioral_details}</p>
                )}
              </div>
            </div>
          </section>

          {/* Coat responsibility */}
          <section>
            <h3 className="mb-2 text-sm font-bold text-brand-900">אחריות על תוצאת התספורת</h3>
            <div
              className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                consent.agreed_to_terms ? "bg-brand-50 text-brand-800" : "bg-red-50 text-red-800"
              }`}
            >
              {consent.agreed_to_terms
                ? "✓ הלקוח/ה אישר/ה את תנאי האחריות על תוצאת התספורת בהתאם למצב הפרווה."
                : "⚠️ תנאי האחריות על תוצאת התספורת לא אושרו."}
            </div>
          </section>

          {/* Signature */}
          <section>
            <h3 className="mb-2 text-sm font-bold text-brand-900">חתימה</h3>
            <div className="rounded-xl border border-slate-200 bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={consent.signature_data}
                alt="חתימת הלקוח"
                className="h-32 w-full rounded-lg bg-white object-contain"
              />
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white shadow-sm active:bg-brand-700"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
