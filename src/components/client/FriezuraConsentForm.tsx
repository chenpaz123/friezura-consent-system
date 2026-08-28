"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SignaturePadHandle } from "@/components/client/SignaturePad";
import { CheckInSuccess } from "@/components/client/CheckInSuccess";
import { todayISO } from "@/lib/date";
import type { CreateConsentPayload, Dog, LookupCustomerResponse } from "@/lib/types";
import { BasicInfoSection } from "@/components/client/BasicInfoSection";
import { QuestionnaireSection } from "@/components/client/QuestionnaireSection";
import { SignatureSection } from "@/components/client/SignatureSection";

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
  const [existingDogs, setExistingDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | "new" | null>(null);
  const [nameWasAutofilled, setNameWasAutofilled] = useState(false);

  const [signatureData, setSignatureData] = useState<string | null>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = <K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Debounced lookup: as soon as a full phone number is entered, prefill
  // the customer's name and let them pick from their dogs on file.
  useEffect(() => {
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 9) {
      setExistingDogs([]);
      setSelectedDogId(null);
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
        const data: LookupCustomerResponse = await res.json();
        if (cancelled || !data.exists || !data.customer) return;

        if (!form.fullName || nameWasAutofilled) {
          update("fullName", data.customer.full_name);
          setNameWasAutofilled(true);
        }
        setExistingDogs(data.dogs);
        setSelectedDogId(data.dogs.length > 0 ? data.dogs[0].id : "new");
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
    existingDogs.length > 0 ? selectedDogId === "new" ? form.dogName.trim().length > 0 : !!selectedDogId : form.dogName.trim().length > 0;

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
    setExistingDogs([]);
    setSelectedDogId(null);
    setNameWasAutofilled(false);
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
        dogId: selectedDogId && selectedDogId !== "new" ? selectedDogId : undefined,
        dogName: !selectedDogId || selectedDogId === "new" ? form.dogName.trim() : undefined,
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
          dogName={existingDogs.find((d) => d.id === selectedDogId)?.name ?? form.dogName}
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

      <BasicInfoSection
        form={form}
        update={update}
        setNameWasAutofilled={setNameWasAutofilled}
        existingDogs={existingDogs}
        selectedDogId={selectedDogId}
        setSelectedDogId={setSelectedDogId}
        inputClass={inputClass}
      />

      <QuestionnaireSection
        form={form}
        update={update}
        setHealthy={setHealthy}
        setHasMedicalIssue={setHasMedicalIssue}
        setHasBehavioralIssue={setHasBehavioralIssue}
        inputClass={inputClass}
      />

      <SignatureSection form={form} padRef={padRef} setSignatureData={setSignatureData} />

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <Button disabled={!canSubmit} onClick={handleSubmit}>
        {submitting ? "שולח…" : "אישור וסיום"}
      </Button>
    </div>
  );
}
