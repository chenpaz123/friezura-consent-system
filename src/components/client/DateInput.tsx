"use client";

import { useEffect, useState } from "react";
import { displayToIso, isoToDisplay } from "@/lib/date";

interface DateInputProps {
  id?: string;
  /** Controlled value as an ISO "YYYY-MM-DD" string. */
  value: string;
  /** Fires only once the typed text parses into a valid calendar date. */
  onChange: (iso: string) => void;
  className?: string;
}

/**
 * A DD/MM/YYYY-only date field. Native <input type="date"> renders in
 * whatever format the browser/OS locale dictates (often US MM/DD/YYYY),
 * which doesn't respect the page's Hebrew/RTL locale — so instead this is a
 * masked text input that only ever accepts and displays the Israeli
 * DD/MM/YYYY format, auto-inserting the "/" separators as digits are typed.
 */
export function DateInput({ id, value, onChange, className }: DateInputProps) {
  const [text, setText] = useState(() => isoToDisplay(value));

  // Keep the displayed text in sync if the parent changes `value` externally.
  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8); // DDMMYYYY
    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    setText(formatted);

    if (digits.length === 8) {
      const iso = displayToIso(formatted);
      if (iso) onChange(iso);
    }
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      dir="ltr"
      placeholder="DD/MM/YYYY"
      maxLength={10}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      className={`text-left ${className ?? ""}`}
    />
  );
}
