'use client';

import { useState } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  Filter,
  Clock,
  MoreHorizontal,
  HeartHandshake,
  ShieldCheck,
  Paperclip,
  CheckCircle2,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';

const STATUS_STYLES = {
  Open: 'bg-amber-50 text-amber-700 border-amber-200',
  'Under Review': 'bg-sky-50 text-sky-700 border-sky-200',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const DISPUTES = [
  {
    id: 'DSP-8821',
    status: 'Open',
    title: 'Medication Schedule Inconsistency',
    patient: 'Eleanor Vance',
    timeAgo: '14 mins ago',
    facility: 'Central Hospital - North Wing',
    mediator: 'Dr. Sarah Chen',
    caseInitiated: 'Oct 23, 2024',
    thread: [
      {
        author: 'David Vance (Son)',
        role: 'family',
        time: 'Oct 24, 2024 · 03:15 AM',
        text:
          'We were informed my mother would receive her physiotherapy assessment on Tuesday. However, the nurse on duty mentioned there\u2019s no record of this in her schedule. This is the third time we\u2019ve had a delay in her rehab plan.',
      },
      {
        author: 'Nurse Sarah Jenkins',
        role: 'caregiver',
        time: 'Oct 24, 2024 · 08:30 AM',
        text:
          'I\u2019ve reviewed Mrs. Vance\u2019s digital chart. The physio referral was flagged as "Pending Consultant Approval" due to a recent blood pressure spike. Our protocol requires cardiovascular stability before intensive physical therapy. I should have communicated this reason more clearly to the family.',
      },
      {
        author: 'David Vance (Son)',
        role: 'family',
        time: 'Oct 24, 2024 · 01:45 PM',
        text:
          'Thank you for the clarification, Nurse Jenkins. We weren\u2019t aware of the blood pressure spike. We just want to ensure her recovery isn\u2019t stalling. Can we set a tentative date for when the assessment might happen if her vitals remain stable?',
      },
    ],
  },
  {
    id: 'DSP-7749',
    status: 'Under Review',
    title: 'Discharge Timing Disagreement',
    patient: 'Arthur Miller',
    timeAgo: '2 hours ago',
    facility: 'Central Hospital - North Wing',
    mediator: 'Dr. Sarah Chen',
    caseInitiated: 'Oct 22, 2024',
    thread: [],
  },
  {
    id: 'DSP-6512',
    status: 'Resolved',
    title: 'Staff Communication Protocol',
    patient: 'Rosemary Clarke',
    timeAgo: '1 day ago',
    facility: 'Central Hospital - North Wing',
    mediator: 'Dr. Sarah Chen',
    caseInitiated: 'Oct 14, 2024',
    thread: [],
  },
  {
    id: 'DSP-5591',
    status: 'Under Review',
    title: 'Visit Frequency Clarification',
    patient: 'Julian Thorne',
    timeAgo: '3 days ago',
    facility: 'Central Hospital - North Wing',
    mediator: 'Dr. Sarah Chen',
    caseInitiated: 'Oct 12, 2024',
    thread: [],
  },
  {
    id: 'DSP-4437',
    status: 'Open',
    title: 'Treatment Preference Documentation',
    patient: 'Thomas Wu',
    timeAgo: '4 days ago',
    facility: 'Central Hospital - North Wing',
    mediator: 'Dr. Sarah Chen',
    caseInitiated: 'Oct 11, 2024',
    thread: [],
  },
];

function StatusPill({ status }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function MessageBubble({ message }) {
  const isCaregiver = message.role === 'caregiver';
  return (
    <div className={`flex ${isCaregiver ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[80%] gap-3 ${isCaregiver ? 'flex-row-reverse' : 'flex-row'}`}>
        <span
          className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
            isCaregiver ? 'bg-teal-100 text-teal-700' : 'bg-violet-100 text-violet-700'
          }`}
        >
          {message.author
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0])
            .join('')}
        </span>
        <div>
          <p
            className={`mb-1 text-[11px] font-medium text-slate-500 ${
              isCaregiver ? 'text-right' : 'text-left'
            }`}
          >
            {message.author} <span className="text-slate-300">·</span> {message.time}
          </p>
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed text-slate-700 ${
              isCaregiver
                ? 'rounded-tr-sm bg-teal-50 border border-teal-100'
                : 'rounded-tl-sm bg-violet-50 border border-violet-100'
            }`}
          >
            {message.text}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DisputesPage() {
  const [activeId, setActiveId] = useState(DISPUTES[0].id);
  const active = DISPUTES.find((d) => d.id === activeId);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
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

        <div className="flex min-h-0 flex-1">
          {/* Left pane: dispute queue */}
          <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-[#EEF1F4]">
            <div className="flex items-center justify-between px-5 pt-5">
              <h1 className="text-base font-bold text-[#2B2E33]">Dispute Queue</h1>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm">
                {DISPUTES.length} Total
              </span>
            </div>

            <div className="px-5 pt-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search disputes, patient names..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#0F6B72]"
                />
              </div>
              <div className="mt-3 flex gap-2">
                <button className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                  <Filter className="h-3.5 w-3.5" />
                  Priority
                </button>
                <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-white/60">
                  <Clock className="h-3.5 w-3.5" />
                  Recent
                </button>
              </div>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto px-5 pb-5">
              {DISPUTES.map((d) => {
                const isActive = d.id === activeId;
                return (
                  <button
                    key={d.id}
                    onClick={() => setActiveId(d.id)}
                    className={`block w-full rounded-xl border p-4 text-left transition-colors ${
                      isActive
                        ? 'border-[#0F6B72]/30 bg-white shadow-[0_4px_14px_-6px_rgba(15,107,114,0.25)]'
                        : 'border-transparent bg-white/60 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400">{d.id}</span>
                      <StatusPill status={d.status} />
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-[#2B2E33]">{d.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{d.patient}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {d.timeAgo}
                      </span>
                      {isActive && <ChevronRight className="h-3.5 w-3.5 text-[#0F6B72]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right pane: case detail */}
          <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-white">
            <div className="border-b border-slate-100 px-8 pb-5 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusPill status={active.status} />
                  <span className="text-[11px] font-semibold text-slate-400">{active.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    <HeartHandshake className="h-3.5 w-3.5" />
                    Involve Ethics
                  </button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h2 className="mt-2 text-xl font-bold text-[#2B2E33]">{active.title}</h2>

              <div className="mt-4 flex items-center gap-10 text-xs">
                <div>
                  <p className="font-medium uppercase tracking-wide text-slate-400">Patient</p>
                  <p className="mt-0.5 font-semibold text-[#0F6B72]">{active.patient}</p>
                </div>
                <div>
                  <p className="font-medium uppercase tracking-wide text-slate-400">
                    Facility Location
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-700">{active.facility}</p>
                </div>
                <div>
                  <p className="font-medium uppercase tracking-wide text-slate-400">
                    Mediator Assigned
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-semibold text-slate-700">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0F6B72] text-[8px] text-white">
                      SC
                    </span>
                    {active.mediator}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 px-8 py-6">
              <div className="mb-6 flex items-center gap-2 text-[11px] font-medium text-slate-400">
                <span className="h-px flex-1 bg-slate-100" />
                <span>Case Initiated: {active.caseInitiated}</span>
                <span className="h-px flex-1 bg-slate-100" />
              </div>

              {active.thread.length > 0 ? (
                <div className="space-y-6">
                  {active.thread.map((m, i) => (
                    <MessageBubble key={i} message={m} />
                  ))}
                  <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Medical record verified by system
                  </div>
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                  No statements recorded for this case yet.
                </div>
              )}
            </div>

            {/* Resolution form */}
            <div className="border-t border-slate-100 px-8 py-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Final Mediation Resolution Note
              </p>
              <div className="relative">
                <textarea
                  rows={3}
                  placeholder="Enter a calm, neutral summary of the agreed resolution path..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-[#0F6B72] focus:bg-white"
                />
                <Paperclip className="absolute bottom-3 right-3 h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <HeartHandshake className="h-3.5 w-3.5 text-[#0F6B72]" />
                  <div>
                    <p className="font-semibold text-slate-500">Mediation Protocol</p>
                    <p>Standard dispute resolution active</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    Add Addendum
                  </button>
                  <button className="flex items-center gap-1.5 rounded-lg bg-[#1B2733] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0F6B72]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
