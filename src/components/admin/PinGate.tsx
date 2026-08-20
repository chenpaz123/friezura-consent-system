"use client";

import { useEffect, useState } from "react";

/**
 * The single staff PIN used everywhere in the app: entering the /admin
 * dashboard and leaving "Manual Entry" mode back to it. Keeping one
 * hardcoded constant (instead of an env var) means every PinGate always
 * agrees on what counts as a valid code.
 */
export const ADMIN_PIN = "1717";

interface PinGateProps {
  /** Defaults to ADMIN_PIN; only override for tests or a future distinct gate. */
  pin?: string;
  title?: string;
  cancelLabel?: string;
  onSuccess: () => void;
  onCancel: () => void;
  /**
   * "modal" overlays existing content on a dark backdrop (Manual Entry exit).
   * "screen" is a standalone, full-page pink lock screen with the Friezura
   * logo (used to gate the whole /admin dashboard).
   */
  variant?: "modal" | "screen";
}

/**
 * Mobile-friendly, RTL PIN pad. Reused both to gate the entire admin
 * dashboard behind a fixed PIN and to gate leaving "Manual Entry" mode
 * back to the dashboard.
 *
 * The digit pad (1-9, 0) is always ordered left-to-right like a standard
 * numeric keypad — universal convention even in RTL apps — regardless of
 * the page's ambient `dir`, via an explicit `dir="ltr"` on that grid only.
 * The cancel/backspace row sits in its own grid and keeps following the
 * page's natural RTL flow.
 */
export function PinGate({
  pin = ADMIN_PIN,
  title = "הזינו קוד צוות כדי להמשיך",
  cancelLabel = "ביטול",
  onSuccess,
  onCancel,
  variant = "modal",
}: PinGateProps) {
  const [entered, setEntered] = useState("");
  const [shake, setShake] = useState(false);
  const pinLength = pin.length;

  useEffect(() => {
    if (entered.length < pinLength) return;
    if (entered === pin) {
      onSuccess();
    } else {
      setShake(true);
      const timer = setTimeout(() => {
        setEntered("");
        setShake(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [entered, onSuccess, pin, pinLength]);

  const press = (digit: string) => {
    if (entered.length >= pinLength) return;
    setEntered((prev) => prev + digit);
  };

  const digitButtonClass =
    "rounded-xl bg-pink-50 py-3 text-lg font-semibold text-slate-700 active:bg-pink-100";
  const actionButtonClass = "rounded-xl py-3 text-sm font-medium text-slate-400 active:bg-slate-100";

  const card = (
    <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl">
      <p className="mb-4 font-semibold text-brand-900">{title}</p>

      <div className={`mb-6 flex justify-center gap-3 ${shake ? "animate-pulse" : ""}`}>
        {Array.from({ length: pinLength }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 ${
              i < entered.length
                ? shake
                  ? "border-red-500 bg-red-500"
                  : "border-brand-600 bg-brand-600"
                : "border-slate-300"
            }`}
          />
        ))}
      </div>

      {/* Digit pad: always left-to-right (1,2,3 / 4,5,6 / 7,8,9), independent of page direction. */}
      <div dir="ltr" className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button key={digit} type="button" onClick={() => press(digit)} className={digitButtonClass}>
            {digit}
          </button>
        ))}
      </div>

      {/* Action row: cancel / 0 / backspace, following the page's natural RTL order. */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <button type="button" onClick={onCancel} className={actionButtonClass}>
          {cancelLabel}
        </button>
        <button type="button" onClick={() => press("0")} className={digitButtonClass}>
          0
        </button>
        <button
          type="button"
          onClick={() => setEntered((prev) => prev.slice(0, -1))}
          className={actionButtonClass}
        >
          ⌫
        </button>
      </div>
    </div>
  );

  if (variant === "screen") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pink-50 px-6">
        <div className="w-full max-w-xs">
          <div className="mb-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Friezura" className="h-16 w-auto" />
          </div>
          {card}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-6">
      {card}
    </div>
  );
}
