'use client';

import { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Activity, AlertTriangle, Brain, CheckCircle2, Download, Play, RefreshCw, Sparkles, Users } from 'lucide-react';
import {
  ConditionComparison,
  Methodology,
  PatientRiskDrawer,
  RateByAge,
  RiskFilters,
  RiskTable,
  SeverityDistribution,
  StatTile,
  applyFilters,
  exportCsv,
  summarise,
  useRiskPanel,
} from '../../../components/risk-panel/RiskPanel';

const INITIAL_FILTERS = { query: '', severity: 'All', age: 'All', condition: 'All', sort: 'risk' };
const rate = (v) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(3)}`);

export default function RiskPanelPage() {
  const { data, loading, error, reload, run, running, runResult, clearRunResult } = useRiskPanel();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [selectedId, setSelectedId] = useState(null);

  const patients = useMemo(() => data?.patients ?? [], [data]);
  const summary = useMemo(() => summarise(patients), [patients]);
  const visible = useMemo(() => applyFilters(patients, filters), [patients, filters]);
  const selected = patients.find((p) => p.id === selectedId) ?? null;
  const closeDrawer = useCallback(() => setSelectedId(null), []);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        {error ? (
          <div className="text-center">
            <p className="text-sm text-rose-600">{error}</p>
            <button onClick={() => reload()} className="mt-3 rounded-lg border border-coral-soft px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-cream">Retry</button>
          </div>
        ) : <p className="text-sm text-slate-400">{loading ? 'Loading risk panel…' : ''}</p>}
      </div>
    );
  }

  const { engine } = data;
  const needsRun = summary.missing > 0;

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-coral-soft bg-[#fffaf5] shadow-sm">
      <main className="mx-auto w-full max-w-7xl space-y-6 px-8 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-teal"><Sparkles className="h-3.5 w-3.5" />AI Clinical Engine · Cognitive LSTM {engine.version}</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Cognitive Decline Risk Panel</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">Predicted change in cognitive score for every patient, ranked so the highest-risk patients are reviewed first.</p>
            {summary.lastRun && <p className="mt-1 text-[11px] text-slate-400">Last model run {format(new Date(summary.lastRun), 'd MMM yyyy, HH:mm')}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => reload()} disabled={loading} title="Reload" className="flex h-9 w-9 items-center justify-center rounded-2xl border border-coral-soft bg-white text-slate-500 hover:bg-cream disabled:opacity-40 shadow-sm"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => exportCsv(visible)} disabled={!visible.length} className="flex items-center gap-1.5 rounded-lg border border-coral-soft bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-cream disabled:opacity-40"><Download className="h-3.5 w-3.5" />Export CSV</button>
            <button onClick={() => run('all')} disabled={running || summary.eligible === 0} className="flex items-center gap-1.5 rounded-lg border border-coral-soft bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-cream disabled:opacity-40"><Activity className="h-3.5 w-3.5" />Re-score all</button>
            <button onClick={() => run('missing_or_outdated')} disabled={running || !needsRun} className="flex items-center gap-1.5 rounded-xl bg-teal px-3 py-2 text-xs font-semibold text-white hover:bg-[#1b8a7f] disabled:bg-slate-300"><Play className="h-3.5 w-3.5" />{running ? 'Running model…' : `Run model${needsRun ? ` (${summary.missing})` : ''}`}</button>
          </div>
        </div>

        {needsRun && !running && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{summary.missing} eligible patient{summary.missing === 1 ? ' has' : 's have'} no current prediction{summary.outdated ? ` (${summary.outdated} from an older model version)` : ''}.</span>
            <button onClick={() => run('missing_or_outdated')} className="rounded-2xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-100 shadow-sm">Score them now</button>
          </div>
        )}
        {runResult && (
          <div role="status" className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${runResult.ok ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
            <span className="flex items-center gap-2">{runResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{runResult.message}</span>
            <button onClick={clearRunResult} className="text-xs font-semibold opacity-70 hover:opacity-100">Dismiss</button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile icon={Users} label="Patients scored" value={`${summary.scored} / ${summary.eligible}`} sub={`${summary.total} patients`} />
          <StatTile icon={AlertTriangle} tone="bg-amber-50 text-amber-600" label="Need follow-up (mild or worse)" value={summary.followUp} sub={summary.scored ? `${Math.round((summary.followUp / summary.scored) * 100)}% of scored patients` : 'No predictions yet'} />
          <StatTile icon={Brain} label="Highest predicted decline" value={rate(summary.highest?.latest.decline_rate)} sub={summary.highest ? summary.highest.full_name : '—'} />
          <StatTile icon={Activity} tone="bg-cream-deep/50 text-slate-600" label="Average predicted rate" value={rate(summary.average)} sub="Per survey round · low confidence" />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr_0.9fr]">
          <SeverityDistribution summary={summary} />
          <RateByAge summary={summary} bands={engine.bands} />
          <ConditionComparison summary={summary} />
        </div>

        {/* Patients */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">Patient population <span className="rounded-full bg-cream-deep/50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{visible.length} of {patients.length}</span></h2>
            <RiskFilters filters={filters} onChange={setFilters} counts={summary.counts} />
          </div>
          <RiskTable patients={visible} bands={engine.bands} onSelect={(p) => setSelectedId(p.id)} />
        </section>

        <Methodology engine={engine} />
      </main>

      {selected && <PatientRiskDrawer patient={selected} engine={engine} onClose={closeDrawer} />}
    </div>
  );
}
