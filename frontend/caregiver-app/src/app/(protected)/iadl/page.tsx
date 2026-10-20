"use client";

/* Katz ADL, Lawton IADL, and secondary modifiers checklist. */

import { FormEvent, useState } from "react";

type BinaryValue = 0 | 1 | null;
type MemoryStatus = "GOOD" | "FAIR" | "POOR" | "UNKNOWN";
type AgeCategory = "UNDER_65" | "65_74" | "75_84" | "85_PLUS" | "UNKNOWN";

type BinaryField =
  | "bathing"
  | "transferring"
  | "mobility"
  | "meal_preparation"
  | "laundry"
  | "medication_management"
  | "telephone_use"
  | "community_mobility";

type BooleanModifierField =
  | "fell_last_12_months"
  | "fell_last_month"
  | "multiple_falls"
  | "fear_of_falling"
  | "uses_vision_aids"
  | "uses_hearing_aids"
  | "pain_last_month"
  | "pain_limits_activities"
  | "diagnosis_stroke"
  | "diagnosis_dementia_alzheimers"
  | "increased_sleep_latency"
  | "difficulty_returning_to_sleep"
  | "uses_sleep_meds"
  | "has_diabetes";

export interface IadlAssessmentPayload {
  patient: string;
  bathing: BinaryValue;
  transferring: BinaryValue;
  mobility: BinaryValue;
  meal_preparation: BinaryValue;
  laundry: BinaryValue;
  medication_management: BinaryValue;
  telephone_use: BinaryValue;
  community_mobility: BinaryValue;
  fell_last_12_months: boolean;
  fell_last_month: boolean;
  multiple_falls: boolean;
  fear_of_falling: boolean;
  uses_vision_aids: boolean;
  uses_hearing_aids: boolean;
  pain_last_month: boolean;
  pain_limits_activities: boolean;
  diagnosis_stroke: boolean;
  diagnosis_dementia_alzheimers: boolean;
  memory_status: MemoryStatus;
  increased_sleep_latency: boolean;
  difficulty_returning_to_sleep: boolean;
  uses_sleep_meds: boolean;
  age_category: AgeCategory;
  has_diabetes: boolean;
}

interface IadlAssessmentResponse {
  total_adl_score: number;
  total_iadl_score: number;
  adl_dependency_level: string;
  iadl_dependency_level: string;
}

interface BinaryRowProps {
  field: BinaryField;
  label: string;
  value: BinaryValue;
  hint: string;
  onChange: (field: BinaryField, value: 0 | 1) => void;
}

interface ModifierCheckboxGroupProps {
  title: string;
  items: Array<{ field: BooleanModifierField; label: string }>;
  values: IadlAssessmentPayload;
  onChange: (field: BooleanModifierField, value: boolean) => void;
}

interface ScoreSummaryProps {
  adlScore: number;
  iadlScore: number;
  adlLevel: string;
  iadlLevel: string;
  fallRisk: boolean;
  activePain: boolean;
}

const INITIAL_VALUES: IadlAssessmentPayload = {
  patient: "",
  bathing: null,
  transferring: null,
  mobility: null,
  meal_preparation: null,
  laundry: null,
  medication_management: null,
  telephone_use: null,
  community_mobility: null,
  fell_last_12_months: false,
  fell_last_month: false,
  multiple_falls: false,
  fear_of_falling: false,
  uses_vision_aids: false,
  uses_hearing_aids: false,
  pain_last_month: false,
  pain_limits_activities: false,
  diagnosis_stroke: false,
  diagnosis_dementia_alzheimers: false,
  memory_status: "UNKNOWN",
  increased_sleep_latency: false,
  difficulty_returning_to_sleep: false,
  uses_sleep_meds: false,
  age_category: "UNKNOWN",
  has_diabetes: false,
};

const ADL_FIELDS: BinaryField[] = ["bathing", "transferring", "mobility"];
const IADL_FIELDS: BinaryField[] = [
  "meal_preparation",
  "laundry",
  "medication_management",
  "telephone_use",
  "community_mobility",
];

function dependencyLevel(score: number, maximum: number): string {
  if (maximum === 3) {
    if (score <= 1) return "Low";
    if (score === 2) return "Moderate";
    return "High";
  }

  if (score <= 1) return "Low";
  if (score <= 3) return "Moderate";
  return "High";
}

function BinaryRow({ field, label, value, hint, onChange }: BinaryRowProps) {
  const independentId = `${field}-independent`;
  const dependentId = `${field}-dependent`;

  return (
    <fieldset className="grid gap-3 border-b border-slate-200 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div>
        <legend className="font-medium text-slate-900">{label}</legend>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </div>
      <div className="flex flex-wrap gap-4" role="radiogroup" aria-label={label}>
        <label
          htmlFor={independentId}
          className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"
        >
          <input
            id={independentId}
            name={field}
            type="radio"
            value="1"
            checked={value === 1}
            onChange={() => onChange(field, 1)}
            className="size-4 accent-teal-700"
          />
          1 = Independent
        </label>
        <label
          htmlFor={dependentId}
          className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"
        >
          <input
            id={dependentId}
            name={field}
            type="radio"
            value="0"
            checked={value === 0}
            onChange={() => onChange(field, 0)}
            className="size-4 accent-teal-700"
          />
          0 = Dependent
        </label>
      </div>
    </fieldset>
  );
}

function ModifierCheckboxGroup({
  title,
  items,
  values,
  onChange,
}: ModifierCheckboxGroupProps) {
  return (
    <fieldset className="rounded-md border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">
        {title}
      </legend>
      <div className="mt-2 grid gap-3">
        {items.map(({ field, label }) => (
          <label
            key={field}
            className="inline-flex cursor-pointer items-start gap-2 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              checked={Boolean(values[field])}
              onChange={(event) => onChange(field, event.target.checked)}
              className="mt-0.5 size-4 accent-teal-700"
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ScoreSummary({
  adlScore,
  iadlScore,
  adlLevel,
  iadlLevel,
  fallRisk,
  activePain,
}: ScoreSummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Total ADL
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-900">
          {adlScore} / 3
          <span className="ml-2 rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800">
            {adlLevel}
          </span>
        </p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Total IADL
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-900">
          {iadlScore} / 5
          <span className="ml-2 rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800">
            {iadlLevel}
          </span>
        </p>
      </div>
      <p className="text-sm text-slate-700">
        Fall risk:{" "}
        <strong className={fallRisk ? "text-rose-700" : "text-slate-900"}>
          {fallRisk ? "Flagged" : "None"}
        </strong>
      </p>
      <p className="text-sm text-slate-700">
        Pain:{" "}
        <strong className={activePain ? "text-rose-700" : "text-slate-900"}>
          {activePain ? "Flagged" : "None"}
        </strong>
      </p>
    </div>
  );
}

function isAssessmentResponse(value: unknown): value is IadlAssessmentResponse {
  if (typeof value !== "object" || value === null) return false;

  const response = value as Record<string, unknown>;
  return (
    typeof response.total_adl_score === "number" &&
    typeof response.total_iadl_score === "number" &&
    typeof response.adl_dependency_level === "string" &&
    typeof response.iadl_dependency_level === "string"
  );
}

export default function IadlPage() {
  const [values, setValues] =
    useState<IadlAssessmentPayload>(INITIAL_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState<IadlAssessmentResponse | null>(null);

  const adlScore = ADL_FIELDS.reduce(
    (total, field) => total + (values[field] === 1 ? 1 : 0),
    0,
  );
  const iadlScore = IADL_FIELDS.reduce(
    (total, field) => total + (values[field] === 1 ? 1 : 0),
    0,
  );
  const fallRisk =
    values.fell_last_12_months ||
    values.fell_last_month ||
    values.multiple_falls ||
    values.fear_of_falling;
  const activePain = values.pain_last_month || values.pain_limits_activities;

  function updateBinary(field: BinaryField, value: 0 | 1) {
    setValues((current) => ({ ...current, [field]: value }));
    setSuccess(null);
  }

  function updateModifier(field: BooleanModifierField, value: boolean) {
    setValues((current) => ({ ...current, [field]: value }));
    setSuccess(null);
  }

  function isComplete(): boolean {
    return [...ADL_FIELDS, ...IADL_FIELDS].every(
      (field) => values[field] !== null,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccess(null);

    if (!isComplete()) {
      setErrorMessage("Answer every ADL and IADL item before submitting.");
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const patientId = query.get("patient") ?? query.get("patient_id");
    if (!patientId) {
      setErrorMessage(
        "Patient context is missing. Open this assessment from a patient record.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: IadlAssessmentPayload = { ...values, patient: patientId };
      const response = await fetch("/api/assessments/iadl/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body: unknown = await response.json();
      if (!response.ok) {
        const detail =
          typeof body === "object" &&
          body !== null &&
          "detail" in body &&
          typeof body.detail === "string"
            ? body.detail
            : "Unable to save the assessment.";
        throw new Error(detail);
      }
      if (!isAssessmentResponse(body)) {
        throw new Error("The server returned an unexpected assessment result.");
      }
      setSuccess(body);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save the assessment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-40 text-slate-900 sm:px-6">
      <header className="mb-8 border-b border-slate-200 pb-5">
        <p className="text-sm font-medium text-teal-800">
          Functional Assessment
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Katz ADL / Lawton IADL</h1>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="mb-5 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {errorMessage}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          Assessment saved. ADL: {success.total_adl_score} / 3 (
          {success.adl_dependency_level}); IADL: {success.total_iadl_score} / 5
          ({success.iadl_dependency_level}).
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section aria-labelledby="adl-heading">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h2 id="adl-heading" className="text-lg font-semibold">
                Section 1: Katz ADL Checklist
              </h2>
              <p className="text-sm text-slate-600">Basic Self-Care</p>
            </div>
            <p className="text-sm font-semibold">
              Total ADL Score: {adlScore} / 3
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-4">
            <BinaryRow
              field="bathing"
              label="Bathing"
              value={values.bathing}
              hint="Maps to: bathhlp, bathoft, bathwout, dbathhelp, dbathsfdf"
              onChange={updateBinary}
            />
            <BinaryRow
              field="transferring"
              label="Transferring"
              value={values.transferring}
              hint="Maps to: beddif, bedwout, dbeddevi, dbedhelp, dbedsfdf"
              onChange={updateBinary}
            />
            <BinaryRow
              field="mobility"
              label="Mobility / Gait"
              value={values.mobility}
              hint="Maps to: Mobility Aid, Walker Use"
              onChange={updateBinary}
            />
          </div>
        </section>

        <section aria-labelledby="iadl-heading">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h2 id="iadl-heading" className="text-lg font-semibold">
                Section 2: Lawton IADL Checklist
              </h2>
              <p className="text-sm text-slate-600">
                Complex / Community Living
              </p>
            </div>
            <p className="text-sm font-semibold">
              Total IADL Score: {iadlScore} / 5
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-4">
            <BinaryRow
              field="meal_preparation"
              label="Meal Preparation"
              value={values.meal_preparation}
              hint="Maps to: mealdif, mealskip2, mealslf, mealwout"
              onChange={updateBinary}
            />
            <BinaryRow
              field="laundry"
              label="Laundry"
              value={values.laundry}
              hint="Maps to: Laundry"
              onChange={updateBinary}
            />
            <BinaryRow
              field="medication_management"
              label="Medication Management"
              value={values.medication_management}
              hint="Maps to: Medication Management Difficulty, Sleep Medication"
              onChange={updateBinary}
            />
            <BinaryRow
              field="telephone_use"
              label="Telephone Use & Communication"
              value={values.telephone_use}
              hint="Maps to: Telephone Use, Telephone Hearing"
              onChange={updateBinary}
            />
            <BinaryRow
              field="community_mobility"
              label="Community Mobility / Distance Walk"
              value={values.community_mobility}
              hint="Maps to: Walk 6 blocks"
              onChange={updateBinary}
            />
          </div>
        </section>

        <section aria-labelledby="modifiers-heading">
          <h2 id="modifiers-heading" className="mb-4 text-lg font-semibold">
            Section 3: Secondary Functional Risk & Clinical Modifiers
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <ModifierCheckboxGroup
              title="A. Fall Risk Profile"
              values={values}
              onChange={updateModifier}
              items={[
                { field: "fell_last_12_months", label: "Fell in last 12 months" },
                { field: "fell_last_month", label: "Fell in last month" },
                { field: "multiple_falls", label: "Multiple falls" },
                { field: "fear_of_falling", label: "Fear of falling" },
              ]}
            />

            <ModifierCheckboxGroup
              title="B. Sensory & Pain Status"
              values={values}
              onChange={updateModifier}
              items={[
                { field: "uses_vision_aids", label: "Uses vision aids" },
                { field: "uses_hearing_aids", label: "Uses hearing aids" },
                { field: "pain_last_month", label: "Pain in last month" },
                {
                  field: "pain_limits_activities",
                  label: "Pain limits activities",
                },
              ]}
            />

            <div className="space-y-4">
              <ModifierCheckboxGroup
                title="C. Cognitive & Neurological Factors"
                values={values}
                onChange={updateModifier}
                items={[
                  { field: "diagnosis_stroke", label: "Diagnosis of stroke" },
                  {
                    field: "diagnosis_dementia_alzheimers",
                    label: "Diagnosis of dementia / Alzheimer’s",
                  },
                ]}
              />
              <label className="block text-sm font-medium text-slate-700">
                Memory status
                <select
                  value={values.memory_status}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      memory_status: event.target.value as MemoryStatus,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  <option value="UNKNOWN">Unknown</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                </select>
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Maps to: memrygood, self-rated memory, memory improvement
                </span>
              </label>
            </div>

            <div className="space-y-4">
              <ModifierCheckboxGroup
                title="D. Sleep & General Health"
                values={values}
                onChange={updateModifier}
                items={[
                  {
                    field: "increased_sleep_latency",
                    label: "Increased sleep latency",
                  },
                  {
                    field: "difficulty_returning_to_sleep",
                    label: "Difficulty returning to sleep",
                  },
                  { field: "uses_sleep_meds", label: "Uses sleep medication" },
                  { field: "has_diabetes", label: "Has diabetes" },
                ]}
              />
              <label className="block text-sm font-medium text-slate-700">
                Age category
                <select
                  value={values.age_category}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      age_category: event.target.value as AgeCategory,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  <option value="UNKNOWN">Unknown</option>
                  <option value="UNDER_65">Under 65</option>
                  <option value="65_74">65-74</option>
                  <option value="75_84">75-84</option>
                  <option value="85_PLUS">85+</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <ScoreSummary
              adlScore={adlScore}
              iadlScore={iadlScore}
              adlLevel={dependencyLevel(adlScore, 3)}
              iadlLevel={dependencyLevel(iadlScore, 5)}
              fallRisk={fallRisk}
              activePain={activePain}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="shrink-0 rounded-md bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save assessment"}
            </button>
          </div>
        </footer>
      </form>
    </main>
  );
}