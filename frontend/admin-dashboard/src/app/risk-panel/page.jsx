'use client';

import { useState } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  Download,
  History,
  Sparkles,
  TriangleAlert,
  Activity,
  Info,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import Sidebar from '../../components/layout/Sidebar';

const RISK_STYLES = {
  high: { badge: 'bg-rose-50 text-rose-600 border-rose-200', label: 'High Risk', color: '#B4495F' },
  medium: { badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Medium Risk', color: '#C08A2E' },
  low: { badge: 'bg-teal-50 text-teal-700 border-teal-200', label: 'Low Risk', color: '#3F8F86' },
  exempt: { badge: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Exempt', color: '#94A3B8' },
};

const PATIENTS = [
  {
    uid: 'P-9821',
    name: 'Eleanor Vance',
    risk: 'high',
    score: 88,
    trend: [40, 52, 48, 63, 71, 79, 88],
    falls: 3,
    factor: 'Neurological Impairment',
  },
  {
    uid: 'P-4432',
    name: 'Arthur Miller',
    risk: 'medium',
    score: 42,
    trend: [22, 26, 24, 33, 37, 39, 42],
    falls: 1,
    factor: 'Medication Side Effects',
  },
  {
    uid: 'P-1128',
    name: 'Rosemary Clarke',
    risk: 'low',
    score: 12,
    trend: [18, 16, 15, 14, 13, 12, 12],
    falls: 0,
    factor: 'Stable Mobility',
  },
  {
    uid: 'P-1567',
    name: 'Julian Thorne',
    risk: 'high',
    score: 94,
    trend: [55, 61, 68, 74, 82, 89, 94],
    falls: 2,
    factor: 'Orthostatic Hypotension',
  },
  {
    uid: 'P-8012',
    name: 'Sarah Jenkins',
    risk: 'exempt',
    score: null,
    trend: [],
    falls: null,
    factor: null,
  },
  {
    uid: 'P-8821',
    name: 'Thomas Wu',
    risk: 'low',
    score: 28,
    trend: [40, 37, 34, 32, 30, 29, 28],
    falls: 0,
    factor: 'Improving Physical Rehab',
  },
];

const FILTERS = ['All', 'High', 'Medium', 'Low'];

function FallDots({ count }) {
  if (count === null) {
    return <span className="text-[11px] text-slate-400">None Recorded</span>;
  }
  if (count === 0) {
    return <span className="text-[11px] text-slate-400">None Recorded</span>;
  }
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-rose-300" />
      ))}
    </span>
  );
}

function RiskCard({ patient }) {
  const style = RISK_STYLES[patient.risk];
  const scored = patient.risk !== 'exempt';
  const showEscalation = patient.risk === 'high' || patient.risk === 'medium';

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-[#2B2E33]">{patient.name}</p>
          <p className="text-[11px] text-slate-400">UID: {patient.uid}</p>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}
        >
          {style.label}
        </span>
      </div>

      {scored ? (
        <>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Predictive Score
              </p>
              <p className="text-3xl font-bold leading-none" style={{ color: style.color }}>
                {patient.score}
                <span className="ml-0.5 text-xs font-medium text-slate-400">/100</span>
              </p>
            </div>
            <div className="flex flex-col items-end">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                7-Day Trend
              </p>
              <div className="h-8 w-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={patient.trend.map((v) => ({ v }))}>
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={style.color}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
            <span>Fall Incidents (MTD)</span>
            <FallDots count={patient.falls} />
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            Factor: {patient.factor}
          </div>

          {showEscalation && (
            <button className="mt-4 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50">
              Recommend Escalation
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      ) : (
        <div className="mt-6 flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 py-8">
          <p className="text-xs italic text-slate-400">Not applicable — outside model scope</p>
        </div>
      )}
    </div>
  );
}

export default function RiskPanelPage() {
  const [filter, setFilter] = useState('All');

  const visible = PATIENTS.filter((p) => {
    if (filter === 'All') return true;
    return p.risk === filter.toLowerCase();
  });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAFAF8]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <p className="text-sm font-medium text-slate-500">
            Central Hospital <span className="mx-1 text-slate-300">/</span>
            <span className="text-slate-800">Patient Workflows</span>
          </p>
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Systems Normal
          </span>
          <span className="text-xs text-slate-400">14:22 UTC</span>

          <div className="ml-auto flex items-center gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search patients, rooms..."
                className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-[#0F6B72] focus:bg-white"
              />
            </div>
            <button className="relative text-slate-400 hover:text-slate-600">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F6B72] text-xs font-semibold text-white">
                SC
              </span>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-slate-800">Dr. Sarah Chen</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Chief Surgeon</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-8 py-8">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#0F6B72]">
            <Sparkles className="h-3.5 w-3.5" />
            AI Clinical Engine v4.2
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#2B2E33]">Predictive Risk Analysis</h1>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Advanced patient vulnerability monitoring using real-time mobility data, medication
                adherence, and clinical history.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
              <button className="flex items-center gap-1.5 rounded-lg bg-[#0F6B72] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0d5b61]">
                <History className="h-3.5 w-3.5" />
                Model History
              </button>
            </div>
          </div>

          {/* Stat row */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                <TriangleAlert className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xl font-bold text-[#2B2E33]">2</p>
                <p className="text-[11px] text-slate-400">Critical Risks</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-[#0F6B72]">
                <Activity className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xl font-bold text-[#2B2E33]">44</p>
                <p className="text-[11px] text-slate-400">Avg Risk Score</p>
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Facility Risk Threshold</span>
                <span className="font-semibold text-[#0F6B72]">82% System Health</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[82%] rounded-full bg-[#0F6B72]" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Filter By
            </span>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-[#0F6B72]/10 text-[#0F6B72]'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {f}
              </button>
            ))}
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400">
              <Info className="h-3.5 w-3.5" />
              Model updated at 14:45 UTC
            </span>
          </div>

          {/* Section heading */}
          <div className="mt-8 flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#2B2E33]">Patient Population Analysis</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              {visible.length} Patients
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-5">
            {visible.map((patient) => (
              <RiskCard key={patient.uid} patient={patient} />
            ))}
          </div>

          {/* Footer notes */}
          <div className="mt-10 grid grid-cols-3 gap-8 border-t border-slate-200 pt-6 text-xs text-slate-500">
            <div>
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-[#0F6B72]">
                <BarChart3 className="h-3.5 w-3.5" />
                Predictive Methodology
              </p>
              <p>
                Risk scores are generated via ensemble modeling of gait stability sensors, EHR
                diagnosis flags, and recent behavioral anomalies.
              </p>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-amber-600">
                <TriangleAlert className="h-3.5 w-3.5" />
                Actionable Escalation
              </p>
              <p>
                The Recommend Escalation trigger bypasses standard queuing, notifying the floor
                lead and facility administrator immediately via secure push notification and H7
                system alert.
              </p>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                Model Confidence
              </p>
              <p>
                Current model accuracy is rated at 94.2% for fall prediction. Exempt cases involve
                patients under pediatric care or with insufficient historical data for accurate
                scoring.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-[11px] text-slate-400">
            <span>AI Inference: Active &nbsp;•&nbsp; Data Privacy: HIPAA Compliant</span>
            <span>
              © 2026 OmniCare Operations. All analytical results are for clinical decision support
              and should be verified by a medical professional.
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}
