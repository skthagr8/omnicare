'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { differenceInYears, format } from 'date-fns';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  HeartPulse,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  UserRound,
  X,
} from 'lucide-react';
import { apiClient } from '../../services/api';

// --- Config ---
export const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

// Keys match the backend ClientDiagnosisCategory / DiagnosisCategory enums.
export const DIAGNOSIS_OPTIONS = [
  { value: 'dementia', label: 'Dementia', className: 'bg-violet-50 text-violet-700' },
  { value: 'parkinsons', label: "Parkinson's", className: 'bg-teal-50 text-teal-700' },
  { value: 'post_stroke', label: 'Post-Stroke', className: 'bg-sky-50 text-sky-700' },
  { value: 'other', label: 'Other', className: 'bg-stone-100 text-stone-600' },
];

// Keys match the backend AcuityLevel enum; 'none' = no current acuity tier.
export const ACUITY_OPTIONS = [
  { value: 'red', label: 'High acuity', bar: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700' },
  { value: 'amber', label: 'Medium acuity', bar: 'bg-amber-400', pill: 'bg-amber-50 text-amber-700' },
  { value: 'green', label: 'Low acuity', bar: 'bg-teal-500', pill: 'bg-teal-50 text-teal-700' },
  { value: 'none', label: 'Not assessed', bar: 'bg-cream-deep', pill: 'bg-cream-deep/50 text-slate-500' },
];

// Keys match the backend CaregiverStatus enum.
export const CAREGIVER_STATUS_STYLES = {
  available: { dot: 'bg-teal-500', label: 'Available' },
  en_route: { dot: 'bg-amber-500', label: 'En-route' },
  in_service: { dot: 'bg-sky-500', label: 'In-service' },
  emergency: { dot: 'bg-rose-500', label: 'Emergency' },
  off_shift: { dot: 'bg-slate-300', label: 'Off shift' },
};

const VISIT_STATUS_LABELS = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const diagnosisOption = (value) => DIAGNOSIS_OPTIONS.find((d) => d.value === value) ?? { label: value, className: 'bg-cream-deep/50 text-slate-600' };
const acuityOption = (value) => ACUITY_OPTIONS.find((a) => a.value === (value ?? 'none'));
const caregiverStatus = (value) => CAREGIVER_STATUS_STYLES[value] ?? CAREGIVER_STATUS_STYLES.off_shift;

const initials = (name) => (name || '?').split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const shortId = (id) => id.slice(0, 8).toUpperCase();
const ageFrom = (dateOfBirth) => differenceInYears(new Date(), new Date(`${dateOfBirth}T00:00:00`));
const formatDateTime = (iso) => format(new Date(iso), 'd MMM yyyy, HH:mm');

/** FastAPI returns `detail` as a string, or as a list of { msg } for validation errors. */
function errorMessage(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map((d) => d?.msg).filter(Boolean);
    if (messages.length) return messages.join(' ');
  }
  return err?.response ? fallback : 'Unable to reach the server. Check your connection and try again.';
}

// --- Data ---
/**
 * GET /scheduling/patients: one row per client name across all organisations, built from
 * caregiver sessions and joined with diagnoses, current acuity and the assigned caregiver.
 */
export function useClientDirectory({ query, diagnosis, acuity, status, page, onPageChange }) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [state, setState] = useState({ patients: [], loading: true, error: '' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: '' }));
    apiClient
      .get('/scheduling/patients', { signal: controller.signal })
      .then(({ data }) => setState({ patients: data, loading: false, error: '' }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState((current) => ({ ...current, loading: false, error: errorMessage(err, 'Unable to load patients.') }));
      });
    return () => controller.abort();
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();
    return state.patients.filter((p) => {
      const matchesQuery = !term
        || p.full_name.toLowerCase().includes(term)
        || p.caregiver?.full_name?.toLowerCase().includes(term)
        || p.id.toLowerCase().startsWith(term);
      const matchesDiagnosis = diagnosis === 'All' || p.diagnoses.includes(diagnosis);
      const matchesAcuity = acuity === 'All' || (p.acuity ?? 'none') === acuity;
      const matchesStatus = status === 'All' || (status === 'active') === p.is_active;
      return matchesQuery && matchesDiagnosis && matchesAcuity && matchesStatus;
    });
  }, [state.patients, debouncedQuery, diagnosis, acuity, status]);

  // Keep the page in range when the result set shrinks (e.g. after a reload).
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    if (page > pageCount) onPageChange(pageCount);
  }, [page, pageCount, onPageChange]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return {
    items: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: filtered.length,
    loading: state.loading,
    error: state.error,
    reload,
  };
}

/** Caregivers for the reassign picker (GET /caregivers, all organisations). */
function useCaregivers() {
  const [state, setState] = useState({ caregivers: [], loading: true, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get('/caregivers', { signal: controller.signal })
      .then(({ data }) => setState({ caregivers: data, loading: false, error: '' }))
      .catch((err) => !controller.signal.aborted && setState({ caregivers: [], loading: false, error: errorMessage(err, 'Unable to load caregivers.') }));
    return () => controller.abort();
  }, []);
  return state;
}

// --- Shared UI ---
function Modal({ title, eyebrow, icon: Icon, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-[90vh] w-full flex-col rounded-2xl border border-white/70 bg-white shadow-[0_20px_60px_-18px_rgba(15,23,42,0.35)] ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="flex items-start justify-between border-b border-coral-soft p-6 pb-4">
          <div className="flex items-center gap-3">
            {Icon && <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-soft text-teal"><Icon className="h-5 w-5" /></span>}
            <div>
              {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal">{eyebrow}</p>}
              <h2 className="mt-1 text-lg font-semibold text-ink">{title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-cream-deep/50 hover:text-slate-600" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto p-6 pt-4">{children}</div>
      </div>
    </div>
  );
}

const fieldLabel = 'text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const inputClass = 'mt-2 w-full rounded-lg border border-coral-soft bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15';
const primaryButton = 'rounded-lg bg-teal px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1b8a7f] disabled:cursor-not-allowed disabled:bg-slate-300';
const secondaryButton = 'rounded-lg border border-coral-soft px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-cream';

function ErrorNote({ children }) {
  return children ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{children}</p> : null;
}

function DiagnosisPills({ diagnoses, empty = 'None recorded' }) {
  if (!diagnoses.length) return <span className="text-xs italic text-slate-400">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {diagnoses.map((d) => { const option = diagnosisOption(d); return <span key={d} className={`rounded-full px-2.5 py-1 text-xs font-medium ${option.className}`}>{option.label}</span>; })}
    </div>
  );
}

export function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const id = setTimeout(onDone, 3500);
    return () => clearTimeout(id);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50">
      <div role="status" className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_16px_40px_-16px_rgba(15,23,42,0.35)]">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-500" />{message}
      </div>
    </div>
  );
}

// --- PatientDirectoryHeader ---
export function PatientDirectoryHeader({ query, onQueryChange, diagnosis, acuity, status, onDiagnosisChange, onAcuityChange, onStatusChange }) {
  const selectClass = 'appearance-none rounded-full border border-coral-soft bg-white py-2.5 pl-4 pr-9 text-sm text-slate-600 outline-none focus:border-teal';
  const filterIcon = <Filter className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />;
  return (
    <div className="border-b border-coral-soft bg-cream px-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Care Operations</p><h1 className="mt-1 text-2xl font-semibold text-ink">Patients</h1><p className="mt-1 text-sm text-slate-500">Registered clients and current care assignments</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} type="search" aria-label="Search patients" placeholder="Search patient, caregiver or ID..." className="w-64 rounded-full border border-coral-soft bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/15" /></div>
          <label className="relative"><span className="sr-only">Diagnosis category</span><select value={diagnosis} onChange={(event) => onDiagnosisChange(event.target.value)} className={selectClass}><option value="All">All diagnoses</option>{DIAGNOSIS_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select>{filterIcon}</label>
          <label className="relative"><span className="sr-only">Acuity tier</span><select value={acuity} onChange={(event) => onAcuityChange(event.target.value)} className={selectClass}><option value="All">All acuity</option>{ACUITY_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select>{filterIcon}</label>
          <label className="relative"><span className="sr-only">Patient status</span><select value={status} onChange={(event) => onStatusChange(event.target.value)} className={selectClass}><option value="All">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>{filterIcon}</label>
        </div>
      </div>
    </div>
  );
}

// --- PatientRow ---
const ROW_ACTIONS = [
  { key: 'profile', label: 'View Profile', icon: UserRound },
  { key: 'reassign', label: 'Reassign Caregiver', icon: UserCog },
  { key: 'care-plan', label: 'Edit Care Plan', icon: ClipboardList },
];

function RowActions({ patient, onAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => ref.current && !ref.current.contains(event.target) && setOpen(false);
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open} aria-label={`Actions for ${patient.full_name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-cream-deep/50 hover:text-slate-600"><MoreHorizontal className="h-4 w-4" /></button>
      {open && (
        <div role="menu" className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-2xl border border-coral-soft bg-white py-1 shadow-[0_12px_28px_-8px_rgba(15,23,42,0.2)]">
          {ROW_ACTIONS.map(({ key, label, icon: Icon }) => (
            <button key={key} role="menuitem" onClick={() => { setOpen(false); onAction(key, patient); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-600 hover:bg-cream">
              <Icon className="h-3.5 w-3.5 text-slate-400" />{label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function visitLabel(patient) {
  if (!patient.visit_start) return '';
  const prefix = { in_progress: 'Visit in progress since', scheduled: 'Next visit' }[patient.visit_status] ?? 'Last visit';
  return `${prefix} ${format(new Date(patient.visit_start), 'd MMM, HH:mm')}`;
}

function CaregiverCell({ patient }) {
  const { caregiver } = patient;
  if (!caregiver) return <span className="text-xs italic text-slate-400">Unassigned</span>;
  const visit = visitLabel(patient);
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/10 text-[10px] font-semibold text-teal">{initials(caregiver.full_name)}</span>
      <div><p className="text-sm text-slate-700">{caregiver.full_name || 'Caregiver'}</p>{visit && <p className="text-[10px] text-slate-400">{visit}</p>}</div>
    </div>
  );
}

export function PatientRow({ patient, onAction }) {
  const acuity = acuityOption(patient.acuity);
  const status = patient.caregiver ? caregiverStatus(patient.caregiver.status) : null;
  return (
    <tr className="group border-b border-coral-soft even:bg-cream/60 hover:bg-teal-50/30">
      <td className="relative w-2 p-0"><span className={`absolute inset-y-0 left-0 w-1 ${acuity.bar}`} title={acuity.label} aria-label={acuity.label} /></td>
      <td className="px-5 py-4">
        <button onClick={() => onAction('profile', patient)} className="flex items-center gap-2 text-left font-semibold text-ink hover:text-teal hover:underline">
          {patient.full_name}
          {!patient.is_active && <span className="rounded-full bg-cream-deep/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 no-underline">Inactive</span>}
        </button>
        <p className="mt-0.5 text-[11px] text-slate-400" title={patient.id}>Client ID {shortId(patient.id)}</p>
      </td>
      <td className="px-5 py-4"><DiagnosisPills diagnoses={patient.diagnoses} /></td>
      <td className="px-5 py-4 text-sm text-slate-600">{ageFrom(patient.date_of_birth)}</td>
      <td className="px-5 py-4"><CaregiverCell patient={patient} /></td>
      <td className="px-5 py-4">{status ? <span className="flex items-center gap-2 text-xs text-slate-600"><span className={`h-2 w-2 rounded-full ${status.dot}`} />{status.label}</span> : <span className="text-xs text-slate-300">—</span>}</td>
      <td className="px-5 py-4 text-right"><RowActions patient={patient} onAction={onAction} /></td>
    </tr>
  );
}

// --- PatientTable ---
export function PatientTable({ patients, total, loading, error, onRetry, page, onPageChange, onAction }) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-coral-soft bg-white">
      <div className={`min-h-0 flex-1 overflow-auto transition-opacity ${loading && patients.length ? 'opacity-60' : ''}`}>
        <table className="w-full min-w-212.5 border-collapse">
          <thead className="sticky top-0 z-1 bg-white shadow-[0_1px_0_rgba(226,232,240,1)]"><tr className="text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400"><th className="w-2 p-0" aria-label="Acuity" /><th className="px-5 py-3">Patient Name</th><th className="px-5 py-3">Diagnosis Category</th><th className="px-5 py-3">Age</th><th className="px-5 py-3">Assigned Caregiver</th><th className="px-5 py-3">Caregiver Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
          <tbody>{patients.map((patient) => <PatientRow key={patient.id} patient={patient} onAction={onAction} />)}</tbody>
        </table>
        {error && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-sm text-rose-600">
            {error}
            <button onClick={onRetry} className="flex items-center gap-1.5 rounded-lg border border-coral-soft px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-cream"><RefreshCw className="h-3.5 w-3.5" />Retry</button>
          </div>
        )}
        {!error && loading && patients.length === 0 && <div className="px-6 py-16 text-center text-sm text-slate-400">Loading patients…</div>}
        {!error && !loading && patients.length === 0 && <div className="px-6 py-16 text-center text-sm text-slate-400">No patients match the current filters.</div>}
      </div>
      <div className="flex items-center justify-between border-t border-coral-soft px-5 py-3 text-xs text-slate-400">
        <span>{total === 0 ? 'No matching patients' : `Showing ${first}–${last} of ${total.toLocaleString()} patients`}</span>
        <div className="flex items-center gap-2">
          <button onClick={onRetry} disabled={loading} title="Reload" className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-cream disabled:opacity-40"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" />Previous</button>
          <span className="rounded-md bg-cream-deep/50 px-2.5 py-1 font-semibold text-slate-600">{page} / {pageCount}</span>
          <button disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40">Next<ChevronRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

// --- PatientProfileDrawer ---
function usePatientProfile(clientId) {
  const [state, setState] = useState({ loading: true, error: '', client: null, diagnoses: [], tiers: [], carePlan: null, sessions: [], caregiverNames: new Map() });

  useEffect(() => {
    const controller = new AbortController();
    const get = (url, params) => apiClient.get(url, { signal: controller.signal, params }).then(({ data }) => data);
    Promise.all([
      get(`/clients/${clientId}`),
      get(`/clients/${clientId}/diagnoses`),
      get(`/clients/${clientId}/acuity-tiers`),
      get(`/clients/${clientId}/care-plan`),
      get('/scheduling/sessions', { client_id: clientId }),
      get('/caregivers'),
    ])
      .then(([client, diagnoses, tiers, carePlan, sessions, caregivers]) => setState({
        loading: false,
        error: '',
        client,
        diagnoses,
        tiers,
        carePlan,
        sessions: [...sessions].sort((a, b) => new Date(b.scheduled_start) - new Date(a.scheduled_start)),
        caregiverNames: new Map(caregivers.map((c) => [c.user_id, c.full_name])),
      }))
      .catch((err) => !controller.signal.aborted && setState((s) => ({ ...s, loading: false, error: errorMessage(err, 'Unable to load this patient.') })));
    return () => controller.abort();
  }, [clientId]);

  return state;
}

function ProfileSection({ title, children }) {
  return (
    <section className="border-t border-coral-soft pt-5">
      <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

const ASSESSMENT_LABELS = { tug: 'Timed Up & Go (TUG)', braden: 'Braden (pressure injury)', cmai: 'CMAI (agitation)', delirium: 'Delirium screen', iadl: 'IADL' };

/** Care plan resolved from active diagnoses: what every visit includes. */
function CarePlanItems({ plan }) {
  const { summary } = plan;
  if (summary.tasks + summary.assessments + summary.medications === 0) {
    return <p className="mt-3 text-xs italic text-slate-400">No care-plan items: the active diagnosis has no tasks, assessments or medications configured.</p>;
  }
  const required = (item) => (item.is_required ? null : <span className="ml-1 rounded bg-cream-deep/50 px-1 text-[9px] font-semibold uppercase text-slate-500 tracking-wide">Optional</span>);
  const group = (title, items, render) => items.length > 0 && (
    <details className="group rounded-lg border border-coral-soft" open={title === 'Tasks'}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700">
        {title}<span className="flex items-center gap-1 text-slate-400">{items.length}<ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" /></span>
      </summary>
      <ul className="divide-y divide-coral-soft border-t border-coral-soft">{items.map(render)}</ul>
    </details>
  );
  return (
    <div className="mt-4 space-y-2">
      <p className="text-[11px] text-slate-500">Included in every visit, from the active diagnoses:</p>
      {group('Tasks', plan.tasks, (t) => (
        <li key={t.task_id} className="px-3 py-2 text-xs">
          <p className="font-medium text-slate-700">{t.name}{required(t)}</p>
          <p className="text-[11px] text-slate-400">{[t.priority && `${t.priority} priority`, t.duration_minutes && `${t.duration_minutes} min`].filter(Boolean).join(' · ')}</p>
        </li>
      ))}
      {group('Assessments', plan.assessments, (a) => (
        <li key={a.assessment_type} className="px-3 py-2 text-xs">
          <p className="font-medium text-slate-700">{ASSESSMENT_LABELS[a.assessment_type] ?? a.assessment_type}{required(a)}</p>
          {a.frequency_days && <p className="text-[11px] text-slate-400">Every {a.frequency_days} day{a.frequency_days === 1 ? '' : 's'}</p>}
        </li>
      ))}
      {group('Medications', plan.medications, (m) => (
        <li key={m.medication_id} className="px-3 py-2 text-xs">
          <p className="font-medium text-slate-700">{m.name} <span className="font-normal text-slate-500">{m.dosage}</span>{required(m)}</p>
          {m.instructions && <p className="text-[11px] text-slate-400">{m.instructions}</p>}
        </li>
      ))}
    </div>
  );
}

export function PatientProfileDrawer({ patient, onClose, onAction }) {
  const { loading, error, client, diagnoses, tiers, carePlan, sessions, caregiverNames } = usePatientProfile(patient.id);
  const now = Date.now();
  const currentTier = tiers.find((t) => new Date(t.effective_from).getTime() <= now && (!t.effective_to || new Date(t.effective_to).getTime() > now));
  const acuity = acuityOption(currentTier?.level);

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/20 backdrop-blur-[1px]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={`${patient.full_name} profile`} className="flex h-full w-full max-w-md flex-col bg-white shadow-[-20px_0_60px_-20px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between border-b border-coral-soft px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-soft text-sm font-semibold text-teal">{initials(patient.full_name)}</span>
            <div>
              <h2 className="text-lg font-semibold text-ink">{patient.full_name}</h2>
              <p className="text-[11px] text-slate-400">Client ID {shortId(patient.id)} · {patient.is_active ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-cream-deep/50 hover:text-slate-600" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {loading && <p className="py-10 text-center text-sm text-slate-400">Loading profile…</p>}
          <ErrorNote>{error}</ErrorNote>
          {client && (
            <>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className={fieldLabel}>Age</dt><dd className="mt-1 text-slate-700">{ageFrom(client.date_of_birth)} <span className="text-xs text-slate-400">({format(new Date(`${client.date_of_birth}T00:00:00`), 'd MMM yyyy')})</span></dd></div>
                <div><dt className={fieldLabel}>Gender</dt><dd className="mt-1 text-slate-700">{client.gender}</dd></div>
                <div className="col-span-2"><dt className={fieldLabel}>Address</dt><dd className="mt-1 text-slate-700">{client.address_text}</dd></div>
                {client.residence && <div className="col-span-2"><dt className={fieldLabel}>Residence</dt><dd className="mt-1 text-slate-700">{client.residence}</dd></div>}
                {client.assessment_observations && <div className="col-span-2"><dt className={fieldLabel}>Assessment observations</dt><dd className="mt-1 whitespace-pre-line text-slate-600">{client.assessment_observations}</dd></div>}
              </dl>

              <ProfileSection title="Care plan">
                <div className="mb-3 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${acuity.pill}`}>{acuity.label}</span>
                  {currentTier?.reason_notes && <span className="text-xs text-slate-500">{currentTier.reason_notes}</span>}
                </div>
                <DiagnosisPills diagnoses={[...new Set(diagnoses.filter((d) => d.is_active).map((d) => d.category))]} empty="No active diagnoses" />
                {carePlan && <CarePlanItems plan={carePlan} />}
              </ProfileSection>

              <ProfileSection title={`Visits (${sessions.length})`}>
                {sessions.length === 0 ? <p className="text-xs italic text-slate-400">No visits recorded.</p> : (
                  <ul className="space-y-2">
                    {sessions.map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded-lg border border-coral-soft px-3 py-2 text-xs">
                        <div>
                          <p className="font-semibold text-slate-700">{formatDateTime(s.scheduled_start)}</p>
                          <p className="text-slate-400">{caregiverNames.get(s.caregiver_id) || 'Unknown caregiver'}</p>
                        </div>
                        <span className="rounded-full bg-cream-deep/50 px-2 py-0.5 font-semibold text-slate-500">{VISIT_STATUS_LABELS[s.status] ?? s.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </ProfileSection>
            </>
          )}
        </div>

        <div className="flex gap-2 border-t border-coral-soft px-6 py-4">
          <button onClick={() => onAction('reassign', patient)} className={`${secondaryButton} flex flex-1 items-center justify-center gap-1.5`}><UserCog className="h-3.5 w-3.5" />Reassign Caregiver</button>
          <button onClick={() => onAction('care-plan', patient)} className={`${primaryButton} flex flex-1 items-center justify-center gap-1.5`}><ClipboardList className="h-3.5 w-3.5" />Edit Care Plan</button>
        </div>
      </aside>
    </div>
  );
}

// --- ReassignCaregiverDialog ---
export function ReassignCaregiverDialog({ patient, onClose, onDone }) {
  const { caregivers, loading, error: loadError } = useCaregivers();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const options = useMemo(() => {
    const term = search.trim().toLowerCase();
    const certifiedFor = (c) => patient.diagnoses.length > 0 && patient.diagnoses.every((d) => c.certifications.some((cert) => cert.diagnosis_category === d));
    return caregivers
      .filter((c) => c.user_id !== patient.caregiver?.id)
      .filter((c) => !term || (c.full_name || '').toLowerCase().includes(term))
      .map((c) => ({ ...c, certified: certifiedFor(c) }))
      .sort((a, b) => b.certified - a.certified || (a.full_name || '').localeCompare(b.full_name || ''));
  }, [caregivers, search, patient]);

  const canReassign = patient.upcoming_visits > 0;

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await apiClient.patch(`/scheduling/patients/${patient.id}/caregiver`, { caregiver_id: selected.user_id });
      onDone(`${data.sessions_updated} upcoming visit${data.sessions_updated === 1 ? '' : 's'} for ${patient.full_name} reassigned to ${selected.full_name}.`);
    } catch (err) {
      setError(errorMessage(err, 'Unable to reassign the caregiver.'));
      setSaving(false);
    }
  };

  return (
    <Modal title="Reassign Caregiver" eyebrow={patient.full_name} icon={UserCog} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-cream px-3 py-2.5 text-xs text-slate-600">
          Current caregiver: <span className="font-semibold">{patient.caregiver?.full_name || 'Unassigned'}</span>
          <span className="mt-1 block text-slate-400">
            {canReassign
              ? `${patient.upcoming_visits} upcoming scheduled visit${patient.upcoming_visits === 1 ? '' : 's'} will move to the new caregiver. Visits in progress or completed are not changed.`
              : 'This patient has no upcoming scheduled visits, so there is nothing to reassign.'}
          </span>
        </div>

        {canReassign && (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search caregivers..." aria-label="Search caregivers" className="w-full rounded-lg border border-coral-soft py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15" />
            </div>
            <ErrorNote>{loadError}</ErrorNote>
            <ul className="max-h-64 divide-y divide-coral-soft overflow-y-auto rounded-lg border border-coral-soft" role="listbox" aria-label="Caregivers">
              {loading && <li className="px-3 py-6 text-center text-xs text-slate-400">Loading caregivers…</li>}
              {!loading && options.length === 0 && <li className="px-3 py-6 text-center text-xs text-slate-400">No caregivers match.</li>}
              {options.map((c) => {
                const status = caregiverStatus(c.status);
                const isSelected = selected?.user_id === c.user_id;
                return (
                  <li key={c.user_id}>
                    <button type="button" role="option" aria-selected={isSelected} onClick={() => setSelected(c)} className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm ${isSelected ? 'bg-teal-soft' : 'hover:bg-cream'}`}>
                      <span className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal/10 text-[10px] font-semibold text-teal">{initials(c.full_name)}</span>
                        <span>
                          <span className="block font-medium text-slate-700">{c.full_name || 'Caregiver'}</span>
                          <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span>
                        </span>
                      </span>
                      {c.certified && <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700"><ShieldCheck className="h-3 w-3" />Certified</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            {patient.diagnoses.length > 0 && <p className="text-[11px] text-slate-400">“Certified” caregivers hold certifications for all of this patient&apos;s diagnoses.</p>}
          </>
        )}

        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={secondaryButton}>Cancel</button>
          {canReassign && <button onClick={submit} disabled={!selected || saving} className={primaryButton}>{saving ? 'Reassigning…' : 'Reassign Visits'}</button>}
        </div>
      </div>
    </Modal>
  );
}

// --- CarePlanDialog ---
export function CarePlanDialog({ patient, onClose, onDone }) {
  const [state, setState] = useState({ loading: true, error: '', diagnoses: [], definitions: [], currentLevel: null });
  const [level, setLevel] = useState('');
  const [reason, setReason] = useState('');
  const [newDiagnosis, setNewDiagnosis] = useState({ definitionId: '', notes: '', stage: '', affectedSide: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const changed = useRef(false);

  const load = useCallback(async (signal) => {
    const get = (url, params) => apiClient.get(url, { signal, params }).then(({ data }) => data);
    try {
      const [diagnoses, tiers, definitions] = await Promise.all([
        get(`/clients/${patient.id}/diagnoses`),
        get(`/clients/${patient.id}/acuity-tiers`),
        get('/clients/diagnosis-definitions'),
      ]);
      const now = Date.now();
      const current = tiers.find((t) => new Date(t.effective_from).getTime() <= now && (!t.effective_to || new Date(t.effective_to).getTime() > now));
      setState({ loading: false, error: '', diagnoses: diagnoses.filter((d) => d.is_active), definitions, currentLevel: current?.level ?? null });
      setLevel((value) => value || current?.level || '');
    } catch (err) {
      if (!signal?.aborted) setState((s) => ({ ...s, loading: false, error: errorMessage(err, 'Unable to load the care plan.') }));
    }
  }, [patient.id]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const close = () => (changed.current ? onDone('Care plan updated.') : onClose());

  const run = async (key, action) => {
    setBusy(key);
    setError('');
    try {
      await action();
      changed.current = true;
      await load();
      return true;
    } catch (err) {
      setError(errorMessage(err, 'The change could not be saved.'));
      return false;
    } finally {
      setBusy('');
    }
  };

  const saveAcuity = () => run('acuity', () => apiClient.post(`/clients/${patient.id}/acuity-tiers`, { level, reason_notes: reason.trim() || null }))
    .then((ok) => ok && setReason(''));

  const deactivate = (diagnosis) => run(`remove-${diagnosis.id}`, () => apiClient.patch(`/clients/diagnoses/${diagnosis.id}`, { is_active: false }));

  const selectedDefinition = state.definitions.find((d) => d.id === newDiagnosis.definitionId);
  const addDiagnosis = () => {
    const payload = {
      category: selectedDefinition.category,
      diagnosis_definition_id: selectedDefinition.id,
      notes: newDiagnosis.notes.trim() || null,
      ...(selectedDefinition.category === 'dementia' && newDiagnosis.stage.trim() ? { stage: newDiagnosis.stage.trim() } : {}),
      ...(selectedDefinition.category === 'post_stroke' && newDiagnosis.affectedSide ? { affected_side: newDiagnosis.affectedSide } : {}),
    };
    return run('add', () => apiClient.post(`/clients/${patient.id}/diagnoses`, payload))
      .then((ok) => ok && setNewDiagnosis({ definitionId: '', notes: '', stage: '', affectedSide: '' }));
  };

  const definitionName = (id) => state.definitions.find((d) => d.id === id)?.name;

  return (
    <Modal title="Edit Care Plan" eyebrow={patient.full_name} icon={ClipboardList} onClose={close} wide>
      {state.loading ? <p className="py-10 text-center text-sm text-slate-400">Loading care plan…</p> : (
        <div className="space-y-6">
          <ErrorNote>{state.error}</ErrorNote>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><HeartPulse className="h-4 w-4 text-teal" />Acuity</h3>
            <p className="mt-1 text-xs text-slate-500">Current: <span className={`rounded-full px-2 py-0.5 font-semibold ${acuityOption(state.currentLevel).pill}`}>{acuityOption(state.currentLevel).label}</span></p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {ACUITY_OPTIONS.filter((a) => a.value !== 'none').map((a) => (
                <button key={a.value} type="button" onClick={() => setLevel(a.value)} aria-pressed={level === a.value} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${level === a.value ? 'border-teal bg-teal-soft text-teal' : 'border-coral-soft text-slate-500 hover:bg-cream'}`}>
                  <span className={`h-2 w-2 rounded-full ${a.bar}`} />{a.label}
                </button>
              ))}
            </div>
            <label className="mt-3 block"><span className={fieldLabel}>Reason (optional)</span><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="e.g. Recent fall, increased monitoring" className={inputClass} /></label>
            <div className="mt-3 flex justify-end">
              <button onClick={saveAcuity} disabled={!level || (level === state.currentLevel && !reason.trim()) || !!busy} className={primaryButton}>{busy === 'acuity' ? 'Saving…' : 'Update Acuity'}</button>
            </div>
          </section>

          <section className="border-t border-coral-soft pt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><ClipboardList className="h-4 w-4 text-teal" />Active diagnoses</h3>
            {state.diagnoses.length === 0 ? <p className="mt-2 text-xs italic text-slate-400">No active diagnoses.</p> : (
              <ul className="mt-3 space-y-2">
                {state.diagnoses.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-coral-soft px-3 py-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${diagnosisOption(d.category).className}`}>{diagnosisOption(d.category).label}</span>
                        <span className="truncate">{definitionName(d.diagnosis_definition_id) ?? ''}</span>
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">
                        Since {format(new Date(d.diagnosed_at), 'd MMM yyyy')}
                        {d.stage && ` · Stage ${d.stage}`}{d.affected_side && ` · ${d.affected_side} side`}{d.notes && ` · ${d.notes}`}
                      </p>
                    </div>
                    <button onClick={() => deactivate(d)} disabled={!!busy} className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">{busy === `remove-${d.id}` ? 'Removing…' : 'Deactivate'}</button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 rounded-xl border border-dashed border-coral-soft p-4">
              <p className="text-xs font-semibold text-slate-600">Add diagnosis</p>
              <label className="mt-2 block"><span className={fieldLabel}>Diagnosis</span>
                <select value={newDiagnosis.definitionId} onChange={(event) => setNewDiagnosis((s) => ({ ...s, definitionId: event.target.value }))} className={inputClass}>
                  <option value="">Select a diagnosis…</option>
                  {DIAGNOSIS_OPTIONS.map((group) => {
                    const defs = state.definitions.filter((d) => d.category === group.value);
                    return defs.length ? <optgroup key={group.value} label={group.label}>{defs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup> : null;
                  })}
                </select>
              </label>
              {selectedDefinition?.category === 'dementia' && (
                <label className="mt-3 block"><span className={fieldLabel}>Stage (optional)</span><input value={newDiagnosis.stage} maxLength={50} onChange={(event) => setNewDiagnosis((s) => ({ ...s, stage: event.target.value }))} placeholder="e.g. Moderate" className={inputClass} /></label>
              )}
              {selectedDefinition?.category === 'post_stroke' && (
                <label className="mt-3 block"><span className={fieldLabel}>Affected side (optional)</span>
                  <select value={newDiagnosis.affectedSide} onChange={(event) => setNewDiagnosis((s) => ({ ...s, affectedSide: event.target.value }))} className={inputClass}>
                    <option value="">Not specified</option><option value="left">Left</option><option value="right">Right</option><option value="bilateral">Bilateral</option>
                  </select>
                </label>
              )}
              <label className="mt-3 block"><span className={fieldLabel}>Notes (optional)</span><input value={newDiagnosis.notes} onChange={(event) => setNewDiagnosis((s) => ({ ...s, notes: event.target.value }))} className={inputClass} /></label>
              <div className="mt-3 flex justify-end">
                <button onClick={addDiagnosis} disabled={!selectedDefinition || !!busy} className={primaryButton}>{busy === 'add' ? 'Adding…' : 'Add Diagnosis'}</button>
              </div>
            </div>
          </section>

          <ErrorNote>{error}</ErrorNote>
          <div className="flex justify-end border-t border-coral-soft pt-4">
            <button onClick={close} className={secondaryButton}>Done</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

