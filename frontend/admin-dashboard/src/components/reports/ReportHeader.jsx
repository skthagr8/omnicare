'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, Radio, RefreshCw } from 'lucide-react';
import { TABS } from './reportData';

function ExportMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const handleClick = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); }; document.addEventListener('mousedown', handleClick); return () => document.removeEventListener('mousedown', handleClick); }, []);
  return <div className="relative" ref={ref}><button onClick={() => setOpen((value) => !value)} className="flex items-center gap-1.5 rounded-lg bg-[#0F6B72] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0d5b61]"><Download className="h-3.5 w-3.5" />Export<ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open && <div className="absolute right-0 top-[calc(100%+8px)] w-44 overflow-hidden rounded-xl border border-slate-100 bg-white py-1.5 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.25)]"><button className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-50 text-rose-500"><FileText className="h-3.5 w-3.5" /></span>Export as PDF</button><button className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600"><FileSpreadsheet className="h-3.5 w-3.5" /></span>Export as CSV</button></div>}</div>;
}

export default function ReportHeader({ activeTab, onTabChange }) {
  return <div className="bg-[#1B2733] px-8 pb-0 pt-6"><div className="flex items-center justify-between"><div><p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-300"><Radio className="h-3 w-3" />Operational Intelligence</p><h1 className="mt-1 text-2xl font-bold text-white">Enterprise Reporting</h1></div><div className="flex gap-2"><button className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/5"><RefreshCw className="h-3.5 w-3.5" />Scheduled Reports</button><ExportMenu /></div></div><div className="mt-6 flex gap-6">{TABS.map((tab) => <button key={tab} onClick={() => onTabChange(tab)} className={`relative pb-3 text-xs font-semibold uppercase tracking-wide transition-colors ${tab === activeTab ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>{tab}{tab === activeTab && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#14B8AA] shadow-[0_0_8px_rgba(20,184,170,0.7)]" />}</button>)}</div></div>;
}
