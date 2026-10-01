'use client';

import { Bell, ChevronDown, Search } from 'lucide-react';

export default function DashboardHeader({ timeLabel }) {
  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3">
      <p className="text-sm font-medium text-slate-500">
        Central Hospital <span className="mx-1 text-slate-300">/</span>
        <span className="text-slate-800">Patient Workflows</span>
      </p>
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Systems Normal
      </span>
      <span className="text-xs text-slate-400">{timeLabel} UTC</span>
      <div className="ml-auto flex items-center gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search patients, rooms..." className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-[#0F6B72] focus:bg-white" />
        </div>
        <button className="relative text-slate-400 hover:text-slate-600">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500" />
        </button>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F6B72] text-xs font-semibold text-white">SC</span>
          <div className="leading-tight"><p className="text-xs font-semibold text-slate-800">Dr. Sarah Chen</p><p className="text-[10px] uppercase tracking-wide text-slate-400">Chief Surgeon</p></div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>
      </div>
    </header>
  );
}
