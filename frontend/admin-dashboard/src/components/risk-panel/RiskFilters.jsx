'use client';

import { Info } from 'lucide-react';
import { FILTERS } from './riskData';

export default function RiskFilters({ filter, onFilterChange }) {
  return (
    <div className="mt-6 flex items-center gap-2"><span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Filter By</span>{FILTERS.map((item) => <button key={item} onClick={() => onFilterChange(item)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === item ? 'bg-[#0F6B72]/10 text-[#0F6B72]' : 'text-slate-500 hover:bg-slate-100'}`}>{item}</button>)}<span className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400"><Info className="h-3.5 w-3.5" />Model updated at 14:45 UTC</span></div>
  );
}
