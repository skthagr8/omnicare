'use client';

import { ChevronRight, Clock, Filter, Search } from 'lucide-react';
import StatusPill from './StatusPill';

export default function DisputeQueue({ disputes, activeId, onSelect }) {
  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-[#EEF1F4]">
      <div className="flex items-center justify-between px-5 pt-5"><h1 className="text-base font-bold text-[#2B2E33]">Dispute Queue</h1><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm">{disputes.length} Total</span></div>
      <div className="px-5 pt-4"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Search disputes, patient names..." className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#0F6B72]" /></div><div className="mt-3 flex gap-2"><button className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"><Filter className="h-3.5 w-3.5" />Priority</button><button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-white/60"><Clock className="h-3.5 w-3.5" />Recent</button></div></div>
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto px-5 pb-5">{disputes.map((dispute) => { const isActive = dispute.id === activeId; return <button key={dispute.id} onClick={() => onSelect(dispute.id)} className={`block w-full rounded-xl border p-4 text-left transition-colors ${isActive ? 'border-[#0F6B72]/30 bg-white shadow-[0_4px_14px_-6px_rgba(15,107,114,0.25)]' : 'border-transparent bg-white/60 hover:bg-white'}`}><div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-slate-400">{dispute.id}</span><StatusPill status={dispute.status} /></div><p className="mt-1.5 text-sm font-semibold text-[#2B2E33]">{dispute.title}</p><p className="mt-1 text-xs text-slate-500">{dispute.patient}</p><div className="mt-2 flex items-center justify-between"><span className="flex items-center gap-1 text-[11px] text-slate-400"><Clock className="h-3 w-3" />{dispute.timeAgo}</span>{isActive && <ChevronRight className="h-3.5 w-3.5 text-[#0F6B72]" />}</div></button>; })}</div>
    </aside>
  );
}
