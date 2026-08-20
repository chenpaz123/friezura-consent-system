import { FriezuraConsentForm } from "@/components/client/FriezuraConsentForm";

/**
 * The page a customer lands on after scanning the salon's QR code.
 * A fresh, unauthenticated, mobile-first Hebrew flow — no admin chrome.
 */
export default function ConsentPage() {
  return (
    <main className="min-h-screen bg-brand-50/40">
      <FriezuraConsentForm variant="kiosk" />
    </main>
  );
}
