'use client';

import { Activity, TriangleAlert } from 'lucide-react';

export default function RiskSummary() {
  return (
    <div className="mt-6 grid grid-cols-3 gap-4">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-500"><TriangleAlert className="h-4 w-4" /></span><div><p className="text-xl font-bold text-[#2B2E33]">2</p><p className="text-[11px] text-slate-400">Critical Risks</p></div></div>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-[#0F6B72]"><Activity className="h-4 w-4" /></span><div><p className="text-xl font-bold text-[#2B2E33]">44</p><p className="text-[11px] text-slate-400">Avg Risk Score</p></div></div>
      <div className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-4"><div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400"><span>Facility Risk Threshold</span><span className="font-semibold text-[#0F6B72]">82% System Health</span></div><div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[82%] rounded-full bg-[#0F6B72]" /></div></div>
    </div>
  );
}
