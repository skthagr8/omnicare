'use client';

import 'leaflet/dist/leaflet.css';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { differenceInYears, format } from 'date-fns';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Info,
  LocateFixed,
  LockKeyhole,
  MapPin,
  Phone,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { apiClient } from '../../services/api';

// --- Config ---
export const TOTAL_STEPS = 5;
const DRAFT_KEY = 'omnicare.intake.draft.v1';
const DEFAULT_MAP_CENTER = [-1.286389, 36.817223];

export const STEPS = [
  { n: 1, title: 'Patient Demographics', short: 'Demographics' },
  { n: 2, title: 'Clinical Diagnosis & History', short: 'Diagnosis' },
  { n: 3, title: 'Clinical Acuity Assessment', short: 'Acuity' },
  { n: 4, title: 'Emergency & Support Contacts', short: 'Contacts' },
  { n: 5, title: 'Intake Summary Review', short: 'Review' },
];

const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
const RESIDENCES = ['Private home', "Family member's home", 'Assisted living', 'Nursing home', 'Other'];
const RELATIONSHIPS = ['Spouse', 'Partner', 'Son', 'Daughter', 'Parent', 'Sibling', 'Grandchild', 'Friend', 'Legal guardian', 'Healthcare proxy', 'Other'];

const DIAGNOSIS_LABELS = { dementia: 'Dementia', post_stroke: 'Post-Stroke', parkinsons: "Parkinson's", other: 'Other' };

// Keys match the backend AcuityLevel enum.
export const ACUITY_LEVELS = [
  {
    id: 'red', title: 'High Acuity (Urgent)', short: 'High',
    description: 'Immediate intervention or continuous monitoring required.',
    dot: 'bg-rose-400', icon: 'bg-rose-100 text-rose-500', selected: 'border-rose-300 bg-rose-50/65 shadow-[0_8px_20px_-12px_rgba(190,70,88,0.35)]', title_: 'text-rose-700',
    indications: ['Unstable vital signs', 'Acute respiratory distress', 'Severe neurological deficit', 'Post-operative complications'],
    estimate: { ratio: '1 : 2', frequency: 'Q2 Hours', escalation: 'Immediate Review' },
  },
  {
    id: 'amber', title: 'Medium Acuity (Stable)', short: 'Medium',
    description: 'Regular monitoring and standard clinical care required.',
    dot: 'bg-amber-400', icon: 'bg-amber-100 text-amber-600', selected: 'border-amber-300 bg-amber-50/60 shadow-[0_8px_20px_-12px_rgba(192,138,46,0.35)]', title_: 'text-amber-700',
    indications: ['Stable but complex chronic conditions', 'Moderate pain management', 'Assistance with basic mobility', 'Standard post-acute recovery'],
    estimate: { ratio: '1 : 4', frequency: 'Q4 Hours', escalation: 'Standard' },
  },
  {
    id: 'green', title: 'Low Acuity (Routine)', short: 'Low',
    description: 'Routine care or health maintenance observations.',
    dot: 'bg-teal-400', icon: 'bg-teal-100 text-teal-600', selected: 'border-teal-300 bg-teal-50/60 shadow-[0_8px_20px_-12px_rgba(52,130,96,0.3)]', title_: 'text-teal-700',
    indications: ['Preventative health screening', 'Simple wound dressing change', 'Education and self-care training', 'Stable baseline assessment'],
    estimate: { ratio: '1 : 6', frequency: 'Q8 Hours', escalation: 'On Change' },
  },
];

const acuityById = (id) => ACUITY_LEVELS.find((a) => a.id === id);
const newId = () => Math.random().toString(36).slice(2, 10);

export const EMPTY_DRAFT = {
  orgId: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  street: '',
  city: '',
  postalCode: '',
  residence: '',
  location: null, // { latitude, longitude }
  diagnoses: [{ key: 'd1', definitionId: '', notes: '', stage: '', affectedSide: '' }],
  observations: '',
  acuity: '',
  acuityReason: '',
  contacts: [],
  attestation: false,
  startedAt: null,
  savedAt: null,
};

export const fullName = (d) => [d.firstName, d.lastName].map((s) => s.trim()).filter(Boolean).join(' ');
export const addressText = (d) => [d.street.trim(), [d.city.trim(), d.postalCode.trim()].filter(Boolean).join(' ')].filter(Boolean).join(', ');

function errorMessage(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && !Array.isArray(detail) && detail.message) return detail.message;
  if (Array.isArray(detail)) {
    const messages = detail.map((d) => {
      const field = Array.isArray(d?.loc) ? d.loc.slice(1).join('.') : '';
      const msg = d?.msg?.replace(/^Value error, /, '');
      return msg ? (field ? `${field}: ${msg}` : msg) : null;
    }).filter(Boolean);
    if (messages.length) return messages.join(' · ');
  }
  return err?.response ? fallback : 'Unable to reach the server. Check your connection and try again.';
}

// --- Validation ---
/** Returns { field: message } for one step; empty object = valid. */
export function validateStep(n, d) {
  const e = {};
  if (n === 1) {
    if (!d.orgId) e.orgId = 'Select the organisation responsible for this patient.';
    if (!d.firstName.trim()) e.firstName = 'First name is required.';
    if (!d.lastName.trim()) e.lastName = 'Last name is required.';
    if (fullName(d).length > 150) e.lastName = 'Full name must be 150 characters or fewer.';
    if (!d.dateOfBirth) e.dateOfBirth = 'Date of birth is required.';
    else {
      const dob = new Date(`${d.dateOfBirth}T00:00:00`);
      if (Number.isNaN(dob.getTime())) e.dateOfBirth = 'Enter a valid date.';
      else if (dob > new Date()) e.dateOfBirth = 'Date of birth cannot be in the future.';
      else if (differenceInYears(new Date(), dob) > 120) e.dateOfBirth = 'Date of birth is more than 120 years ago.';
    }
    if (!d.gender) e.gender = 'Select a gender.';
    if (!d.street.trim()) e.street = 'Street address is required.';
    if (!d.city.trim()) e.city = 'City is required.';
    if (addressText(d).length > 300) e.street = 'Address must be 300 characters or fewer.';
    if (!d.residence) e.residence = 'Select the type of residence.';
    if (!d.location) e.location = 'Confirm the location on the map (Locate address, or click the map).';
  }
  if (n === 2) {
    if (!d.diagnoses.some((x) => x.definitionId)) e.diagnoses = 'Select the primary diagnosis.';
    const ids = d.diagnoses.map((x) => x.definitionId).filter(Boolean);
    if (new Set(ids).size !== ids.length) e.diagnoses = 'The same diagnosis is listed twice.';
  }
  if (n === 3 && !d.acuity) e.acuity = 'Select the initial acuity level.';
  if (n === 4) {
    if (d.contacts.length === 0) e.contacts = 'Add at least one emergency contact.';
    else if (d.contacts.filter((c) => c.is_primary).length !== 1) e.contacts = 'Mark exactly one contact as primary.';
  }
  if (n === 5 && !d.attestation) e.attestation = 'Confirm the attestation to submit.';
  return e;
}

/** First step (1..5) that is not yet valid, or 6 when everything is complete. */
export function firstIncompleteStep(d) {
  for (let n = 1; n <= TOTAL_STEPS - 1; n += 1) {
    if (Object.keys(validateStep(n, d)).length) return n;
  }
  return TOTAL_STEPS;
}

// --- Draft state (shared by all steps) ---
const IntakeContext = createContext(null);

function readDraft() {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY_DRAFT, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

function writeDraft(draft) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

function clearDraftStorage() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Holds the in-progress intake, autosaves it to this browser, and loads form options. */
export function IntakeProvider({ children }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [options, setOptions] = useState({ organizations: [], definitions: [], loading: true, error: '' });

  useEffect(() => {
    const saved = readDraft();
    setDraft(saved ?? { ...EMPTY_DRAFT, startedAt: new Date().toISOString() });
    setHydrated(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    apiClient.get('/clients/intake/options', { signal: controller.signal })
      .then(({ data }) => {
        setOptions({ organizations: data.organizations, definitions: data.diagnosis_definitions, loading: false, error: '' });
        setDraft((d) => (d.orgId || !data.default_org_id ? d : { ...d, orgId: data.default_org_id }));
      })
      .catch((err) => !controller.signal.aborted && setOptions((o) => ({ ...o, loading: false, error: errorMessage(err, 'Unable to load intake options.') })));
    return () => controller.abort();
  }, []);

  // Autosave every change.
  useEffect(() => {
    if (hydrated) writeDraft(draft);
  }, [draft, hydrated]);

  const update = useCallback((patch) => setDraft((d) => ({ ...d, ...(typeof patch === 'function' ? patch(d) : patch) })), []);
  const saveDraft = useCallback(() => {
    const savedAt = new Date().toISOString();
    setDraft((d) => {
      const next = { ...d, savedAt };
      writeDraft(next);
      return next;
    });
  }, []);
  // The client created by the last successful submit (drives the success screen).
  const [submitted, setSubmitted] = useState(null);

  const reset = useCallback(() => {
    clearDraftStorage();
    setDraft((d) => ({ ...EMPTY_DRAFT, orgId: d.orgId, startedAt: new Date().toISOString() }));
  }, []);
  const complete = useCallback((client) => {
    setSubmitted(client);
    reset();
  }, [reset]);
  const clearSubmitted = useCallback(() => setSubmitted(null), []);

  const value = useMemo(
    () => ({ draft, update, saveDraft, reset, hydrated, options, submitted, complete, clearSubmitted }),
    [draft, update, saveDraft, reset, hydrated, options, submitted, complete, clearSubmitted],
  );
  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>;
}

export const useIntake = () => useContext(IntakeContext);

// --- Shared UI ---
const label = 'text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const input = 'mt-2 w-full rounded-lg border border-coral-soft bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15';
const card = 'rounded-xl border border-coral-soft bg-white p-5 shadow-[0_3px_14px_-8px_rgba(15,23,42,0.16)]';

function FieldError({ children }) {
  return children ? <p className="mt-1 text-xs font-medium text-rose-600">{children}</p> : null;
}

function Field({ title, error, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className={label}>{title}</span>
      {children}
      <FieldError>{error}</FieldError>
    </label>
  );
}

export function IntakeProgress({ step }) {
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        <span className="text-teal">Step {step} of {TOTAL_STEPS}: {STEPS[step - 1].short}</span>
        <span>{pct}% complete</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream-deep" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StepHeading({ eyebrow = 'Patient Intake Flow', title, description }) {
  return (
    <div className="mb-6">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal"><Stethoscope className="h-3.5 w-3.5" />{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">{title}</h1>
      {description && <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>}
    </div>
  );
}

function IntakeFooter({ step, onNext, nextLabel, nextDisabled = false }) {
  const router = useRouter();
  const { saveDraft, draft } = useIntake();
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-coral-soft pt-5">
      <button
        type="button"
        onClick={() => router.push(`/intake/step-${step - 1}`)}
        disabled={step === 1}
        className="flex items-center gap-1.5 rounded-lg border border-coral-soft bg-white px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowLeft className="h-3.5 w-3.5" />{step > 1 ? `Back: ${STEPS[step - 2].short}` : 'Previous Step'}
      </button>
      <div className="flex items-center gap-5">
        <div className="text-right">
          <button type="button" onClick={saveDraft} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"><Save className="h-3.5 w-3.5" />Save Draft</button>
          {draft.savedAt && <p className="mt-0.5 text-[10px] text-teal-600">Draft saved {format(new Date(draft.savedAt), 'HH:mm')}</p>}
        </div>
        {onNext && (
          <button type="button" onClick={onNext} disabled={nextDisabled} className="flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1b8a7f] disabled:cursor-not-allowed disabled:bg-slate-300">
            {nextLabel}<ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Validates the current step, then moves to the next one. */
function useStepNavigation(step) {
  const router = useRouter();
  const { draft } = useIntake();
  const [errors, setErrors] = useState({});
  const next = () => {
    const e = validateStep(step, draft);
    setErrors(e);
    if (Object.keys(e).length === 0) router.push(`/intake/step-${step + 1}`);
  };
  // Clear a field's error once it becomes valid.
  useEffect(() => {
    setErrors((current) => {
      if (!Object.keys(current).length) return current;
      const fresh = validateStep(step, draft);
      return Object.fromEntries(Object.keys(current).filter((k) => fresh[k]).map((k) => [k, fresh[k]]));
    });
  }, [draft, step]);
  return { errors, next };
}

// --- Step 1: Demographics ---
/** Leaflet map: click to place the pin, or locate the typed address via OpenStreetMap (Nominatim). */
function LocationPicker({ location, onChange, query }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const leafletRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [geo, setGeo] = useState({ busy: false, message: '' });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    let map;
    import('leaflet').then(({ default: L }) => {
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;
      map = L.map(containerRef.current).setView(DEFAULT_MAP_CENTER, 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.on('click', (event) => onChangeRef.current({ latitude: Number(event.latlng.lat.toFixed(6)), longitude: Number(event.latlng.lng.toFixed(6)) }));
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Keep the pin in sync with the saved location.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    if (!location) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const latlng = [location.latitude, location.longitude];
    if (!markerRef.current) {
      markerRef.current = L.marker(latlng, {
        draggable: true,
        icon: L.divIcon({
          className: '',
          iconSize: [0, 0],
          html: '<div class="flex -translate-x-1/2 -translate-y-full flex-col items-center"><span class="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-white shadow-[0_3px_10px_rgba(34,166,153,0.4)]">●</span><span class="h-2 w-2 -translate-y-1 rounded-full bg-teal"></span></div>',
        }),
      }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng();
        onChangeRef.current({ latitude: Number(p.lat.toFixed(6)), longitude: Number(p.lng.toFixed(6)) });
      });
    } else {
      markerRef.current.setLatLng(latlng);
    }
    if (!map.getBounds().contains(latlng)) map.setView(latlng, Math.max(map.getZoom(), 15));
  }, [ready, location]);

  const locate = async () => {
    if (!query) {
      setGeo({ busy: false, message: 'Enter the street and city first.' });
      return;
    }
    setGeo({ busy: true, message: '' });
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      const [hit] = await res.json();
      if (!hit) {
        setGeo({ busy: false, message: 'Address not found. Click the map to place the pin manually.' });
        return;
      }
      const next = { latitude: Number(Number(hit.lat).toFixed(6)), longitude: Number(Number(hit.lon).toFixed(6)) };
      onChange(next);
      mapRef.current?.setView([next.latitude, next.longitude], 16);
      setGeo({ busy: false, message: `Found: ${hit.display_name}` });
    } catch {
      setGeo({ busy: false, message: 'Address lookup is unavailable. Click the map to place the pin manually.' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className={label}>Location Preview</p>
        <button type="button" onClick={locate} disabled={geo.busy} className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-teal hover:bg-teal-50 disabled:opacity-50">
          <LocateFixed className="h-3.5 w-3.5" />{geo.busy ? 'Locating…' : 'Locate address'}
        </button>
      </div>
      <div ref={containerRef} className="relative z-0 mt-2 h-52 overflow-hidden rounded-lg border border-coral-soft bg-coral-soft" aria-label="Map: click to set the patient's location" />
      <p className="mt-1.5 text-[11px] text-slate-400">
        {location ? `Pin at ${location.latitude}, ${location.longitude}. Drag the pin or click the map to adjust.` : 'Click the map to place the pin, or use Locate address.'}
      </p>
      {geo.message && <p className="mt-1 text-[11px] text-slate-500">{geo.message}</p>}
    </div>
  );
}

export function DemographicsStep() {
  const { draft, update, options, reset } = useIntake();
  const { errors, next } = useStepNavigation(1);
  const set = (field) => (event) => update({ [field]: event.target.value });

  return (
    <>
      <StepHeading title="Patient Demographics" description="Confirm the patient's primary identification and residential information." />
      {options.error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{options.error}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="text-sm font-semibold text-ink">Identity Details</h2>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Field title="Organisation" error={errors.orgId} className="col-span-2">
              <select value={draft.orgId} onChange={set('orgId')} className={input} disabled={options.loading}>
                <option value="">{options.loading ? 'Loading…' : 'Select organisation…'}</option>
                {options.organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
            <Field title="First Name" error={errors.firstName}><input value={draft.firstName} onChange={set('firstName')} autoComplete="off" className={input} /></Field>
            <Field title="Last Name" error={errors.lastName}><input value={draft.lastName} onChange={set('lastName')} autoComplete="off" className={input} /></Field>
            <Field title="Date of Birth" error={errors.dateOfBirth} className="col-span-2">
              <span className="relative block">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="date" value={draft.dateOfBirth} max={format(new Date(), 'yyyy-MM-dd')} onChange={set('dateOfBirth')} className={`${input} pl-10`} />
              </span>
            </Field>
            <Field title="Gender" error={errors.gender} className="col-span-2">
              <select value={draft.gender} onChange={set('gender')} className={input}>
                <option value="">Select…</option>
                {GENDERS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section className={card}>
          <h2 className="text-sm font-semibold text-ink">Primary Address</h2>
          <div className="mt-5 space-y-4">
            <Field title="Street Address" error={errors.street}>
              <span className="relative block">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={draft.street} onChange={set('street')} className={`${input} pl-10`} />
              </span>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field title="City" error={errors.city}><input value={draft.city} onChange={set('city')} className={input} /></Field>
              <Field title="Postal Code"><input value={draft.postalCode} onChange={set('postalCode')} className={input} /></Field>
            </div>
            <Field title="Residence Type" error={errors.residence}>
              <select value={draft.residence} onChange={set('residence')} className={input}>
                <option value="">Select…</option>
                {RESIDENCES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <LocationPicker location={draft.location} onChange={(location) => update({ location })} query={addressText(draft)} />
            <FieldError>{errors.location}</FieldError>
          </div>
        </section>
      </div>
      <div className="mt-4 text-right">
        <button type="button" onClick={() => window.confirm('Discard this intake draft and start over?') && reset()} className="text-[11px] font-semibold text-slate-400 hover:text-rose-600">Discard draft &amp; start over</button>
      </div>
      <IntakeFooter step={1} onNext={next} nextLabel="Next: Diagnosis" />
    </>
  );
}

// --- Step 2: Diagnosis ---
export function DiagnosisStep() {
  const { draft, update, options } = useIntake();
  const { errors, next } = useStepNavigation(2);
  const definitionsById = useMemo(() => new Map(options.definitions.map((d) => [d.id, d])), [options.definitions]);

  const setDiagnosis = (key, patch) => update((d) => ({ diagnoses: d.diagnoses.map((x) => (x.key === key ? { ...x, ...patch } : x)) }));
  const addDiagnosis = () => update((d) => ({ diagnoses: [...d.diagnoses, { key: newId(), definitionId: '', notes: '', stage: '', affectedSide: '' }] }));
  const removeDiagnosis = (key) => update((d) => ({ diagnoses: d.diagnoses.filter((x) => x.key !== key) }));

  return (
    <>
      <StepHeading title="Clinical Diagnosis & History" description="Document the primary clinical reason for admission and provide essential medical background." />
      <section className={card}>
        <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-50 text-teal"><FileText className="h-3.5 w-3.5" /></span><h2 className="text-sm font-semibold text-ink">Admission Diagnoses</h2></div>
        <div className="mt-5 space-y-4">
          {draft.diagnoses.map((item, index) => {
            const definition = definitionsById.get(item.definitionId);
            const taken = new Set(draft.diagnoses.filter((x) => x.key !== item.key).map((x) => x.definitionId));
            return (
              <div key={item.key} className="rounded-xl border border-coral-soft p-4">
                <div className="flex items-start gap-3">
                  <Field title={index === 0 ? 'Primary Diagnosis' : `Additional Diagnosis ${index}`} className="flex-1">
                    <select value={item.definitionId} onChange={(event) => setDiagnosis(item.key, { definitionId: event.target.value })} className={input} disabled={options.loading}>
                      <option value="">{options.loading ? 'Loading…' : 'Select a diagnosis…'}</option>
                      {Object.entries(DIAGNOSIS_LABELS).map(([category, groupLabel]) => {
                        const defs = options.definitions.filter((d) => d.category === category);
                        return defs.length ? (
                          <optgroup key={category} label={groupLabel}>
                            {defs.map((d) => <option key={d.id} value={d.id} disabled={taken.has(d.id)}>{d.name}</option>)}
                          </optgroup>
                        ) : null;
                      })}
                    </select>
                  </Field>
                  {index > 0 && (
                    <button type="button" onClick={() => removeDiagnosis(item.key)} aria-label="Remove diagnosis" className="mt-7 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
                {definition && (
                  <div className="mt-3 flex gap-3 rounded-lg bg-teal-soft p-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                    <div className="text-[11px] leading-relaxed text-slate-600">
                      <p className="font-semibold text-[#1b8a7f]">{DIAGNOSIS_LABELS[definition.category]} care protocol</p>
                      <p className="mt-0.5">{definition.description || 'Tasks, assessments and medications required by this diagnosis are added to each visit automatically.'}</p>
                    </div>
                  </div>
                )}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {definition?.category === 'dementia' && (
                    <Field title="Stage (optional)"><input value={item.stage} maxLength={50} onChange={(event) => setDiagnosis(item.key, { stage: event.target.value })} placeholder="e.g. Moderate" className={input} /></Field>
                  )}
                  {definition?.category === 'post_stroke' && (
                    <Field title="Affected Side (optional)">
                      <select value={item.affectedSide} onChange={(event) => setDiagnosis(item.key, { affectedSide: event.target.value })} className={input}>
                        <option value="">Not specified</option><option value="left">Left</option><option value="right">Right</option><option value="bilateral">Bilateral</option>
                      </select>
                    </Field>
                  )}
                  {definition && (
                    <Field title="Diagnosis Notes (optional)" className={definition.category === 'dementia' || definition.category === 'post_stroke' ? '' : 'sm:col-span-2'}>
                      <input value={item.notes} maxLength={1000} onChange={(event) => setDiagnosis(item.key, { notes: event.target.value })} className={input} />
                    </Field>
                  )}
                </div>
              </div>
            );
          })}
          <FieldError>{errors.diagnoses}</FieldError>
          {draft.diagnoses.length < options.definitions.length && (
            <button type="button" onClick={addDiagnosis} className="flex items-center gap-1.5 text-xs font-semibold text-teal hover:underline"><Plus className="h-3.5 w-3.5" />Add another diagnosis</button>
          )}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Secondary History &amp; Notes</h2>
          <span className="rounded-full bg-cream-deep/50 px-2 py-0.5 text-[10px] font-medium text-slate-500">Optional</span>
        </div>
        <Field title="Assessment Observations" className="mt-4">
          <textarea value={draft.observations} maxLength={5000} onChange={(event) => update({ observations: event.target.value })} rows={5} placeholder="Relevant medical history, comorbidities, allergies, or specific patient concerns raised during intake…" className={`${input} resize-y`} />
        </Field>
        <p className="mt-2 text-[10px] text-slate-400">{draft.observations.length}/5000 · Saved on the client record as assessment observations.</p>
      </section>
      <IntakeFooter step={2} onNext={next} nextLabel="Continue to Acuity" />
    </>
  );
}

// --- Step 3: Acuity ---
export function AcuityStep() {
  const { draft, update } = useIntake();
  const { errors, next } = useStepNavigation(3);
  const selected = acuityById(draft.acuity);

  return (
    <>
      <StepHeading eyebrow="Patient Admission Protocol" title="Clinical Acuity Assessment" description="Evaluate the patient's initial priority level based on physiological stability and nursing intensity. This informs staff allocation, visit priority and monitoring frequency. It can be changed later from the patient's care plan." />
      <div className="grid gap-5 md:grid-cols-3">
        {ACUITY_LEVELS.map((level) => {
          const isSelected = draft.acuity === level.id;
          return (
            <button key={level.id} type="button" onClick={() => update({ acuity: level.id })} aria-pressed={isSelected} className={`relative flex flex-col rounded-3xl border bg-white p-5 text-center transition-all duration-200 hover:-translate-y-0.5 shadow-sm ${isSelected ? level.selected : 'border-coral-soft hover:border-slate-400 hover:bg-cream/70'}`}>
              <span className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full ${isSelected ? level.icon : 'text-slate-300'}`}>{isSelected ? <CheckCircle2 className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}</span>
              <span className={`mx-auto mt-1 flex h-16 w-16 items-center justify-center rounded-lg ${isSelected ? level.icon : 'bg-cream-deep/50 text-slate-300'}`}><HeartPulse className="h-7 w-7" strokeWidth={1.5} /></span>
              <h3 className={`mt-4 text-sm font-semibold ${isSelected ? level.title_ : 'text-slate-700'}`}>{level.title}</h3>
              <p className="mx-auto mt-2 text-[11px] leading-relaxed text-slate-500">{level.description}</p>
              <div className="my-4 h-px w-full bg-cream-deep" />
              <div className="text-left">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Indications:</p>
                <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-slate-600">
                  {level.indications.map((indication) => <li key={indication} className="flex gap-1.5"><span className={`mt-1 h-1 w-1 shrink-0 rounded-full ${isSelected ? level.dot : 'bg-slate-300'}`} />{indication}</li>)}
                </ul>
              </div>
            </button>
          );
        })}
      </div>
      <FieldError>{errors.acuity}</FieldError>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className={`${card} flex flex-wrap items-center justify-between gap-6`}>
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal"><HeartPulse className="h-4 w-4" /></span><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Resource Estimation</p></div>
          <div className="flex items-center gap-10">
            {[['Nursing Ratio', 'ratio'], ['Monitor Freq.', 'frequency'], ['Escalation Path', 'escalation']].map(([title, key]) => (
              <div key={key}><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{title}</p><p className="mt-1 text-sm font-semibold text-slate-700">{selected ? selected.estimate[key] : '—'}</p></div>
            ))}
          </div>
        </section>
        <Field title="Reason for this level (optional)">
          <textarea value={draft.acuityReason} maxLength={1000} onChange={(event) => update({ acuityReason: event.target.value })} rows={3} placeholder="e.g. Recent fall, new medication regime" className={`${input} resize-y`} />
        </Field>
      </div>
      <IntakeFooter step={3} onNext={next} nextLabel="Step 4: Contact Details" />
    </>
  );
}

// --- Step 4: Contacts ---
const EMPTY_CONTACT = { full_name: '', relationship_type: '', phone: '' };

function ContactForm({ onAdd, onCancel }) {
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [error, setError] = useState('');
  const set = (field) => (event) => setContact((c) => ({ ...c, [field]: event.target.value }));
  const submit = () => {
    if (!contact.full_name.trim() || !contact.relationship_type || contact.phone.trim().length < 5) {
      setError('Name, relationship and a phone number (5+ characters) are required.');
      return;
    }
    onAdd({ ...contact, full_name: contact.full_name.trim(), phone: contact.phone.trim() });
    setContact(EMPTY_CONTACT);
    setError('');
  };
  return (
    <div className="rounded-3xl border border-teal/30 bg-white p-5 shadow-[0_3px_14px_-8px_rgba(15,23,42,0.16)]">
      <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-ink">New Contact</h2>{onCancel && <button type="button" onClick={onCancel} aria-label="Cancel" className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}</div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field title="Full name" className="col-span-2"><input value={contact.full_name} maxLength={150} onChange={set('full_name')} className={input} /></Field>
        <Field title="Relationship">
          <select value={contact.relationship_type} onChange={set('relationship_type')} className={input}>
            <option value="">Select…</option>{RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field title="Phone"><input type="tel" value={contact.phone} maxLength={30} onChange={set('phone')} placeholder="+254 700 000000" className={input} /></Field>
      </div>
      <FieldError>{error}</FieldError>
      <button type="button" onClick={submit} className="mt-4 w-full rounded-xl bg-teal py-2 text-xs font-semibold text-white hover:bg-[#1b8a7f]">Add Contact</button>
    </div>
  );
}

function ContactCard({ contact, onRemove, onMakePrimary }) {
  return (
    <article className={`relative rounded-3xl border bg-white p-5 shadow-[0_3px_14px_-8px_rgba(15,23,42,0.16)] ${contact.is_primary ? 'border-x-slate-200 border-b-slate-200 border-t-4 border-t-teal' : 'border-coral-soft'}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-soft text-sm font-semibold text-teal">{contact.full_name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2"><h2 className="truncate text-sm font-semibold text-ink">{contact.full_name}</h2>{contact.is_primary && <span className="rounded-full bg-teal-soft px-2 py-0.5 text-[9px] font-semibold text-teal">Primary</span>}</div>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><ShieldCheck className="h-3 w-3 text-slate-400" />{contact.relationship_type}</p>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-slate-600"><Phone className="h-4 w-4 text-slate-400" />{contact.phone}</p>
      <div className="mt-4 flex gap-3 text-[11px] font-semibold">
        {!contact.is_primary && <button type="button" onClick={onMakePrimary} className="text-teal hover:underline">Make primary</button>}
        <button type="button" onClick={onRemove} className="text-slate-400 hover:text-rose-600">Remove</button>
      </div>
    </article>
  );
}

export function ContactsStep() {
  const { draft, update } = useIntake();
  const { errors, next } = useStepNavigation(4);
  const [adding, setAdding] = useState(draft.contacts.length === 0);

  const add = (contact) => {
    update((d) => ({ contacts: [...d.contacts, { ...contact, id: newId(), is_primary: d.contacts.length === 0 }] }));
    setAdding(false);
  };
  const remove = (id) => update((d) => {
    const rest = d.contacts.filter((c) => c.id !== id);
    if (rest.length && !rest.some((c) => c.is_primary)) rest[0] = { ...rest[0], is_primary: true };
    return { contacts: rest };
  });
  const makePrimary = (id) => update((d) => ({ contacts: d.contacts.map((c) => ({ ...c, is_primary: c.id === id })) }));

  return (
    <>
      <StepHeading title="Emergency & Support Contacts" description="Provide at least one primary emergency contact. You can add family members, caregivers, or legal representatives who should be informed about the care plan." />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="grid gap-4 md:grid-cols-2">
            {draft.contacts.map((c) => <ContactCard key={c.id} contact={c} onRemove={() => remove(c.id)} onMakePrimary={() => makePrimary(c.id)} />)}
            {adding ? (
              <ContactForm onAdd={add} onCancel={draft.contacts.length ? () => setAdding(false) : null} />
            ) : (
              <button type="button" onClick={() => setAdding(true)} className="flex min-h-44 w-full flex-col items-center justify-center rounded-3xl border border-dashed border-coral-soft bg-white/40 p-5 text-center transition-colors hover:border-teal hover:bg-white shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-coral-soft bg-white text-teal"><Plus className="h-5 w-5" /></span>
                <span className="mt-3 text-sm font-semibold text-slate-600">Add Contact</span>
                <span className="mt-1 text-[11px] text-slate-400">Include secondary or emergency medical contacts</span>
              </button>
            )}
          </div>
          <div className="mt-3"><FieldError>{errors.contacts}</FieldError></div>
        </div>

        <aside className="space-y-4">
          <section className="px-2">
            <h2 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal"><ShieldCheck className="h-3.5 w-3.5" />Privacy &amp; Protocol</h2>
            <ul className="mt-3 space-y-3 text-[11px] leading-relaxed text-slate-500">
              <li className="flex gap-2"><CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />Emergency contacts are only notified in acute medical situations or discharge planning.</li>
              <li className="flex gap-2"><CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />The primary contact is the first person contacted for scheduling updates and non-emergency logistics.</li>
            </ul>
          </section>
          <section className="rounded-2xl border border-[#5cc4b8] bg-teal-soft p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-xs font-semibold text-teal"><Info className="h-4 w-4" />Need help?</h2>
            <p className="mt-2 text-[11px] leading-relaxed text-teal">If you&apos;re unsure who to list, we recommend a next-of-kin or a legal healthcare proxy.</p>
          </section>
          <PatientProfileCard />
        </aside>
      </div>
      <IntakeFooter step={4} onNext={next} nextLabel="Continue to Review" />
    </>
  );
}

function PatientProfileCard() {
  const { draft } = useIntake();
  const name = fullName(draft) || 'New patient';
  return (
    <section className="rounded-2xl border border-coral-soft bg-white p-4 shadow-sm">
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><LockKeyhole className="h-3 w-3" />Patient Profile</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal">{name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</span>
        <div><p className="text-xs font-semibold text-slate-700">{name}</p><p className="text-[10px] text-slate-400">ID assigned on submission</p></div>
      </div>
      <div className="mt-4 space-y-2 border-t border-coral-soft pt-3 text-[10px] text-slate-500">
        <div className="flex justify-between"><span>Status</span><span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">In Progress</span></div>
        {draft.startedAt && <div className="flex justify-between"><span>Intake Initiated</span><span>{format(new Date(draft.startedAt), 'd MMM, HH:mm')}</span></div>}
      </div>
    </section>
  );
}

// --- Step 5: Review & submit ---
function ReviewSection({ icon: Icon, title, step, items }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-coral-soft bg-white shadow-[0_3px_14px_-8px_rgba(15,23,42,0.14)]">
      <div className="flex items-center justify-between border-b border-coral-soft bg-cream/80 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-teal shadow-sm"><Icon className="h-3.5 w-3.5" /></span>{title}</h2>
        <Link href={`/intake/step-${step}`} className="flex items-center gap-0.5 text-[10px] font-semibold text-teal hover:underline">Edit<ChevronRight className="h-3 w-3" /></Link>
      </div>
      <dl className="divide-y divide-coral-soft px-4">
        {items.map(({ label: l, value, pills }) => (
          <div key={l} className="py-3">
            <dt className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{l}</dt>
            {pills ? (
              <dd className="mt-1 flex flex-wrap gap-1.5">{pills.length ? pills.map((p) => <span key={p} className="rounded-full bg-teal-soft px-2 py-0.5 text-[10px] font-medium text-teal">{p}</span>) : <span className="text-xs italic text-slate-400">None</span>}</dd>
            ) : (
              <dd className="mt-1 whitespace-pre-line text-xs font-medium text-slate-700">{value || <span className="italic text-slate-400">Not provided</span>}</dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ReviewStep() {
  const router = useRouter();
  const { draft, update, options, submitted: done, complete } = useIntake();
  const { errors } = useStepNavigation(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState(null);

  const definitionsById = new Map(options.definitions.map((d) => [d.id, d]));
  const org = options.organizations.find((o) => o.id === draft.orgId);
  const acuity = acuityById(draft.acuity);
  const dob = draft.dateOfBirth ? new Date(`${draft.dateOfBirth}T00:00:00`) : null;
  const diagnoses = draft.diagnoses.filter((x) => x.definitionId);

  const submit = async (allowDuplicate = false) => {
    if (!draft.attestation) {
      setError('Confirm the attestation to submit.');
      return;
    }
    setSubmitting(true);
    setError('');
    setDuplicate(null);
    try {
      const { data } = await apiClient.post('/clients/intake', {
        org_id: draft.orgId,
        full_name: fullName(draft),
        date_of_birth: draft.dateOfBirth,
        gender: draft.gender,
        address_text: addressText(draft),
        residence: draft.residence,
        location: draft.location,
        assessment_observations: draft.observations.trim() || null,
        diagnoses: diagnoses.map((x) => ({
          diagnosis_definition_id: x.definitionId,
          notes: x.notes.trim() || null,
          stage: x.stage.trim() || null,
          affected_side: x.affectedSide || null,
        })),
        acuity: { level: draft.acuity, reason_notes: draft.acuityReason.trim() || null },
        emergency_contacts: draft.contacts.map(({ full_name: n, relationship_type: r, phone, is_primary: p }) => ({ full_name: n, relationship_type: r, phone, is_primary: p })),
        attestation: draft.attestation,
        allow_duplicate: allowDuplicate,
      });
      complete({ ...data.client, care_plan: data.care_plan });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 409 && detail?.code === 'possible_duplicate') setDuplicate(detail.message);
      else setError(errorMessage(err, 'The intake record could not be submitted.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <section className="mx-auto mt-6 max-w-xl rounded-2xl border border-teal-200 bg-white p-8 text-center shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)]">
        <CheckCircle2 className="mx-auto h-12 w-12 text-teal-500" />
        <h1 className="mt-4 text-xl font-semibold text-ink">{done.full_name} is registered</h1>
        <p className="mt-2 text-sm text-slate-500">Client ID {done.id.slice(0, 8).toUpperCase()}. Diagnoses, initial acuity and emergency contacts were saved. The next step is to schedule their first visit.</p>
        {done.care_plan && (
          <div className="mt-5 rounded-2xl border border-coral-soft bg-cream p-4 text-left shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal">Care plan assigned from diagnosis</p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              {[['Tasks', done.care_plan.tasks], ['Assessments', done.care_plan.assessments], ['Medications', done.care_plan.medications]].map(([title, count]) => (
                <div key={title} className="rounded-lg bg-white px-2 py-3"><p className="text-xl font-semibold text-ink">{count}</p><p className="text-[11px] text-slate-500">{title}</p></div>
              ))}
            </div>
            {done.care_plan.tasks + done.care_plan.assessments + done.care_plan.medications === 0 && (
              <p className="mt-3 text-[11px] text-amber-700">The selected diagnosis has no care-plan items configured (e.g. &ldquo;Other&rdquo;). Add a specific diagnosis from the patient&apos;s Edit Care Plan.</p>
            )}
            <p className="mt-3 text-[11px] text-slate-400">Every visit automatically includes these tasks, assessments and medications.</p>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => router.push('/scheduling')} className="rounded-xl bg-teal px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1b8a7f]">Schedule First Visit</button>
          <button type="button" onClick={() => router.push(`/patients?q=${encodeURIComponent(done.full_name)}`)} className="rounded-lg border border-coral-soft px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-cream">View in Patients</button>
          <button type="button" onClick={() => router.push('/intake/step-1')} className="rounded-lg border border-coral-soft px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-cream">Register Another</button>
        </div>
      </section>
    );
  }

  return (
    <>
      <StepHeading eyebrow="Step 5: Final Verification" title="Intake Summary Review" description="Verified records ensure patient safety and operational efficiency. Confirm the details below before submitting." />
      <section className="mb-6 rounded-2xl border border-[#b6e6df] bg-[#f2fbf9] px-8 py-5 text-center shadow-sm">
        <ClipboardCheck className="mx-auto h-10 w-10 text-teal" strokeWidth={1.3} />
        <h2 className="mt-3 text-sm font-semibold text-[#115e56]">Ready for Submission</h2>
        <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-teal">Everything is saved in one step: the client record, diagnoses, initial acuity and emergency contacts.</p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReviewSection icon={UserRound} title="Patient Demographics" step={1} items={[
          { label: 'Full Name', value: fullName(draft) },
          { label: 'Date of Birth', value: dob ? `${format(dob, 'd MMMM yyyy')} (${differenceInYears(new Date(), dob)} years)` : '' },
          { label: 'Gender', value: draft.gender },
          { label: 'Residential Address', value: addressText(draft) },
          { label: 'Residence Type', value: draft.residence },
          { label: 'Organisation', value: org?.name },
        ]} />
        <ReviewSection icon={Stethoscope} title="Clinical Assessment" step={2} items={[
          { label: 'Primary Diagnosis', value: definitionsById.get(diagnoses[0]?.definitionId)?.name },
          { label: 'Additional Diagnoses', pills: diagnoses.slice(1).map((x) => definitionsById.get(x.definitionId)?.name).filter(Boolean) },
          { label: 'Assessment Observations', value: draft.observations.trim() },
        ]} />
        <ReviewSection icon={Activity} title="Acuity & Risk Profile" step={3} items={[
          { label: 'Acuity Level', value: acuity?.title },
          { label: 'Reason', value: draft.acuityReason.trim() },
          { label: 'Monitoring', value: acuity ? `${acuity.estimate.frequency} · nursing ratio ${acuity.estimate.ratio}` : '' },
        ]} />
        <ReviewSection icon={Phone} title="Emergency Contacts" step={4} items={draft.contacts.map((c) => ({
          label: c.is_primary ? 'Primary Contact' : 'Contact',
          value: `${c.full_name} (${c.relationship_type}) · ${c.phone}`,
        }))} />
      </div>

      <section className="mt-6 rounded-3xl border border-coral-soft bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal"><LockKeyhole className="h-4 w-4" /></span>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">HIPAA &amp; Clinical Attestation</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">By submitting this form, you attest that the information provided is accurate to the best of your knowledge and has been collected in accordance with HIPAA privacy standards and facility-specific protocols. This record will be timestamped and attributed to you.</p>
          </div>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={draft.attestation} onChange={(event) => update({ attestation: event.target.checked })} className="h-4 w-4 rounded border-coral-soft text-teal focus:ring-teal/30" />
          I confirm the captured information is accurate and ready for clinical review.
        </label>
        <FieldError>{errors.attestation}</FieldError>
      </section>

      {duplicate && (
        <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{duplicate} Check the Patients page before registering again.</span>
          <button type="button" onClick={() => submit(true)} disabled={submitting} className="rounded-2xl border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-800 hover:bg-amber-100 shadow-sm">Register anyway</button>
        </div>
      )}
      {error && <p role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => router.push('/intake/step-4')} className="flex items-center justify-center gap-1.5 rounded-lg border border-coral-soft bg-white px-5 py-3 text-xs font-semibold text-slate-500 hover:bg-cream"><ArrowLeft className="h-3.5 w-3.5" />Return to Contacts</button>
        <button type="button" onClick={() => submit(false)} disabled={!draft.attestation || submitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal py-3 text-sm font-semibold text-white shadow-[0_8px_18px_-10px_rgba(34,166,153,0.65)] transition-colors hover:bg-[#1b8a7f] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">
          <Send className="h-4 w-4" />{submitting ? 'Submitting…' : 'Submit Intake Record'}
        </button>
      </div>
    </>
  );
}

// --- Step router ---
const STEP_COMPONENTS = { 1: DemographicsStep, 2: DiagnosisStep, 3: AcuityStep, 4: ContactsStep, 5: ReviewStep };

/** Renders /intake/step-N; sends the user back to the first incomplete step if they skip ahead. */
export function IntakeStep({ step }) {
  const router = useRouter();
  const { draft, hydrated, submitted, clearSubmitted } = useIntake();
  const firstOpen = hydrated ? firstIncompleteStep(draft) : 1;
  const showingSuccess = step === TOTAL_STEPS && submitted;
  const blocked = hydrated && !showingSuccess && step > firstOpen;

  useEffect(() => {
    if (blocked) router.replace(`/intake/step-${firstOpen}`);
  }, [blocked, firstOpen, router]);

  // Leaving the success screen (e.g. "Register Another") starts a fresh intake.
  useEffect(() => {
    if (submitted && step !== TOTAL_STEPS) clearSubmitted();
  }, [submitted, step, clearSubmitted]);

  if (!hydrated || blocked) return <p className="py-16 text-center text-sm text-slate-400">Loading intake…</p>;
  const Step = STEP_COMPONENTS[step];
  return (
    <div className="mx-auto w-full max-w-5xl">
      <IntakeProgress step={step} />
      <div className="mt-8"><Step /></div>
    </div>
  );
}
