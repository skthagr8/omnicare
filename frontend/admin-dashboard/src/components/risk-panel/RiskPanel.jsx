'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  Minus,
  Search,
  ShieldCheck,
  Table2,
  TrendingUp,
  X,
} from 'lucide-react';
import { apiClient } from '../../services/api';

// --- Config ---
// Severity is an ordered *state*, so it uses the reserved status palette, always paired with icon + label.
export const SEVERITY = {
  significant_decline: { label: 'Significant decline', short: 'Significant', color: '#e11d48', icon: AlertOctagon, rank: 0 },
  moderate_decline: { label: 'Moderate decline', short: 'Moderate', color: '#f47b4f', icon: AlertTriangle, rank: 1 },
  mild_decline: { label: 'Mild decline', short: 'Mild', color: '#f59e0b', icon: TrendingUp, rank: 2 },
  stable: { label: 'Stable', short: 'Stable', color: '#94a3b8', icon: Minus, rank: 3 },
  improvement: { label: 'Improvement', short: 'Improvement', color: '#22a699', icon: ArrowDownRight, rank: 4 },
};
const SEVERITY_ORDER = Object.keys(SEVERITY);
const SERIES_COLOR = '#22a699'; // single-series bars
const AGE_GROUPS = ['Under 65', '65–69', '70–74', '75–79', '80–84', '85–89', '90+'];
const CONDITION_FILTERS = [
  { value: 'All', label: 'All conditions' },
  { value: 'dementia', label: 'Dementia' },
  { value: 'stroke', label: 'Post-stroke' },
  { value: 'neither', label: 'Neither' },
];

const rate = (value) => (value == null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(3)}`);
const severityOf = (patient) => (patient.latest && !patient.latest.outdated ? patient.latest.severity : null);

function errorMessage(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  return err?.response ? fallback : 'Unable to reach the server. Check your connection and try again.';
}

// --- Data ---
/** GET /ai/risk-panel (read-only) and POST /ai/risk-panel/run (scores patients, then reloads). */
export function useRiskPanel() {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);

  const load = useCallback(async (signal) => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data } = await apiClient.get('/ai/risk-panel', { signal });
      setState({ data, loading: false, error: '' });
    } catch (err) {
      if (!signal?.aborted) setState((s) => ({ ...s, loading: false, error: errorMessage(err, 'Unable to load the risk panel.') }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const run = useCallback(async (scope) => {
    setRunning(true);
    setRunResult(null);
    try {
      const { data } = await apiClient.post('/ai/risk-panel/run', { scope });
      setRunResult({ ok: true, message: `${data.scored} patient${data.scored === 1 ? '' : 's'} scored with model ${data.model_version}.` });
      await load();
    } catch (err) {
      setRunResult({ ok: false, message: errorMessage(err, 'The model run failed.') });
    } finally {
      setRunning(false);
    }
  }, [load]);

  return { ...state, reload: load, run, running, runResult, clearRunResult: () => setRunResult(null) };
}

/** Panel-wide figures, computed from current (non-outdated) predictions. */
export function summarise(patients) {
  const scored = patients.filter((p) => severityOf(p));
  const eligible = patients.filter((p) => p.eligible);
  const counts = Object.fromEntries(SEVERITY_ORDER.map((k) => [k, 0]));
  scored.forEach((p) => { counts[p.latest.severity] += 1; });
  const avg = (list) => (list.length ? list.reduce((s, p) => s + p.latest.decline_rate, 0) / list.length : null);
  const highest = scored.reduce((best, p) => (!best || p.latest.decline_rate > best.latest.decline_rate ? p : best), null);
  const byAge = AGE_GROUPS.map((group) => {
    const list = scored.filter((p) => p.inputs.age_group === group);
    return { group, avg: avg(list), n: list.length };
  });
  const byCondition = [
    { label: 'Dementia', list: scored.filter((p) => p.inputs.dementia) },
    { label: 'Post-stroke', list: scored.filter((p) => p.inputs.stroke) },
    { label: 'Neither', list: scored.filter((p) => !p.inputs.dementia && !p.inputs.stroke) },
  ].map(({ label, list }) => ({ label, avg: avg(list), n: list.length }));
  const lastRun = scored.reduce((max, p) => (!max || p.latest.predicted_at > max ? p.latest.predicted_at : max), null);
  return {
    total: patients.length,
    eligible: eligible.length,
    scored: scored.length,
    missing: eligible.filter((p) => !severityOf(p)).length,
    outdated: eligible.filter((p) => p.latest?.outdated).length,
    ineligible: patients.length - eligible.length,
    followUp: counts.mild_decline + counts.moderate_decline + counts.significant_decline,
    counts,
    average: avg(scored),
    highest,
    byAge,
    byCondition,
    lastRun,
  };
}

// --- Shared UI ---
export function SeverityBadge({ severity, size = 'sm' }) {
  if (!severity) return <span className="text-xs italic text-slate-400">No prediction</span>;
  const s = SEVERITY[severity];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-coral-soft bg-white font-semibold text-slate-700 ${size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[11px]'}`}>
      <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: `${s.color}26`, color: s.color }}><Icon className="h-3 w-3" strokeWidth={2.5} /></span>
      {s.label}
    </span>
  );
}

/** Where a rate sits on the severity scale (−0.05 … 0.20), with band boundaries marked. */
function RateGauge({ value, bands }) {
  const min = -0.05;
  const max = 0.2;
  const pos = (v) => `${((Math.min(Math.max(v, min), max) - min) / (max - min)) * 100}%`;
  const cuts = bands.map((b) => b.min_rate).filter((v) => v != null);
  return (
    <div className="relative h-2 w-28 rounded-full bg-cream-deep/50" aria-hidden="true">
      {cuts.map((c) => <span key={c} className="absolute top-0 h-2 w-px bg-slate-300" style={{ left: pos(c) }} />)}
      {value != null && <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow" style={{ left: pos(value) }} />}
    </div>
  );
}

export function StatTile({ label, value, sub, icon: Icon, tone = 'text-teal bg-teal-50' }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-coral-soft bg-white p-4 shadow-sm">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-xl font-semibold text-ink">{value}</p>
        {sub && <p className="mt-0.5 truncate text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, table, children }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className="rounded-3xl border border-coral-soft bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h2 className="text-sm font-semibold text-ink">{title}</h2>{subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}</div>
        <button type="button" onClick={() => setShowTable((v) => !v)} className="flex items-center gap-1 rounded-md border border-coral-soft px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-cream" aria-pressed={showTable}>
          {showTable ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}{showTable ? 'Chart' : 'Table'}
        </button>
      </div>
      {showTable ? table : children}
    </section>
  );
}

function ChartTooltip({ active, payload, render }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-lg border border-coral-soft bg-white px-3 py-2 text-xs text-slate-700 shadow-lg">{render(payload[0].payload)}</div>;
}

const axisTick = { fontSize: 11, fill: '#64748b' };

// --- Charts ---
export function SeverityDistribution({ summary }) {
  const data = SEVERITY_ORDER.map((key) => ({ key, label: SEVERITY[key].short, count: summary.counts[key], color: SEVERITY[key].color }));
  return (
    <ChartCard
      title="Severity distribution"
      subtitle={`${summary.scored} patients with a current prediction`}
      table={(
        <table className="w-full text-xs"><thead><tr className="text-left text-[10px] uppercase tracking-wide text-slate-400"><th className="py-1.5">Severity</th><th className="py-1.5 text-right">Patients</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.key} className="border-t border-coral-soft"><td className="py-1.5"><SeverityBadge severity={d.key} /></td><td className="py-1.5 text-right font-semibold text-slate-700">{d.count}</td></tr>)}</tbody></table>
      )}
    >
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 8 }} barCategoryGap={6}>
            <XAxis type="number" allowDecimals={false} hide />
            <YAxis type="category" dataKey="label" width={92} tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: '#fff6ee' }} content={<ChartTooltip render={(d) => <><p className="font-semibold">{SEVERITY[d.key].label}</p><p>{d.count} patient{d.count === 1 ? '' : 's'}</p></>} />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18} minPointSize={2}>
              {data.map((d) => <Cell key={d.key} fill={d.color} />)}
              <LabelList dataKey="count" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#334155' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function RateByAge({ summary, bands }) {
  const mild = bands.find((b) => b.severity === 'mild_decline')?.min_rate ?? 0.03;
  const data = summary.byAge.filter((d) => d.n > 0);
  const top = Math.max(mild * 1.25, ...data.map((d) => d.avg ?? 0)) * 1.1;
  return (
    <ChartCard
      title="Average predicted decline by age group"
      subtitle="Positive = worsening cognitive score per survey round · dashed line = mild-decline threshold"
      table={(
        <table className="w-full text-xs"><thead><tr className="text-left text-[10px] uppercase tracking-wide text-slate-400"><th className="py-1.5">Age group</th><th className="py-1.5 text-right">Avg. rate</th><th className="py-1.5 text-right">Patients</th></tr></thead>
          <tbody>{summary.byAge.map((d) => <tr key={d.group} className="border-t border-coral-soft"><td className="py-1.5 text-slate-600">{d.group}</td><td className="py-1.5 text-right font-semibold text-slate-700">{rate(d.avg)}</td><td className="py-1.5 text-right text-slate-500">{d.n}</td></tr>)}</tbody></table>
      )}
    >
      <div className="h-52">
        {data.length === 0 ? <p className="py-16 text-center text-xs text-slate-400">No predictions yet.</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#fff6ee" />
              <XAxis dataKey="group" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis domain={[0, top]} tickFormatter={(v) => v.toFixed(3)} tick={axisTick} axisLine={false} tickLine={false} width={44} />
              <Tooltip cursor={{ fill: '#fff6ee' }} content={<ChartTooltip render={(d) => <><p className="font-semibold">Age {d.group}</p><p>Average rate {rate(d.avg)}</p><p className="text-slate-400">{d.n} patient{d.n === 1 ? '' : 's'}</p></>} />} />
              <ReferenceLine y={mild} stroke="#e11d48" strokeDasharray="4 4" label={{ value: `Mild decline (${mild})`, position: 'insideTopRight', fontSize: 10, fill: '#64748b' }} />
              <Bar dataKey="avg" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}

export function ConditionComparison({ summary }) {
  const max = Math.max(...summary.byCondition.map((c) => c.avg ?? 0), 0.0001);
  return (
    <section className="rounded-3xl border border-coral-soft bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">By recorded condition</h2>
      <p className="mt-0.5 text-[11px] text-slate-400">Average predicted rate; the model&apos;s only diagnosis inputs</p>
      <ul className="mt-4 space-y-3">
        {summary.byCondition.map((c) => (
          <li key={c.label}>
            <div className="flex items-baseline justify-between text-xs"><span className="text-slate-600">{c.label} <span className="text-slate-400">· {c.n}</span></span><span className="font-semibold text-slate-700">{rate(c.avg)}</span></div>
            <div className="mt-1 h-2 rounded-full bg-cream-deep/50"><div className="h-2 rounded-full" style={{ width: `${c.avg ? Math.max((c.avg / max) * 100, 2) : 0}%`, backgroundColor: SERIES_COLOR }} /></div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[10px] leading-relaxed text-slate-400">Counts overlap: a patient can have both conditions.</p>
    </section>
  );
}

// --- Patient table ---
function Delta({ patient }) {
  if (!severityOf(patient) || patient.previous_rate == null) return <span className="text-slate-300">—</span>;
  const d = patient.latest.decline_rate - patient.previous_rate;
  if (Math.abs(d) < 0.0005) return <span className="text-xs text-slate-400">No change</span>;
  const Icon = d > 0 ? ArrowUpRight : ArrowDownRight;
  return <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-700"><Icon className="h-3.5 w-3.5" />{rate(d)}</span>;
}

export function RiskTable({ patients, bands, onSelect }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-coral-soft bg-white shadow-sm">
      <table className="w-full min-w-[980px] text-left">
        <thead className="border-b border-coral-soft text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          <tr><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Model inputs</th><th className="px-4 py-3">Predicted rate</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Change</th><th className="px-4 py-3">Recommendation</th><th className="px-4 py-3">Predicted</th></tr>
        </thead>
        <tbody>
          {patients.map((p) => {
            const current = severityOf(p);
            return (
              <tr key={p.id} onClick={() => onSelect(p)} className="cursor-pointer border-b border-coral-soft last:border-0 hover:bg-teal-50/30">
                <td className="px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">{p.full_name}{!p.is_active && <span className="rounded-full bg-cream-deep/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-500 tracking-wide">Inactive</span>}</p>
                  <p className="text-[11px] text-slate-400">{p.age} yrs · {p.gender}</p>
                </td>
                <td className="px-4 py-3">
                  {p.eligible ? (
                    <div className="flex flex-wrap gap-1 text-[10px] font-medium">
                      <span className="rounded-full bg-cream-deep/50 px-2 py-0.5 text-slate-600">Age {p.inputs.age_group}</span>
                      {p.inputs.dementia && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">Dementia</span>}
                      {p.inputs.stroke && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">Post-stroke</span>}
                    </div>
                  ) : <span className="text-[11px] text-slate-400">No date of birth</span>}
                </td>
                <td className="px-4 py-3">
                  {current ? <div className="flex items-center gap-3"><span className="w-14 font-mono text-sm font-semibold text-slate-700">{rate(p.latest.decline_rate)}</span><RateGauge value={p.latest.decline_rate} bands={bands} /></div> : <span className="text-xs text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  {current ? <SeverityBadge severity={current} /> : p.eligible ? <span className="text-[11px] italic text-amber-700">{p.latest?.outdated ? 'Outdated – re-run' : 'Not yet scored'}</span> : <span className="text-[11px] text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3"><Delta patient={p} /></td>
                <td className="max-w-56 px-4 py-3 text-xs text-slate-600">{current ? p.latest.recommendation : ''}</td>
                <td className="px-4 py-3 text-[11px] text-slate-400" title={p.latest ? format(new Date(p.latest.predicted_at), 'd MMM yyyy, HH:mm') : ''}>{p.latest ? formatDistanceToNowStrict(new Date(p.latest.predicted_at), { addSuffix: true }) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {patients.length === 0 && <p className="px-6 py-14 text-center text-sm text-slate-400">No patients match the current filters.</p>}
    </div>
  );
}

// --- Patient detail drawer ---
export function PatientRiskDrawer({ patient, engine, onClose }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = severityOf(patient);
  const history = [...patient.history].reverse().map((h) => ({ ...h, when: format(new Date(h.predicted_at), 'd MMM HH:mm') }));
  const band = current ? engine.bands.find((b) => b.severity === current) : null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/20" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={`${patient.full_name} cognitive risk`} className="flex h-full w-full max-w-md flex-col bg-white shadow-[-20px_0_60px_-20px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between border-b border-coral-soft px-6 py-5">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal"><Brain className="h-3.5 w-3.5" />Cognitive decline risk</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{patient.full_name}</h2>
            <p className="text-[11px] text-slate-400">{patient.age} yrs · {patient.gender}{patient.caregiver_name ? ` · Caregiver: ${patient.caregiver_name}` : ''}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-cream-deep/50 hover:text-slate-600" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {!patient.eligible && <p className="rounded-lg border border-coral-soft bg-cream px-3 py-2.5 text-xs text-slate-600">{patient.ineligible_reason}</p>}

          {current && (
            <section className="rounded-xl border border-coral-soft p-4">
              <div className="flex items-center justify-between"><SeverityBadge severity={current} size="lg" /><span className="font-mono text-2xl font-semibold text-ink">{rate(patient.latest.decline_rate)}</span></div>
              <p className="mt-3 text-sm font-semibold text-slate-700">{patient.latest.recommendation}</p>
              <p className="mt-1 text-[11px] text-slate-400">Band: {band?.min_rate != null ? `> ${band.min_rate}` : ''}{band?.min_rate != null && band?.max_rate != null ? ' and ' : ''}{band?.max_rate != null ? `≤ ${band.max_rate}` : ''} · confidence {patient.latest.confidence} · {format(new Date(patient.latest.predicted_at), 'd MMM yyyy, HH:mm')}</p>
            </section>
          )}
          {patient.eligible && !current && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">{patient.latest?.outdated ? 'The stored prediction came from an older model version. Run the model to refresh it.' : 'This patient has not been scored yet. Run the model to generate a prediction.'}</p>}

          {patient.eligible && (
            <section>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">What the model used</h3>
              <dl className="divide-y divide-coral-soft rounded-xl border border-coral-soft text-sm">
                <div className="flex justify-between px-3 py-2"><dt className="text-slate-500">Age category</dt><dd className="font-medium text-slate-700">{patient.inputs.age_group}</dd></div>
                <div className="flex justify-between px-3 py-2"><dt className="text-slate-500">Stroke (active diagnosis)</dt><dd className="font-medium text-slate-700">{patient.inputs.stroke ? 'Yes' : 'No'}</dd></div>
                <div className="flex justify-between px-3 py-2"><dt className="text-slate-500">Dementia / Alzheimer&apos;s</dt><dd className="font-medium text-slate-700">{patient.inputs.dementia ? 'Yes' : 'No'}</dd></div>
              </dl>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">The other {engine.feature_count - engine.client_features.length} of {engine.feature_count} features (memory, mobility, sleep, falls, daily-living tasks…) come from a population average, because OmniCare does not record them yet. Recording them would raise confidence.</p>
            </section>
          )}

          {history.length > 1 && (
            <section>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Prediction history</h3>
              <div className="h-36 rounded-xl border border-coral-soft p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="#fff6ee" />
                    <XAxis dataKey="when" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => v.toFixed(3)} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={44} domain={['auto', 'auto']} />
                    <Tooltip content={<ChartTooltip render={(d) => <><p className="font-semibold">{d.when}</p><p>{rate(d.decline_rate)} · {SEVERITY[d.severity]?.label}</p><p className="text-slate-400">model {d.model_version}</p></>} />} />
                    <Line type="monotone" dataKey="decline_rate" stroke={SERIES_COLOR} strokeWidth={2} dot={{ r: 4, fill: SERIES_COLOR, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Care context</h3>
            <p className="text-xs text-slate-600">Acuity: <span className="font-semibold">{patient.acuity ? { red: 'High', amber: 'Medium', green: 'Low' }[patient.acuity] : 'Not assessed'}</span> · Active diagnoses: <span className="font-semibold">{patient.diagnoses.length || 'none'}</span></p>
            <Link href={`/patients?q=${encodeURIComponent(patient.full_name)}`} className="mt-3 inline-block text-xs font-semibold text-teal hover:underline">Open in Patients →</Link>
          </section>
        </div>
      </aside>
    </div>
  );
}

// --- Methodology ---
export function Methodology({ engine }) {
  return (
    <section className="grid gap-6 border-t border-coral-soft pt-6 text-xs leading-relaxed text-slate-500 md:grid-cols-2">
      <div>
        <p className="mb-1 flex items-center gap-1.5 font-semibold text-teal"><Brain className="h-3.5 w-3.5" />The model</p>
        <p>Bidirectional LSTM trained on the NHATS longitudinal ageing survey. It predicts the change in a patient&apos;s cognitive score between survey rounds: {engine.target_definition?.toLowerCase() ?? 'positive values mean worsening'}.</p>
      </div>
      <div>
        <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-600"><ShieldCheck className="h-3.5 w-3.5" />How to use it</p>
        <p>Clinical decision support only: it ranks who to review first and should be confirmed by a clinician. Thresholds: {engine.bands.filter((b) => b.min_rate != null).map((b) => `${SEVERITY[b.severity].short.toLowerCase()} > ${b.min_rate}`).join(', ')}.</p>
      </div>
    </section>
  );
}

// --- CSV export ---
export function exportCsv(patients) {
  const header = ['Patient', 'Age', 'Gender', 'Age group', 'Stroke', 'Dementia', 'Eligible', 'Decline rate', 'Severity', 'Recommendation', 'Confidence', 'Model version', 'Predicted at (UTC)'];
  const rows = patients.map((p) => {
    const cur = severityOf(p) ? p.latest : null;
    return [p.full_name, p.age, p.gender, p.inputs.age_group ?? '', p.inputs.stroke ? 'yes' : 'no', p.inputs.dementia ? 'yes' : 'no', p.eligible ? 'yes' : 'no',
      cur ? cur.decline_rate.toFixed(4) : '', cur ? SEVERITY[cur.severity].label : '', cur?.recommendation ?? '', cur?.confidence ?? '', cur?.model_version ?? '', cur ? new Date(cur.predicted_at).toISOString() : ''];
  });
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `cognitive-risk-${format(new Date(), 'yyyy-MM-dd')}.csv` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- Filters ---
export function RiskFilters({ filters, onChange, counts }) {
  const set = (key) => (event) => onChange({ ...filters, [key]: event.target.value });
  const select = 'rounded-full border border-coral-soft bg-white py-2 pl-3 pr-8 text-xs text-slate-600 outline-none focus:border-teal';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={filters.query} onChange={set('query')} type="search" aria-label="Search patients" placeholder="Search patients…" className="w-52 rounded-full border border-coral-soft bg-white py-2 pl-8 pr-3 text-xs text-slate-700 outline-none focus:border-teal" /></div>
      <select value={filters.severity} onChange={set('severity')} aria-label="Severity" className={select}>
        <option value="All">All severities</option>
        {SEVERITY_ORDER.map((k) => <option key={k} value={k}>{SEVERITY[k].label} ({counts[k]})</option>)}
        <option value="none">No current prediction</option>
      </select>
      <select value={filters.age} onChange={set('age')} aria-label="Age group" className={select}>
        <option value="All">All ages</option>{AGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <select value={filters.condition} onChange={set('condition')} aria-label="Condition" className={select}>
        {CONDITION_FILTERS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <select value={filters.sort} onChange={set('sort')} aria-label="Sort" className={select}>
        <option value="risk">Highest risk first</option><option value="name">Name</option><option value="age">Oldest first</option>
      </select>
    </div>
  );
}

export function applyFilters(patients, f) {
  const term = f.query.trim().toLowerCase();
  const list = patients.filter((p) => {
    const sev = severityOf(p);
    if (term && !p.full_name.toLowerCase().includes(term)) return false;
    if (f.severity === 'none' ? sev : f.severity !== 'All' && sev !== f.severity) return false;
    if (f.age !== 'All' && p.inputs.age_group !== f.age) return false;
    if (f.condition === 'dementia' && !p.inputs.dementia) return false;
    if (f.condition === 'stroke' && !p.inputs.stroke) return false;
    if (f.condition === 'neither' && (p.inputs.dementia || p.inputs.stroke)) return false;
    return true;
  });
  const score = (p) => (severityOf(p) ? p.latest.decline_rate : p.eligible ? -1 : -2);
  const sorters = {
    risk: (a, b) => score(b) - score(a) || a.full_name.localeCompare(b.full_name),
    name: (a, b) => a.full_name.localeCompare(b.full_name),
    age: (a, b) => b.age - a.age,
  };
  return list.sort(sorters[f.sort]);
}

