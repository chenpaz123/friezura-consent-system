"use client";

import { Button } from "@/components/ui/Button";

interface CheckInSuccessProps {
  dogName: string;
  onDone?: () => void;
  doneLabel?: string;
  onSecondary?: () => void;
  secondaryLabel?: string;
}

export function CheckInSuccess({
  dogName,
  onDone,
  doneLabel = "החתמת כלב נוסף",
  onSecondary,
  secondaryLabel,
}: CheckInSuccessProps) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl">
        ✅
      </div>
      <div>
        <h2 className="text-xl font-bold text-brand-900">הכל מוכן!</h2>
        <p className="mt-1 text-slate-500">
          {dogName || "הכלב"} נרשם/ה בהצלחה לטיפול. ניפגש בקרוב.
        </p>
      </div>
      <div className="space-y-2">
        {onDone && (
          <Button variant="secondary" onClick={onDone}>
            {doneLabel}
          </Button>
        )}
        {onSecondary && secondaryLabel && (
          <Button variant="primary" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
