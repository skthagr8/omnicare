'use client';

import { ChevronRight, Info } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { RISK_STYLES } from './riskData';

function FallDots({ count }) {
  if (!count) return <span className="text-[11px] text-slate-400">None Recorded</span>;
  return <span className="flex items-center gap-1">{Array.from({ length: count }, (_, index) => <span key={index} className="h-1.5 w-1.5 rounded-full bg-rose-300" />)}</span>;
}

function TrendChart({ patient, color }) {
  return (
    <div className="flex flex-col items-end">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">7-Day Trend</p>
      <div className="h-8 w-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={patient.trend.map((value) => ({ value }))}>
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ScoredRisk({ patient, style }) {
  const showEscalation = patient.risk === 'high' || patient.risk === 'medium';
  return (
    <>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Predictive Score</p>
          <p className="text-3xl font-bold leading-none" style={{ color: style.color }}>{patient.score}<span className="ml-0.5 text-xs font-medium text-slate-400">/100</span></p>
        </div>
        <TrendChart patient={patient} color={style.color} />
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500"><span>Fall Incidents (MTD)</span><FallDots count={patient.falls} /></div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500"><Info className="h-3.5 w-3.5 text-slate-400" />Factor: {patient.factor}</div>
      {showEscalation && <button className="mt-4 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50">Recommend Escalation<ChevronRight className="h-3.5 w-3.5" /></button>}
    </>
  );
}

export default function RiskCard({ patient }) {
  const style = RISK_STYLES[patient.risk];
  const scored = patient.risk !== 'exempt';
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between"><div><p className="text-sm font-bold text-[#2B2E33]">{patient.name}</p><p className="text-[11px] text-slate-400">UID: {patient.uid}</p></div><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}>{style.label}</span></div>
      {scored ? <ScoredRisk patient={patient} style={style} /> : <div className="mt-6 flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 py-8"><p className="text-xs italic text-slate-400">Not applicable — outside model scope</p></div>}
    </div>
  );
}
