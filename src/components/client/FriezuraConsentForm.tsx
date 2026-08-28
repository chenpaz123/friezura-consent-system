"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckboxRow } from "@/components/client/CheckboxRow";
import { DateInput } from "@/components/client/DateInput";
import { SignaturePad, SignaturePadHandle } from "@/components/client/SignaturePad";
import { CheckInSuccess } from "@/components/client/CheckInSuccess";
import { isoToDisplay, todayISO } from "@/lib/date";
import type { CreateConsentPayload, LookupCustomerResponse } from "@/lib/types";

interface FriezuraConsentFormProps {
  /** "manual" is used by the admin's Manual Entry mode; adds a "Return to dashboard" exit. */
  variant?: "kiosk" | "manual";
  onRequestExit?: () => void;
}

const emptyForm = () => ({
  phone: "",
  fullName: "",
  dogName: "",
  date: todayISO(),
  isHealthy: false,
  hasMedicalIssue: false,
  medicalDetails: "",
  hasBehavioralIssue: false,
  behavioralDetails: "",
  infoShared: false,
  expectationsSet: false,
  ageAndOwnershipConfirmed: false,
});

/**
 * The Friezura client consent form — one continuous, mobile-first Hebrew
 * page covering: identifying info, the health/behavior questionnaire and
 * required declarations, and the final signature.
 */
export function FriezuraConsentForm({ variant = "kiosk", onRequestExit }: FriezuraConsentFormProps) {
  const [form, setForm] = useState(emptyForm());
  const [existingDogNames, setExistingDogNames] = useState<string[]>([]);
  const [selectedDogName, setSelectedDogName] = useState<string | "new" | null>(null);

  const [signatureData, setSignatureData] = useState<string | null>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = <K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Debounced lookup: as soon as a full phone number is entered, let the
  // customer pick from their dogs on file instead of retyping the name.
  // The endpoint deliberately returns only dog names (see the route) — no
  // customer name, so there's no name-prefill anymore.
  useEffect(() => {
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 9) {
      setExistingDogNames([]);
      setSelectedDogName(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/customers/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: form.phone }),
        });
        const dogNames: LookupCustomerResponse = await res.json();
        if (cancelled) return;

        setExistingDogNames(dogNames);
        setSelectedDogName(dogNames.length > 0 ? dogNames[0] : "new");
      } catch {
        // Silent — lookup is just a convenience prefill, not required for submission.
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.phone]);

  const setHealthy = (checked: boolean) => {
    update("isHealthy", checked);
    if (checked) {
      update("hasMedicalIssue", false);
      update("medicalDetails", "");
    }
  };

  const setHasMedicalIssue = (checked: boolean) => {
    update("hasMedicalIssue", checked);
    if (checked) update("isHealthy", false);
    else update("medicalDetails", "");
  };

  const setHasBehavioralIssue = (checked: boolean) => {
    update("hasBehavioralIssue", checked);
    if (!checked) update("behavioralDetails", "");
  };

  const dogNameValid =
    existingDogNames.length > 0
      ? selectedDogName === "new"
        ? form.dogName.trim().length > 0
        : !!selectedDogName
      : form.dogName.trim().length > 0;

  const resolvedDogName = selectedDogName && selectedDogName !== "new" ? selectedDogName : form.dogName.trim();

  const canSubmit =
    form.phone.replace(/\D/g, "").length >= 9 &&
    form.fullName.trim().length > 0 &&
    dogNameValid &&
    form.date.length > 0 &&
    (form.isHealthy || form.hasMedicalIssue) &&
    (!form.hasMedicalIssue || form.medicalDetails.trim().length > 0) &&
    (!form.hasBehavioralIssue || form.behavioralDetails.trim().length > 0) &&
    form.infoShared &&
    form.expectationsSet &&
    form.ageAndOwnershipConfirmed &&
    !!signatureData &&
    !submitting;

  const resetForm = () => {
    setForm(emptyForm());
    setExistingDogNames([]);
    setSelectedDogName(null);
    setSignatureData(null);
    setSubmitError(null);
    setSuccess(false);
    padRef.current?.clear();
  };

  const handleSubmit = async () => {
    if (!canSubmit || !signatureData) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateConsentPayload = {
        customerPhone: form.phone,
        fullName: form.fullName.trim(),
        dogName: resolvedDogName,
        hasMedicalIssue: form.hasMedicalIssue,
        // Always send something meaningful: the typed complaint when there's
        // an issue, or an explicit "בריא" when checkbox (a) is checked — so
        // medical_details is never blank for a healthy dog in the DB/admin view.
        medicalDetails: form.hasMedicalIssue ? form.medicalDetails.trim() : "בריא",
        hasBehavioralIssue: form.hasBehavioralIssue,
        behavioralDetails: form.behavioralDetails,
        // Checkbox (e) now carries the coat-condition/cooperation acknowledgment
        // that used to be a separate waiver, so it's what agreed_to_terms maps to.
        agreedToTerms: form.expectationsSet,
        signatureData,
      };
      const res = await fetch("/api/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "אירעה שגיאה בשליחת הטופס. נסו שוב.");
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "אירעה שגיאה בשליחת הטופס. נסו שוב.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-8">
        <CheckInSuccess
          dogName={resolvedDogName}
          onDone={resetForm}
          onSecondary={variant === "manual" ? onRequestExit : undefined}
          secondaryLabel={variant === "manual" ? "חזרה ללוח הבקרה" : undefined}
        />
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 text-lg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

  return (
    <div className="mx-auto w-full max-w-md space-y-8 px-5 py-8">
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="Friezura" className="h-16 w-auto" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-brand-900">תיאום ציפיות ואישור טיפול</h1>
        <p className="mt-1 text-slate-500">אנא מלאו את הפרטים הבאים לפני תחילת הטיפול.</p>
      </div>

      {/* Basic info */}
      <section className="space-y-4">
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
            מספר טלפון
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            placeholder="050-1234567"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={`${inputClass} text-left`}
          />
        </div>

        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
            שם הלקוח/ה
          </label>
          <input
            id="fullName"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className={inputClass}
          />
        </div>

        {existingDogNames.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">בחר/י כלב</p>
            <div className="flex flex-wrap gap-2">
              {existingDogNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedDogName(name)}
                  className={`rounded-xl border-2 px-4 py-2 font-semibold transition-colors ${
                    selectedDogName === name
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-600 active:bg-slate-50"
                  }`}
                >
                  {name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedDogName("new")}
                className={`rounded-xl border-2 px-4 py-2 font-semibold transition-colors ${
                  selectedDogName === "new"
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600 active:bg-slate-50"
                }`}
              >
                + כלב חדש
              </button>
            </div>
            {selectedDogName === "new" && (
              <input
                autoFocus
                placeholder="שם הכלב החדש"
                value={form.dogName}
                onChange={(e) => update("dogName", e.target.value)}
                className={`${inputClass} mt-3`}
              />
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="dogName" className="mb-1 block text-sm font-medium text-slate-700">
              שם הכלב
            </label>
            <input
              id="dogName"
              value={form.dogName}
              onChange={(e) => update("dogName", e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        <div>
          <label htmlFor="date" className="mb-1 block text-sm font-medium text-slate-700">
            תאריך
          </label>
          <DateInput id="date" value={form.date} onChange={(iso) => update("date", iso)} className={inputClass} />
        </div>
      </section>

      {/* Health & behavior questionnaire */}
      <section className="space-y-3 border-t border-slate-200 pt-6">
        <h2 className="text-lg font-bold text-brand-900">שאלון בריאותי והתנהגותי</h2>

        <CheckboxRow label="הכלב בריא ואינו מקבל תרופות." checked={form.isHealthy} onChange={setHealthy} />

        <CheckboxRow
          label="קיימת מחלה / בעיה רפואית / תרופות / אלרגיה / רגישות."
          checked={form.hasMedicalIssue}
          onChange={setHasMedicalIssue}
        />
        {form.hasMedicalIssue && (
          <textarea
            autoFocus
            placeholder="פירוט:"
            value={form.medicalDetails}
            onChange={(e) => update("medicalDetails", e.target.value)}
            rows={3}
            className={inputClass}
          />
        )}

        <CheckboxRow
          label="הכלב רגיש או אינו רגיל לפעולה מסוימת במהלך הטיפול."
          checked={form.hasBehavioralIssue}
          onChange={setHasBehavioralIssue}
        />
        {form.hasBehavioralIssue && (
          <textarea
            autoFocus
            placeholder="פירוט:"
            value={form.behavioralDetails}
            onChange={(e) => update("behavioralDetails", e.target.value)}
            rows={3}
            className={inputClass}
          />
        )}

        <div className="space-y-3 pt-2">
          <CheckboxRow
            label="עדכנתי את הספר/ית בכל מידע רפואי או התנהגותי רלוונטי."
            checked={form.infoShared}
            onChange={(v) => update("infoShared", v)}
            required
          />
          <CheckboxRow
            label="בוצע תיאום ציפיות לגבי התספורת והתוצאה הרצויה, והבנתי כי מצב הפרווה ושיתוף הפעולה של הכלב עשויים להשפיע על התוצאה."
            checked={form.expectationsSet}
            onChange={(v) => update("expectationsSet", v)}
            required
          />
          <CheckboxRow
            label="אני מצהיר/ה כי אני מעל גיל 18, וכי אני הבעלים החוקי של הכלב או מורשה מטעמו."
            checked={form.ageAndOwnershipConfirmed}
            onChange={(v) => update("ageAndOwnershipConfirmed", v)}
            required
          />
        </div>
      </section>

      {/* Final signature */}
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

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <Button disabled={!canSubmit} onClick={handleSubmit}>
        {submitting ? "שולח…" : "אישור וסיום"}
      </Button>
    </div>
  );
}
