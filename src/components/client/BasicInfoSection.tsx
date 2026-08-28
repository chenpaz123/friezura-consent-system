import { Dog } from "@/lib/types";
import { DateInput } from "@/components/client/DateInput";

export interface BasicInfoSectionProps {
  form: {
    phone: string;
    fullName: string;
    dogName: string;
    date: string;
  };
  update: (key: any, value: any) => void;
  setNameWasAutofilled: (val: boolean) => void;
  existingDogs: Dog[];
  selectedDogId: string | "new" | null;
  setSelectedDogId: (id: string | "new" | null) => void;
  inputClass: string;
}

export function BasicInfoSection({
  form,
  update,
  setNameWasAutofilled,
  existingDogs,
  selectedDogId,
  setSelectedDogId,
  inputClass,
}: BasicInfoSectionProps) {
  return (
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
          onChange={(e) => {
            setNameWasAutofilled(false);
            update("fullName", e.target.value);
          }}
          className={inputClass}
        />
      </div>

      {existingDogs.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">בחר/י כלב</p>
          <div className="flex flex-wrap gap-2">
            {existingDogs.map((dog) => (
              <button
                key={dog.id}
                type="button"
                onClick={() => setSelectedDogId(dog.id)}
                className={`rounded-xl border-2 px-4 py-2 font-semibold transition-colors ${
                  selectedDogId === dog.id
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600 active:bg-slate-50"
                }`}
              >
                {dog.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedDogId("new")}
              className={`rounded-xl border-2 px-4 py-2 font-semibold transition-colors ${
                selectedDogId === "new"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 active:bg-slate-50"
              }`}
            >
              + כלב חדש
            </button>
          </div>
          {selectedDogId === "new" && (
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
  );
}
