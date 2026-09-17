'use client';

import { useState } from 'react';
import { CalendarDays, ChevronDown, Search } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import AssignVisitModal from '../../components/scheduling/AssignVisitModal';
import ScheduleLegend from '../../components/scheduling/ScheduleLegend';
import SchedulingGrid from '../../components/scheduling/SchedulingGrid';

export default function SchedulingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const handleAssigned = () => {
    setIsModalOpen(false);
    setNotice('Visit assigned and added to the operations grid.');
    window.setTimeout(() => setNotice(''), 3000);
  };

  return <div className="flex h-screen w-full overflow-hidden bg-white"><Sidebar /><div className="flex min-w-0 flex-1 flex-col"><DashboardHeader timeLabel="14:22" /><header className="flex items-center gap-5 border-b border-slate-200 bg-white px-6 py-4"><div className="flex items-center gap-3"><CalendarDays className="h-6 w-6 text-[#0F6B72]" /><div><h1 className="text-lg font-bold text-[#2B2E33]">Clinical Scheduling</h1><div className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Today, Oct 24</span><span>Facility: Central Hospital</span></div></div></div><div className="ml-auto flex items-center gap-2"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input placeholder="Search staff or patients..." className="w-56 rounded-full border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-[#0F6B72]" /></div><div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"><button className="rounded-md bg-white px-3 py-2 text-[10px] font-semibold text-slate-700 shadow-sm">Day</button><button className="px-3 py-2 text-[10px] font-medium text-slate-500">Week</button><button className="px-3 py-2 text-[10px] font-medium text-slate-500">Month</button></div><button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><CalendarDays className="h-3.5 w-3.5" />Calendar View<ChevronDown className="h-3 w-3" /></button><button onClick={() => setIsModalOpen(true)} className="rounded-lg bg-[#0F6B72] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0d5b61]">+ Assign New Visit</button></div></header><main className="relative flex min-h-0 flex-1 flex-col overflow-auto bg-[#FBFCFC] p-5"><div className="flex min-h-0 flex-1"><SchedulingGrid /><ScheduleLegend /></div><div className="mt-4 flex items-center gap-5 border-t border-slate-200 pt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><span className="text-emerald-600">● Live Sync: Connected</span><span>♧ Care Quality Index: 98.4%</span><span className="ml-auto">v2.4.0-Stable · © 2024 OmniCare Operations</span></div></main>{notice && <div className="fixed bottom-6 right-6 z-10 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg">{notice}</div>}{isModalOpen && <AssignVisitModal onClose={() => setIsModalOpen(false)} onAssigned={handleAssigned} />}</div></div>;
}
