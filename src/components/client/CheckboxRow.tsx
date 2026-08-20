"use client";

interface CheckboxRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
}

export function CheckboxRow({ label, checked, onChange, required }: CheckboxRowProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 flex-shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="text-sm font-medium text-slate-800">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
    </label>
  );
}
