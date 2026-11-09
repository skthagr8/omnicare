'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, addMinutes, endOfDay, format, isSameDay, startOfDay } from 'date-fns';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Users, X } from 'lucide-react';
import { apiClient } from '../../services/api';

// --- Config ---
const HOUR_WIDTH = 120; // px per hour column
const MIN_START_HOUR = 7; // grid always shows at least 07:00–19:00 (local time)
const MIN_END_HOUR = 19;
const DURATION_OPTIONS = [30, 45, 60, 90, 120, 180, 240];

// Keys match the backend AcuityLevel enum; 'none' = no current acuity tier.
export const ACUITY_STYLES = {
  red: { label: 'High acuity', edge: 'border-l-rose-400', fill: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  amber: { label: 'Medium acuity', edge: 'border-l-amber-400', fill: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  green: { label: 'Low acuity', edge: 'border-l-emerald-400', fill: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  none: { label: 'Not assessed', edge: 'border-l-slate-300', fill: 'bg-cream', text: 'text-slate-600', dot: 'bg-slate-300' },
};

const VISIT_STATUS = {
  scheduled: { label: 'Scheduled', className: '' },
  in_progress: { label: 'In progress', className: 'ring-2 ring-sky-400/60' },
  completed: { label: 'Completed', className: 'opacity-60' },
  cancelled: { label: 'Cancelled', className: 'opacity-40 line-through' },
};

const CAREGIVER_STATUS = {
  available: 'Available',
  en_route: 'En-route',
  in_service: 'In-service',
  emergency: 'Emergency',
  off_shift: 'Off shift',
};

const acuityStyle = (level) => ACUITY_STYLES[level] ?? ACUITY_STYLES.none;
const initials = (name) => (name || '?').split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const hm = (date) => format(date, 'HH:mm');

function errorMessage(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map((d) => d?.msg?.replace(/^Value error, /, '')).filter(Boolean);
    if (messages.length) return messages.join(' ');
  }
  return err?.response ? fallback : 'Unable to reach the server. Check your connection and try again.';
}

function currentAcuity(tiers, now = Date.now()) {
  const tier = tiers
    .filter((t) => new Date(t.effective_from).getTime() <= now && (!t.effective_to || new Date(t.effective_to).getTime() > now))
    .sort((a, b) => new Date(b.effective_from) - new Date(a.effective_from))[0];
  return tier?.level ?? null;
}

// --- Data ---
/**
 * Day schedule built from existing routes:
 *   GET /scheduling/sessions                     -> every visit (client_id, caregiver_id, times, status)
 *   GET /caregivers                              -> caregiver name + live status
 *   GET /clients/{id}, /clients/{id}/acuity-tiers -> only for clients visible on the selected day (cached)
 */
export function useSchedule(day) {
  const [base, setBase] = useState({ sessions: [], caregivers: new Map(), loading: true, error: '' });
  const [clients, setClients] = useState(new Map()); // client_id -> { full_name, acuity }
  const [reloadKey, setReloadKey] = useState(0);
  const requested = useRef(new Set());

  useEffect(() => {
    const controller = new AbortController();
    setBase((b) => ({ ...b, loading: true, error: '' }));
    const get = (url) => apiClient.get(url, { signal: controller.signal }).then(({ data }) => data);
    Promise.all([get('/scheduling/sessions'), get('/caregivers')])
      .then(([sessions, caregivers]) => setBase({
        sessions: sessions.map((s) => ({ ...s, start: new Date(s.scheduled_start), end: new Date(s.scheduled_end) })),
        caregivers: new Map(caregivers.map((c) => [c.user_id, c])),
        loading: false,
        error: '',
      }))
      .catch((err) => !controller.signal.aborted && setBase((b) => ({ ...b, loading: false, error: errorMessage(err, 'Unable to load the schedule.') })));
    return () => controller.abort();
  }, [reloadKey]);

  const daySessions = useMemo(() => {
    const from = startOfDay(day);
    const to = endOfDay(day);
    return base.sessions.filter((s) => s.start <= to && s.end >= from).sort((a, b) => a.start - b.start);
  }, [base.sessions, day]);

  // Look up names/acuity only for clients on the visible day.
  useEffect(() => {
    const missing = [...new Set(daySessions.map((s) => s.client_id))].filter((id) => !requested.current.has(id));
    if (!missing.length) return;
    missing.forEach((id) => requested.current.add(id));
    Promise.all(missing.map(async (id) => {
      const [client, tiers] = await Promise.allSettled([
        apiClient.get(`/clients/${id}`).then(({ data }) => data),
        apiClient.get(`/clients/${id}/acuity-tiers`).then(({ data }) => data),
      ]);
      return [id, {
        full_name: client.status === 'fulfilled' ? client.value.full_name : 'Unknown client',
        acuity: tiers.status === 'fulfilled' ? currentAcuity(tiers.value) : null,
      }];
    })).then((entries) => setClients((current) => new Map([...current, ...entries])));
  }, [daySessions]);

  const reload = useCallback(() => {
    requested.current = new Set();
    setClients(new Map());
    setReloadKey((k) => k + 1);
  }, []);

  // Sorted distinct local days that have visits, for "previous / next day with visits".
  const visitDays = useMemo(
    () => [...new Set(base.sessions.map((s) => startOfDay(s.start).getTime()))].sort((a, b) => a - b),
    [base.sessions],
  );

  return { ...base, daySessions, clients, visitDays, reload };
}

// --- SchedulingGrid ---
function VisitBlock({ visit, client, rangeStart, onSelect }) {
  const style = acuityStyle(client?.acuity);
  const status = VISIT_STATUS[visit.status] ?? VISIT_STATUS.scheduled;
  const hoursFromStart = (visit.displayStart - rangeStart) / 3_600_000;
  const hours = Math.max((visit.displayEnd - visit.displayStart) / 3_600_000, 0.25);
  return (
    <button
      type="button"
      onClick={() => onSelect(visit)}
      title={`${client?.full_name ?? 'Loading…'} · ${hm(visit.start)}–${hm(visit.end)} · ${status.label}`}
      className={`absolute inset-y-1.5 overflow-hidden rounded-lg border border-coral-soft border-l-4 px-3 py-2 text-left shadow-sm transition-shadow hover:shadow-md ${style.edge} ${style.fill} ${status.className}`}
      style={{ left: hoursFromStart * HOUR_WIDTH + 4, width: hours * HOUR_WIDTH - 8 }}
    >
      <p className={`truncate text-xs font-semibold ${style.text}`}>{client?.full_name ?? '…'}</p>
      <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-slate-500"><Clock className="h-3 w-3 shrink-0" />{hm(visit.start)}–{hm(visit.end)} · {status.label}</p>
    </button>
  );
}

export function SchedulingGrid({ day, rows, clients, onSelectVisit }) {
  // Hour range: at least 07:00–19:00, widened to fit every visit on the day.
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const visits = rows.flatMap((r) => r.visits);
  const earliest = Math.min(MIN_START_HOUR, ...visits.map((v) => (v.start < dayStart ? 0 : v.start.getHours())));
  const latest = Math.max(MIN_END_HOUR, ...visits.map((v) => (v.end >= dayEnd ? 24 : Math.ceil(v.end.getHours() + v.end.getMinutes() / 60))));
  const hours = Array.from({ length: latest - earliest }, (_, i) => earliest + i);
  const rangeStart = addMinutes(dayStart, earliest * 60);
  const gridWidth = hours.length * HOUR_WIDTH;

  return (
    <section className="min-w-0 flex-1 overflow-auto rounded-2xl border border-coral-soft bg-white shadow-sm">
      <div style={{ width: 210 + gridWidth }}>
        <div className="sticky top-0 z-10 flex border-b border-coral-soft bg-white">
          <div className="sticky left-0 z-10 flex w-52.5 shrink-0 items-center border-r border-coral-soft bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Caregiver</div>
          {hours.map((h) => (
            <div key={h} style={{ width: HOUR_WIDTH }} className="shrink-0 border-r border-coral-soft px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {format(addMinutes(dayStart, h * 60), 'h a')}
            </div>
          ))}
        </div>
        <div className="divide-y divide-coral-soft">
          {rows.map(({ caregiver, visits: rowVisits }) => (
            <div key={caregiver.id} className="flex min-h-20">
              <div className="sticky left-0 z-5 flex w-52.5 shrink-0 items-center gap-3 border-r border-coral-soft bg-cream px-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 text-[10px] font-semibold text-teal">{initials(caregiver.full_name)}</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-700">{caregiver.full_name || 'Unknown caregiver'}</p>
                  <p className="mt-0.5 text-[9px] uppercase tracking-wide text-slate-400">{CAREGIVER_STATUS[caregiver.status] ?? 'Unknown'} · {rowVisits.length} visit{rowVisits.length === 1 ? '' : 's'}</p>
                </div>
              </div>
              <div
                className="relative shrink-0"
                style={{ width: gridWidth, backgroundImage: 'linear-gradient(to right, #fff6ee 1px, transparent 1px)', backgroundSize: `${HOUR_WIDTH}px 100%` }}
              >
                {rowVisits.map((visit) => (
                  <VisitBlock key={visit.id} visit={visit} client={clients.get(visit.client_id)} rangeStart={rangeStart} onSelect={onSelectVisit} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Group a day's visits into caregiver rows, clipped to the day for drawing. */
export function buildRows(day, daySessions, caregivers) {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const rows = new Map();
  daySessions.forEach((s) => {
    const caregiver = caregivers.get(s.caregiver_id);
    const key = s.caregiver_id;
    if (!rows.has(key)) {
      rows.set(key, {
        caregiver: { id: key, full_name: caregiver?.full_name ?? null, status: caregiver?.status ?? null },
        visits: [],
      });
    }
    rows.get(key).visits.push({ ...s, displayStart: s.start < dayStart ? dayStart : s.start, displayEnd: s.end > dayEnd ? dayEnd : s.end });
  });
  return [...rows.values()].sort((a, b) => (a.caregiver.full_name || '').localeCompare(b.caregiver.full_name || ''));
}

// --- ScheduleLegend ---
export function ScheduleLegend({ caregiverCount, visitCount }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500">
      {Object.entries(ACUITY_STYLES).map(([key, s]) => (
        <span key={key} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />{s.label}</span>
      ))}
      <span className="h-3 w-px bg-cream-deep" />
      <span>Faded = completed · Ring = in progress</span>
      <span className="ml-auto flex items-center gap-1.5 font-semibold text-teal"><Users className="h-3.5 w-3.5" />{caregiverCount} caregiver{caregiverCount === 1 ? '' : 's'} · {visitCount} visit{visitCount === 1 ? '' : 's'}</span>
    </div>
  );
}

// --- DayNavigator ---
export function DayNavigator({ day, onChange, visitDays }) {
  const dayMs = startOfDay(day).getTime();
  const prev = [...visitDays].reverse().find((d) => d < dayMs);
  const next = visitDays.find((d) => d > dayMs);
  const navButton = 'flex h-8 items-center gap-1 rounded-lg border border-coral-soft px-2 text-xs font-semibold text-slate-600 hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => prev && onChange(new Date(prev))} disabled={!prev} className={navButton} title="Previous day with visits"><ChevronLeft className="h-3.5 w-3.5" /><ChevronLeft className="-ml-2.5 h-3.5 w-3.5" /></button>
      <button onClick={() => onChange(addDays(day, -1))} className={navButton} title="Previous day"><ChevronLeft className="h-3.5 w-3.5" /></button>
      <button onClick={() => onChange(new Date())} disabled={isSameDay(day, new Date())} className={navButton}>Today</button>
      <input
        type="date"
        aria-label="Schedule date"
        value={format(day, 'yyyy-MM-dd')}
        onChange={(event) => event.target.value && onChange(new Date(`${event.target.value}T00:00:00`))}
        className="h-8 rounded-lg border border-coral-soft px-2 text-xs text-slate-700 outline-none focus:border-teal"
      />
      <button onClick={() => onChange(addDays(day, 1))} className={navButton} title="Next day"><ChevronRight className="h-3.5 w-3.5" /></button>
      <button onClick={() => next && onChange(new Date(next))} disabled={!next} className={navButton} title="Next day with visits"><ChevronRight className="h-3.5 w-3.5" /><ChevronRight className="-ml-2.5 h-3.5 w-3.5" /></button>
    </div>
  );
}

// --- Modal shell ---
function Modal({ eyebrow, title, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/70 bg-white p-6 shadow-[0_20px_60px_-18px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal">{eyebrow}</p><h2 className="mt-1 text-lg font-semibold text-ink">{title}</h2></div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-cream-deep/50 hover:text-slate-600" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const fieldLabel = 'text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const inputClass = 'mt-2 w-full rounded-lg border border-coral-soft bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15';

// --- VisitDetailsModal ---
export function VisitDetailsModal({ visit, client, caregiver, onClose }) {
  const status = VISIT_STATUS[visit.status] ?? VISIT_STATUS.scheduled;
  const acuity = acuityStyle(client?.acuity);
  const rows = [
    ['Client', client?.full_name ?? '…'],
    ['Acuity', acuity.label],
    ['Caregiver', caregiver?.full_name ?? 'Unknown caregiver'],
    ['Scheduled', `${format(visit.start, 'EEE d MMM yyyy, HH:mm')} – ${hm(visit.end)}`],
    ['Status', status.label],
    ...(visit.check_in_at ? [['Checked in', format(new Date(visit.check_in_at), 'd MMM, HH:mm')]] : []),
    ...(visit.check_out_at ? [['Checked out', format(new Date(visit.check_out_at), 'd MMM, HH:mm')]] : []),
  ];
  return (
    <Modal eyebrow="Visit" title={client?.full_name ?? 'Visit details'} onClose={onClose}>
      <dl className="mt-5 divide-y divide-coral-soft text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2.5"><dt className="text-slate-400">{label}</dt><dd className="text-right font-medium text-slate-700">{value}</dd></div>
        ))}
      </dl>
    </Modal>
  );
}

// --- AssignVisitModal ---
/**
 * Creates a visit via POST /scheduling/sessions.
 * Clients come from GET /scheduling/patients (clients with visits); caregivers from GET /caregivers.
 * Conflicts are previewed locally and enforced by the backend (409).
 */
export function AssignVisitModal({ defaultDay, sessions, caregivers, onClose, onAssigned }) {
  const [clients, setClients] = useState({ list: [], loading: true, error: '' });
  const [clientId, setClientId] = useState('');
  const [caregiverId, setCaregiverId] = useState('');
  const [date, setDate] = useState(format(defaultDay, 'yyyy-MM-dd'));
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    apiClient.get('/scheduling/patients', { signal: controller.signal })
      .then(({ data }) => setClients({ list: data.filter((c) => c.is_active), loading: false, error: '' }))
      .catch((err) => !controller.signal.aborted && setClients({ list: [], loading: false, error: errorMessage(err, 'Unable to load clients.') }));
    return () => controller.abort();
  }, []);

  const caregiverList = useMemo(
    () => [...caregivers.values()].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')),
    [caregivers],
  );

  const start = date && time ? new Date(`${date}T${time}:00`) : null;
  const end = start ? addMinutes(start, duration) : null;
  const conflict = start && caregiverId
    ? sessions.find((s) => s.caregiver_id === caregiverId && ['scheduled', 'in_progress'].includes(s.status) && s.start < end && s.end > start)
    : null;
  const inPast = start && start < new Date();

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiClient.post('/scheduling/sessions', {
        client_id: clientId,
        caregiver_id: caregiverId,
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
      });
      const clientName = clients.list.find((c) => c.id === clientId)?.full_name ?? 'client';
      onAssigned(start, `Visit with ${clientName} scheduled for ${format(start, 'd MMM, HH:mm')}.`);
    } catch (err) {
      setError(errorMessage(err, 'Unable to assign the visit.'));
      setSaving(false);
    }
  };

  return (
    <Modal eyebrow="Clinical Scheduling" title="Assign New Visit" onClose={onClose}>
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <label>
          <span className={fieldLabel}>Client</span>
          <select required value={clientId} onChange={(event) => setClientId(event.target.value)} className={inputClass} disabled={clients.loading}>
            <option value="">{clients.loading ? 'Loading clients…' : 'Select a client…'}</option>
            {clients.list.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
          {clients.error && <p className="mt-1 text-xs text-rose-600">{clients.error}</p>}
        </label>
        <label>
          <span className={fieldLabel}>Caregiver</span>
          <select required value={caregiverId} onChange={(event) => setCaregiverId(event.target.value)} className={inputClass}>
            <option value="">Select a caregiver…</option>
            {caregiverList.map((c) => <option key={c.user_id} value={c.user_id}>{c.full_name || c.user_id} · {CAREGIVER_STATUS[c.status] ?? c.status}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label><span className={fieldLabel}>Date</span><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></label>
          <label><span className={fieldLabel}>Start</span><input required type="time" value={time} onChange={(event) => setTime(event.target.value)} className={inputClass} /></label>
          <label><span className={fieldLabel}>Duration</span>
            <select value={duration} onChange={(event) => setDuration(Number(event.target.value))} className={inputClass}>
              {DURATION_OPTIONS.map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`}</option>)}
            </select>
          </label>
        </div>
        {start && <p className="text-xs text-slate-500">{format(start, 'EEE d MMM yyyy')} · {hm(start)}–{hm(end)} (your local time)</p>}

        {inPast && <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />This time is in the past.</p>}
        {conflict && (
          <p className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span><span className="font-semibold">Schedule conflict:</span> this caregiver already has a visit {format(conflict.start, 'd MMM, HH:mm')}–{hm(conflict.end)}.</span>
          </p>
        )}
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-coral-soft px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-cream">Cancel</button>
          <button type="submit" disabled={!clientId || !caregiverId || !start || !!conflict || saving} className="rounded-xl bg-teal px-4 py-2 text-xs font-semibold text-white hover:bg-[#1b8a7f] disabled:cursor-not-allowed disabled:bg-slate-300">{saving ? 'Assigning…' : 'Assign Visit'}</button>
        </div>
      </form>
    </Modal>
  );
}

// --- Toast ---
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

