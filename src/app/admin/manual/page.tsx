"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FriezuraConsentForm } from "@/components/client/FriezuraConsentForm";
import { PinGate } from "@/components/admin/PinGate";

/**
 * Lets staff hand the device to a customer who can't scan the QR code.
 * Runs the exact same client check-in flow, but requires a staff PIN to
 * leave back to the dashboard so a customer can't wander into other tabs.
 */
export default function ManualEntryPage() {
  const router = useRouter();
  const [pinOpen, setPinOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-sm font-semibold text-brand-900">החתמה ידנית</p>
          <p className="text-xs text-slate-400">מסרו את המכשיר ללקוח/ה</p>
        </div>
        <button
          type="button"
          onClick={() => setPinOpen(true)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 active:bg-slate-100"
        >
          יציאת צוות
        </button>
      </div>

      <FriezuraConsentForm variant="manual" onRequestExit={() => setPinOpen(true)} />

      {pinOpen && (
        <PinGate onSuccess={() => router.push("/admin/queue")} onCancel={() => setPinOpen(false)} />
      )}
    </div>
  );
}
