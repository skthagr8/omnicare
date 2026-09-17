'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  Calendar,
  SlidersHorizontal,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
  MoreHorizontal,
  CheckCircle2,
  Info,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';

const TABS = ['Utilization', 'Missed Visits', 'Assessment Completion', 'Audit Trail'];

const STATUS_STYLES = {
  Completed: 'bg-teal-50 text-teal-700',
  Pending: 'bg-amber-50 text-amber-700',
  Flagged: 'bg-slate-100 text-slate-500',
  Overdue: 'bg-rose-50 text-rose-600',
};

const RECORDS = [
  {
    id: 'RC-9012',
    facility: 'North Wing General',
    category: 'Nursing Staff',
    status: 'Completed',
    ratio: '94.2%',
    hours: '1,240.5 hrs',
    timestamp: '2024-10-24 08:30',
  },
  {
    id: 'RC-8821',
    facility: 'Intensive Care Unit',
    category: 'Specialist MD',
    status: 'Pending',
    ratio: '88.7%',
    hours: '942.0 hrs',
    timestamp: '2024-10-24 09:15',
  },
  {
    id: 'RC-7740',
    facility: 'Rehab Center B',
    category: 'Therapists',
    status: 'Completed',
    ratio: '76.4%',
    hours: '2,105.2 hrs',
    timestamp: '2024-10-23 16:45',
  },
  {
    id: 'RC-6612',
    facility: 'Outpatient Clinic',
    category: 'Support Staff',
    status: 'Flagged',
    ratio: '42.1%',
    hours: '520.8 hrs',
    timestamp: '2024-10-23 14:20',
  },
  {
    id: 'RC-5591',
    facility: 'East Side Cardiac',
    category: 'Nursing Staff',
    status: 'Overdue',
    ratio: '91.8%',
    hours: '1,102.4 hrs',
    timestamp: '2024-10-23 11:05',
  },
  {
    id: 'RC-4432',
    facility: 'Emergency Dept',
    category: 'Critical Care',
    status: 'Completed',
    ratio: '98.5%',
    hours: '3,450.0 hrs',
    timestamp: '2024-10-23 08:30',
  },
];

function ExportMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg bg-[#0F6B72] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0d5b61]"
      >
        <Download className="h-3.5 w-3.5" />
        Export
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-44 overflow-hidden rounded-xl border border-slate-100 bg-white py-1.5 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.25)]">
          <button className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-50">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-50 text-rose-500">
              <FileText className="h-3.5 w-3.5" />
            </span>
            Export as PDF
          </button>
          <button className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-50">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
              <FileSpreadsheet className="h-3.5 w-3.5" />
            </span>
            Export as CSV
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('Utilization');
  const [page, setPage] = useState(1);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <p className="text-sm font-medium text-slate-500">
            Central Hospital <span className="mx-1 text-slate-300">/</span>
            <span className="text-slate-800">Patient Workflows</span>
          </p>
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Systems Normal
          </span>
          <span className="text-xs text-slate-400">14:22 UTC</span>

          <div className="ml-auto flex items-center gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search patients, rooms..."
                className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-[#0F6B72] focus:bg-white"
              />
            </div>
            <button className="relative text-slate-400 hover:text-slate-600">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F6B72] text-xs font-semibold text-white">
                SC
              </span>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-slate-800">Dr. Sarah Chen</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Chief Surgeon</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Archival header block */}
        <div className="bg-[#1B2733] px-8 pb-0 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-300">
                <Radio className="h-3 w-3" />
                Operational Intelligence
              </p>
              <h1 className="mt-1 text-2xl font-bold text-white">Enterprise Reporting</h1>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/5">
                <RefreshCw className="h-3.5 w-3.5" />
                Scheduled Reports
              </button>
              <ExportMenu />
            </div>
          </div>

          {/* Tab bar */}
          <div className="mt-6 flex gap-6">
            {TABS.map((tab) => {
              const active = tab === activeTab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative pb-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                  {active && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#14B8AA] shadow-[0_0_8px_rgba(20,184,170,0.7)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <main className="px-8 py-6">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Oct 01, 2024 - Oct 24, 2024
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <div className="relative flex-1 min-w-55 max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ID or location..."
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-600 placeholder:text-slate-400 outline-none focus:border-[#0F6B72]"
              />
            </div>

            <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              Filter Data
            </button>

            <div className="ml-auto flex items-center gap-4 text-[11px] text-slate-400">
              <span>Displaying 124 of 1,890 records</span>
              <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live Sync Active
              </span>
            </div>
          </div>

          {/* Stat cards */}
          <div className="mt-5 grid grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Overall Utilization
              </p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <p className="font-mono text-2xl font-bold text-[#2B2E33]">88.4%</p>
                <span className="text-xs font-semibold text-emerald-600">+2.4%</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Active Personnel
              </p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <p className="font-mono text-2xl font-bold text-[#2B2E33]">412</p>
                <span className="text-xs font-semibold text-rose-500">-12</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Total Billed Hours
              </p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <p className="font-mono text-2xl font-bold text-[#2B2E33]">18,450.5</p>
                <span className="text-xs font-semibold text-emerald-600">+1.8k</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Critical Overages
                <Info className="h-3 w-3" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <p className="font-mono text-2xl font-bold text-[#2B2E33]">04</p>
                <span className="text-xs font-medium text-slate-400">Steady</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-[#2B2E33]">Resource Utilization Log</h2>
                <p className="text-xs text-slate-400">
                  Precision archival data for regulatory compliance and audit readiness.
                </p>
              </div>
              <button className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5">Record ID</th>
                  <th className="px-5 py-2.5">Facility / Location</th>
                  <th className="px-5 py-2.5">Personnel Category</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Utility Ratio</th>
                  <th className="px-5 py-2.5 text-right">Logged Capacity</th>
                  <th className="px-5 py-2.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {RECORDS.map((r, i) => (
                  <tr
                    key={r.id}
                    className={i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.id}</td>
                    <td className="px-5 py-3 font-semibold text-slate-700">{r.facility}</td>
                    <td className="px-5 py-3 text-slate-500">{r.category}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-[#0F6B72]">
                      {r.ratio}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-600">{r.hours}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-slate-400">
                      {r.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                All visible records verified against clinical database
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50"
                >
                  Previous
                </button>
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`h-6 w-6 rounded-md text-xs font-semibold ${
                      page === n ? 'bg-[#1B2733] text-white' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(3, p + 1))}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Footer notes */}
          <div className="mt-6 grid grid-cols-3 gap-8 border-t border-slate-200 pt-5 pb-6 text-xs text-slate-500">
            <div>
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-[#0F6B72]">
                <Info className="h-3.5 w-3.5" />
                Model Precision Notice
              </p>
              <p>
                Utilization reports are calculated using weighted moving averages of active
                personnel hours against facility baseline capacity. Confidence interval for
                current period: 98.4%.
              </p>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                Regulatory Compliance
              </p>
              <p>
                This report adheres to HIPAA Section 164.514 requirements for data
                de-identification and meets the audit trail standards for CMS-certified medical
                facilities.
              </p>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-600">
                <RefreshCw className="h-3.5 w-3.5" />
                Data Latency
              </p>
              <p>
                Reports sync in near real-time with floor operations. Minor discrepancies may
                occur during high-volume intake periods (latency &lt; 45 seconds).
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
