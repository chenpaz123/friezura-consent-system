import React from "react";
import { SignaturePad, SignaturePadHandle } from "@/components/client/SignaturePad";
import { isoToDisplay } from "@/lib/date";

export interface SignatureSectionProps {
  form: {
    fullName: string;
    date: string;
  };
  padRef: React.RefObject<SignaturePadHandle>;
  setSignatureData: (data: string | null) => void;
}

export function SignatureSection({ form, padRef, setSignatureData }: SignatureSectionProps) {
  return (
    <section className="space-y-4 border-t border-slate-200 pt-6">
      <h2 className="text-lg font-bold text-brand-900">אישור המשך טיפול</h2>
      <p className="text-sm text-slate-600">קראתי, הבנתי ואני מסכים/ה להמשך הטיפול בהתאם לתיאום הציפיות.</p>

      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span>
          <span className="font-medium text-slate-800">שם: </span>
          {form.fullName || "—"}
        </span>
        <span dir="ltr">
          <span className="font-medium text-slate-800">תאריך: </span>
          {isoToDisplay(form.date)}
        </span>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">חתימה</p>
        <SignaturePad ref={padRef} onChange={setSignatureData} />
      </div>
    </section>
  );
}
