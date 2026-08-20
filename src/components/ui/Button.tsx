"use client";

import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-brand-600 text-white active:bg-brand-700 disabled:bg-slate-300",
  secondary: "bg-white text-brand-700 border border-brand-300 active:bg-brand-50",
  danger: "bg-red-600 text-white active:bg-red-700",
};

export function Button({ variant = "primary", className = "", disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`w-full rounded-xl px-4 py-3 text-base font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
