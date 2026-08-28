import { CheckboxRow } from "@/components/client/CheckboxRow";

export interface QuestionnaireSectionProps {
  form: {
    isHealthy: boolean;
    hasMedicalIssue: boolean;
    medicalDetails: string;
    hasBehavioralIssue: boolean;
    behavioralDetails: string;
    infoShared: boolean;
    expectationsSet: boolean;
    ageAndOwnershipConfirmed: boolean;
  };
  update: (key: any, value: any) => void;
  setHealthy: (checked: boolean) => void;
  setHasMedicalIssue: (checked: boolean) => void;
  setHasBehavioralIssue: (checked: boolean) => void;
  inputClass: string;
}

export function QuestionnaireSection({
  form,
  update,
  setHealthy,
  setHasMedicalIssue,
  setHasBehavioralIssue,
  inputClass,
}: QuestionnaireSectionProps) {
  return (
    <section className="space-y-3 border-t border-slate-200 pt-6">
      <h2 className="text-lg font-bold text-brand-900">שאלון בריאותי והתנהגותי</h2>

      <CheckboxRow label="הכלב בריא ואינו מקבל תרופות." checked={form.isHealthy} onChange={setHealthy} />

      <CheckboxRow
        label="קיימת מחלה / בעיה רפואית / תרופות / אלרגיה / רגישות."
        checked={form.hasMedicalIssue}
        onChange={setHasMedicalIssue}
      />
      {form.hasMedicalIssue && (
        <textarea
          autoFocus
          placeholder="פירוט:"
          value={form.medicalDetails}
          onChange={(e) => update("medicalDetails", e.target.value)}
          rows={3}
          className={inputClass}
        />
      )}

      <CheckboxRow
        label="הכלב רגיש או אינו רגיל לפעולה מסוימת במהלך הטיפול."
        checked={form.hasBehavioralIssue}
        onChange={setHasBehavioralIssue}
      />
      {form.hasBehavioralIssue && (
        <textarea
          autoFocus
          placeholder="פירוט:"
          value={form.behavioralDetails}
          onChange={(e) => update("behavioralDetails", e.target.value)}
          rows={3}
          className={inputClass}
        />
      )}

      <div className="space-y-3 pt-2">
        <CheckboxRow
          label="עדכנתי את הספר/ית בכל מידע רפואי או התנהגותי רלוונטי."
          checked={form.infoShared}
          onChange={(v) => update("infoShared", v)}
          required
        />
        <CheckboxRow
          label="בוצע תיאום ציפיות לגבי התספורת והתוצאה הרצויה, והבנתי כי מצב הפרווה ושיתוף הפעולה של הכלב עשויים להשפיע על התוצאה."
          checked={form.expectationsSet}
          onChange={(v) => update("expectationsSet", v)}
          required
        />
        <CheckboxRow
          label="אני מצהיר/ה כי אני מעל גיל 18, וכי אני הבעלים החוקי של הכלב או מורשה מטעמו."
          checked={form.ageAndOwnershipConfirmed}
          onChange={(v) => update("ageAndOwnershipConfirmed", v)}
          required
        />
      </div>
    </section>
  );
}
