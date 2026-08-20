import type { ConsentWithRelations } from "@/lib/types";

interface ConsentCardProps {
  consent: ConsentWithRelations;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "numeric", minute: "2-digit" });
}

function Flag({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-red-100 text-red-700" : "bg-brand-100 text-brand-700"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-red-500" : "bg-brand-500"}`} />
      {label}
    </span>
  );
}

export function ConsentCard({ consent }: ConsentCardProps) {
  const needsAttention = consent.has_medical_issue || consent.has_behavioral_issue;

  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        needsAttention ? "border-red-200" : "border-brand-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-brand-900">{consent.dogs?.name ?? "כלב לא ידוע"}</p>
          <p className="text-sm text-slate-500">
            {consent.customers?.full_name ?? "בעלים לא ידוע"} · {consent.customers?.phone_number}
          </p>
        </div>
        <span className="whitespace-nowrap text-xs font-medium text-slate-400">
          {formatTime(consent.created_at)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Flag label="רפואי" active={consent.has_medical_issue} />
        <Flag label="התנהגותי" active={consent.has_behavioral_issue} />
      </div>

      {consent.has_medical_issue && consent.medical_details && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          <span className="font-semibold">רפואי: </span>
          {consent.medical_details}
        </p>
      )}
      {consent.has_behavioral_issue && consent.behavioral_details && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          <span className="font-semibold">התנהגותי: </span>
          {consent.behavioral_details}
        </p>
      )}
    </div>
  );
}
