'use client';

import { useState } from 'react';
import { Download, History, Sparkles } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import RiskCard from '../../components/risk-panel/RiskCard';
import RiskFilters from '../../components/risk-panel/RiskFilters';
import RiskNotes from '../../components/risk-panel/RiskNotes';
import RiskSummary from '../../components/risk-panel/RiskSummary';
import { PATIENTS } from '../../components/risk-panel/riskData';

export default function RiskPanelPage() {
  const [filter, setFilter] = useState('All');
  const visiblePatients = PATIENTS.filter((patient) => filter === 'All' || patient.risk === filter.toLowerCase());

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAFAF8]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <DashboardHeader timeLabel="14:22" />
        <main className="mx-auto w-full max-w-6xl px-8 py-8">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#0F6B72]"><Sparkles className="h-3.5 w-3.5" />AI Clinical Engine v4.2</div>
          <div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-[#2B2E33]">Predictive Risk Analysis</h1><p className="mt-1 max-w-xl text-sm text-slate-500">Advanced patient vulnerability monitoring using real-time mobility data, medication adherence, and clinical history.</p></div><div className="flex shrink-0 gap-2"><button className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Download className="h-3.5 w-3.5" />Export</button><button className="flex items-center gap-1.5 rounded-lg bg-[#0F6B72] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0d5b61]"><History className="h-3.5 w-3.5" />Model History</button></div></div>
          <RiskSummary />
          <RiskFilters filter={filter} onFilterChange={setFilter} />
          <div className="mt-8 flex items-center gap-2"><h2 className="text-sm font-bold text-[#2B2E33]">Patient Population Analysis</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{visiblePatients.length} Patients</span></div>
          <div className="mt-4 grid grid-cols-3 gap-5">{visiblePatients.map((patient) => <RiskCard key={patient.uid} patient={patient} />)}</div>
          <RiskNotes />
        </main>
      </div>
    </div>
  );
}
