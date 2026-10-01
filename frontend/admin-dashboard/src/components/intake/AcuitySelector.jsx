'use client';

import { CheckCircle2, CircleHelp, HeartPulse } from 'lucide-react';

const ACUITY_LEVELS = [
  {
    id: 'high',
    title: 'High Acuity (Urgent)',
    description: 'Immediate intervention or continuous monitoring required.',
    indicatorClass: 'bg-rose-400',
    iconClass: 'bg-rose-100 text-rose-500',
    selectedClass: 'border-rose-300 bg-rose-50/65 shadow-[0_8px_20px_-12px_rgba(190,70,88,0.35)]',
    titleClass: 'text-rose-700',
    indications: ['Unstable vital signs', 'Acute respiratory distress', 'Severe neurological deficit', 'Post-operative complications'],
  },
  {
    id: 'medium',
    title: 'Medium Acuity (Stable)',
    description: 'Regular monitoring and standard clinical care required.',
    indicatorClass: 'bg-amber-400',
    iconClass: 'bg-amber-100 text-amber-600',
    selectedClass: 'border-amber-300 bg-amber-50/60 shadow-[0_8px_20px_-12px_rgba(192,138,46,0.35)]',
    titleClass: 'text-amber-700',
    indications: ['Stable but complex chronic conditions', 'Moderate pain management', 'Assistance with basic mobility', 'Standard post-acute recovery'],
  },
  {
    id: 'low',
    title: 'Low Acuity (Routine)',
    description: 'Routine care or health maintenance observations.',
    indicatorClass: 'bg-emerald-400',
    iconClass: 'bg-emerald-100 text-emerald-600',
    selectedClass: 'border-emerald-300 bg-emerald-50/60 shadow-[0_8px_20px_-12px_rgba(52,130,96,0.3)]',
    titleClass: 'text-emerald-700',
    indications: ['Preventative health screening', 'Simple wound dressing change', 'Education and self-care training', 'Stable baseline assessment'],
  },
];

const RESOURCE_ESTIMATES = {
  high: { ratio: '1 : 2', frequency: 'Q2 Hours', escalation: 'Immediate Review' },
  medium: { ratio: '1 : 4', frequency: 'Q4 Hours', escalation: 'Standard' },
  low: { ratio: '1 : 6', frequency: 'Q8 Hours', escalation: 'On Change' },
};

function AcuityTile({ level, selected, onSelect }) {
  return (
    <button type="button" onClick={() => onSelect(level.id)} aria-pressed={selected} className={`relative flex min-h-72.5 flex-col rounded-xl border bg-white p-5 text-center transition-all duration-200 hover:-translate-y-0.5 ${selected ? level.selectedClass : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/70'}`}>
      <span className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full ${selected ? level.iconClass : 'text-slate-400'}`}>{selected ? <CheckCircle2 className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />}</span>
      <span className={`mx-auto mt-1 flex h-20 w-20 items-center justify-center rounded-lg ${selected ? level.iconClass : 'bg-slate-100 text-slate-300'}`}><HeartPulse className="h-8 w-8" strokeWidth={1.5} /></span>
      <h3 className={`mt-5 text-sm font-bold ${selected ? level.titleClass : 'text-slate-700'}`}>{level.title}</h3>
      <p className="mx-auto mt-2 max-w-52.5 text-[11px] leading-relaxed text-slate-500">{level.description}</p>
      <div className="my-4 h-px w-full bg-slate-200" />
      <div className="text-left"><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Indications:</p><ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-slate-600">{level.indications.map((indication) => <li key={indication} className="flex gap-1.5"><span className={`mt-1 h-1 w-1 shrink-0 rounded-full ${selected ? level.indicatorClass : 'bg-slate-300'}`} />{indication}</li>)}</ul></div>
    </button>
  );
}

export default function AcuitySelector({ selectedAcuity, onAcuityChange }) {
  const estimate = RESOURCE_ESTIMATES[selectedAcuity];
  return (
    <div>
      <div className="grid grid-cols-3 gap-5">{ACUITY_LEVELS.map((level) => <AcuityTile key={level.id} level={level} selected={selectedAcuity === level.id} onSelect={onAcuityChange} />)}</div>
      <section className="mt-6 flex items-center justify-between rounded-xl bg-white p-5 shadow-[0_3px_14px_-8px_rgba(15,23,42,0.16)]"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-[#0F6B72]"><HeartPulse className="h-4 w-4" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-slate-600">Resource Estimation</p><p className="mt-1 text-[11px] text-slate-400">Recommended staffing and monitoring based on selected acuity.</p></div></div><div className="flex items-center gap-10"><div><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Nursing Ratio</p><p className="mt-1 text-sm font-bold text-slate-700">{estimate.ratio}</p></div><div><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Monitor Freq.</p><p className="mt-1 text-sm font-bold text-slate-700">{estimate.frequency}</p></div><div><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Escalation Path</p><p className="mt-1 text-sm font-bold text-slate-700">{estimate.escalation}</p></div></div></section>
    </div>
  );
}
