'use client';

import { Filter, Search } from 'lucide-react';

export default function PatientDirectoryHeader({ query, onQueryChange, diagnosis, acuity, onDiagnosisChange, onAcuityChange }) {
  return (
    <div className="border-b border-slate-200 bg-[#EEF3F6] px-8 py-6">
      <div className="flex items-center justify-between gap-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0F6B72]">Care Operations</p><h1 className="mt-1 text-2xl font-bold text-[#2B2E33]">Patients</h1><p className="mt-1 text-sm text-slate-500">Registered clients and current care assignments</p></div>
        <div className="flex items-center gap-3">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} type="search" placeholder="Search patients..." className="w-64 rounded-full border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-[#0F6B72] focus:ring-2 focus:ring-[#0F6B72]/15" /></div>
          <label className="relative"><span className="sr-only">Diagnosis category</span><select value={diagnosis} onChange={(event) => onDiagnosisChange(event.target.value)} className="appearance-none rounded-full border border-slate-200 bg-white py-2.5 pl-4 pr-9 text-sm text-slate-600 outline-none focus:border-[#0F6B72]"><option value="All">All diagnoses</option><option value="Dementia">Dementia</option><option value="Parkinson's">Parkinson's</option><option value="Post-Stroke">Post-Stroke</option><option value="General Geriatric">General Geriatric</option></select><Filter className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /></label>
          <label className="relative"><span className="sr-only">Acuity tier</span><select value={acuity} onChange={(event) => onAcuityChange(event.target.value)} className="appearance-none rounded-full border border-slate-200 bg-white py-2.5 pl-4 pr-9 text-sm text-slate-600 outline-none focus:border-[#0F6B72]"><option value="All">All acuity</option><option value="high">High acuity</option><option value="medium">Medium acuity</option><option value="low">Low acuity</option></select><Filter className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /></label>
        </div>
      </div>
    </div>
  );
}
