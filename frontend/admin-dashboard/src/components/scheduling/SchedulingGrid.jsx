'use client';

import { SlidersHorizontal } from 'lucide-react';
import { CAREGIVERS, TIME_SLOTS, VISITS } from './scheduleData';
import VisitBlock from './VisitBlock';

export default function SchedulingGrid() {
  return <section className="min-w-[900px] flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="grid grid-cols-[210px_repeat(6,minmax(110px,1fr))] border-b border-slate-200 bg-white"><div className="flex items-center gap-2 border-r border-slate-200 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Caregiver Team<SlidersHorizontal className="ml-auto h-3.5 w-3.5" /></div>{TIME_SLOTS.map((slot) => <div key={slot} className="border-r border-slate-100 px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">{slot}</div>)}</div><div className="divide-y divide-slate-200">{CAREGIVERS.map((caregiver) => <div key={caregiver.id} className="grid min-h-20 grid-cols-[210px_repeat(6,minmax(110px,1fr))] bg-white"><div className="flex items-center gap-3 border-r border-slate-200 bg-slate-50/70 px-4"><span className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${caregiver.color}`}>{caregiver.initials}</span><div><p className="text-xs font-bold text-slate-700">{caregiver.name}</p><p className="mt-0.5 text-[9px] uppercase tracking-wide text-slate-400">{caregiver.role}</p></div></div><div className="relative col-span-6 bg-[linear-gradient(to_right,transparent_calc(16.666%_-_1px),#edf1f3_calc(16.666%),transparent_calc(16.666%_+_1px))] bg-[length:16.666%_100%]">{VISITS.filter((visit) => visit.caregiverId === caregiver.id).map((visit) => <VisitBlock key={visit.id} visit={visit} />)}</div></div>)}</div></section>;
}
