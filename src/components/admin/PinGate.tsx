"use client";

import { useEffect, useState } from "react";

const EXIT_PIN = process.env.NEXT_PUBLIC_ADMIN_EXIT_PIN || "1234";
const PIN_LENGTH = EXIT_PIN.length;

interface PinGateProps {
  title?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Modal PIN pad gating "Manual Entry" mode -> back to the staff dashboard,
 * so a customer holding the device to sign can't casually browse other
 * customers' data in the Live Queue / Search tabs.
 */
export function PinGate({ title = "הזינו קוד צוות כדי להמשיך", onSuccess, onCancel }: PinGateProps) {
  const [entered, setEntered] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (entered.length < PIN_LENGTH) return;
    if (entered === EXIT_PIN) {
      onSuccess();
    } else {
      setShake(true);
      const timer = setTimeout(() => {
        setEntered("");
        setShake(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [entered, onSuccess]);

  const press = (digit: string) => {
    if (entered.length >= PIN_LENGTH) return;
    setEntered((prev) => prev + digit);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-6">
      <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl">
        <p className="mb-4 font-semibold text-brand-900">{title}</p>

        <div className={`mb-6 flex justify-center gap-3 ${shake ? "animate-pulse" : ""}`}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
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

        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => press(digit)}
              className="rounded-xl bg-slate-100 py-3 text-lg font-semibold text-slate-700 active:bg-slate-200"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl py-3 text-sm font-medium text-slate-400 active:bg-slate-100"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={() => press("0")}
            className="rounded-xl bg-slate-100 py-3 text-lg font-semibold text-slate-700 active:bg-slate-200"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => setEntered((prev) => prev.slice(0, -1))}
            className="rounded-xl py-3 text-sm font-medium text-slate-400 active:bg-slate-100"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
