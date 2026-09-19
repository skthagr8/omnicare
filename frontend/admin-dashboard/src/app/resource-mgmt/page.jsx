'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  BriefcaseMedical,
  Clock3,
  MapPin,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/dashboard/DashboardHeader';

const kpis = [
  {
    label: 'Coverage Index',
    value: '92%',
    delta: '+4.2%',
    tone: 'emerald',
    icon: ShieldCheck,
    note: 'Net staffing stability',
  },
  {
    label: 'Available Staff',
    value: '118',
    delta: '12 on-call',
    tone: 'sky',
    icon: Users,
    note: 'Across all care teams',
  },
  {
    label: 'Open Shifts',
    value: '07',
    delta: '3 urgent',
    tone: 'amber',
    icon: Clock3,
    note: 'Needs reassignment today',
  },
  {
    label: 'Asset Constraints',
    value: '04',
    delta: '2 high-risk',
    tone: 'rose',
    icon: BedDouble,
    note: 'Equipment or room bottlenecks',
  },
];

const heatmapTimes = ['07:00', '09:00', '11:00', '13:00', '15:00', '17:00'];

const zoneCoverage = [
  { zone: 'North Campus', values: [86, 91, 96, 82, 88, 94] },
  { zone: 'South Wing', values: [72, 80, 84, 89, 76, 82] },
  { zone: 'West Tower', values: [64, 68, 74, 78, 71, 70] },
  { zone: 'ICU', values: [92, 95, 97, 93, 90, 96] },
  { zone: 'Remote Care', values: [88, 86, 92, 94, 91, 90] },
];

const staffingByZone = [
  { zone: 'North Campus', assigned: 34, required: 35, coverage: 96, risk: 'Low' },
  { zone: 'South Wing', assigned: 21, required: 25, coverage: 84, risk: 'Moderate' },
  { zone: 'West Tower', assigned: 15, required: 20, coverage: 75, risk: 'High' },
  { zone: 'ICU', assigned: 18, required: 19, coverage: 95, risk: 'Low' },
  { zone: 'Remote Care', assigned: 12, required: 13, coverage: 92, risk: 'Low' },
];

const serviceCoverage = [
  { team: 'Home Health', coverage: 96, filled: 28, required: 29, active: '4 travel gaps' },
  { team: 'ICU Follow-up', coverage: 88, filled: 17, required: 19, active: '2 on-call shortages' },
  { team: 'Mobility Support', coverage: 81, filled: 14, required: 17, active: '3 tasks pending' },
  { team: 'Clinical Intake', coverage: 94, filled: 11, required: 12, active: '1 coverage gap' },
];

const alerts = [
  { title: 'Overtime risk', detail: 'North campus is trending 13% over baseline', severity: 'warning' },
  { title: 'Equipment hold', detail: '2 infusion pumps unavailable in West wing', severity: 'danger' },
  { title: 'Shift handoff', detail: '3 caregiver handoffs pending before 18:00', severity: 'info' },
];

const teamRoster = [
  { name: 'Maya Ortega', role: 'RN Lead', zone: 'North Campus', status: 'Available', availability: '92%' },
  { name: 'Jamal Price', role: 'PT Specialist', zone: 'South Wing', status: 'On route', availability: '70%' },
  { name: 'Nina Shah', role: 'Care Coordinator', zone: 'Remote', status: 'Available', availability: '96%' },
  { name: 'David Brooks', role: 'Mobility Tech', zone: 'West Tower', status: 'Booked', availability: '58%' },
  { name: 'Alicia Gomez', role: 'Clinical Nurse', zone: 'ICU', status: 'On call', availability: '80%' },
];

const equipment = [
  { name: 'Wheelchairs', total: 46, inUse: 31, available: 15, status: 'Healthy' },
  { name: 'Beds', total: 24, inUse: 19, available: 5, status: 'Focused' },
  { name: 'Monitoring Kits', total: 18, inUse: 12, available: 6, status: 'Healthy' },
  { name: 'Transport Vans', total: 8, inUse: 6, available: 2, status: 'Watch' },
];

const shifts = [
  { title: 'Morning coverage', time: '07:00 - 13:00', percent: 88, owner: '12 assigned', accent: 'bg-emerald-500' },
  { title: 'Afternoon surge', time: '13:00 - 19:00', percent: 74, owner: '8 staffing gaps', accent: 'bg-amber-500' },
  { title: 'Evening transit', time: '19:00 - 23:00', percent: 91, owner: '3 floaters reserved', accent: 'bg-sky-500' },
];

const candidateAssignments = {
  'North Campus': [
    { name: 'Maya Ortega', role: 'RN Lead', match: 96, badge: 'Available now' },
    { name: 'Alicia Gomez', role: 'Clinical Nurse', match: 92, badge: 'Float coverage' },
    { name: 'Nina Shah', role: 'Care Coordinator', match: 87, badge: 'On-call' },
  ],
  'South Wing': [
    { name: 'Jamal Price', role: 'PT Specialist', match: 89, badge: 'Free after 12:00' },
    { name: 'Maya Ortega', role: 'RN Lead', match: 84, badge: 'Available in 40m' },
    { name: 'Nina Shah', role: 'Care Coordinator', match: 81, badge: 'Backfill' },
  ],
  'West Tower': [
    { name: 'David Brooks', role: 'Mobility Tech', match: 78, badge: 'Assigned nearby' },
    { name: 'Jamal Price', role: 'PT Specialist', match: 76, badge: 'Short notice' },
    { name: 'Alicia Gomez', role: 'Clinical Nurse', match: 72, badge: 'Cross-cover' },
  ],
  ICU: [
    { name: 'Alicia Gomez', role: 'Clinical Nurse', match: 98, badge: 'Ready now' },
    { name: 'Nina Shah', role: 'Care Coordinator', match: 86, badge: 'Support team' },
    { name: 'Maya Ortega', role: 'RN Lead', match: 83, badge: 'Backup' },
  ],
  'Remote Care': [
    { name: 'Nina Shah', role: 'Care Coordinator', match: 94, badge: 'Available' },
    { name: 'Maya Ortega', role: 'RN Lead', match: 82, badge: 'On-call' },
    { name: 'Jamal Price', role: 'PT Specialist', match: 80, badge: 'Telehealth' },
  ],
};

function getToneClasses(tone) {
  if (tone === 'emerald') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  if (tone === 'sky') {
    return 'bg-sky-50 text-sky-700 ring-sky-200';
  }
  if (tone === 'amber') {
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
  return 'bg-rose-50 text-rose-700 ring-rose-200';
}

function getSeverityClasses(level) {
  if (level === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  if (level === 'danger') {
    return 'border-rose-200 bg-rose-50 text-rose-800';
  }
  return 'border-sky-200 bg-sky-50 text-sky-800';
}

function getStatusClasses(status) {
  if (status === 'Available') return 'bg-emerald-100 text-emerald-700';
  if (status === 'On route') return 'bg-sky-100 text-sky-700';
  if (status === 'Booked') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-200 text-slate-700';
}

function getCoverageColor(value) {
  if (value >= 90) {
    return 'bg-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.35)]';
  }
  if (value >= 75) {
    return 'bg-amber-400 text-slate-900';
  }
  if (value >= 60) {
    return 'bg-orange-400 text-white';
  }
  return 'bg-rose-500 text-white';
}

export default function ResourceMgmtPage() {
  const [selectedZone, setSelectedZone] = useState('North Campus');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedZoneSummary = useMemo(
    () => staffingByZone.find((zone) => zone.zone === selectedZone) ?? staffingByZone[0],
    [selectedZone],
  );

  const openAssignmentDrawer = (zone) => {
    setSelectedZone(zone);
    setDrawerOpen(true);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F6F8FA] text-slate-800">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader timeLabel="14:22" />

        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF6F4] text-[#0F6B72]">
              <BriefcaseMedical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#2B2E33]">Resource Management</h1>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Coverage, staffing, and asset capacity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              Today
            </button>
            <button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              By Zone
            </button>
            <button
              onClick={() => openAssignmentDrawer(selectedZone)}
              className="rounded-lg bg-[#0F6B72] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0d5b61]"
            >
              + Assign Coverage
            </button>
          </div>
        </header>

        <main className="relative flex-1 overflow-auto p-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map(({ label, value, delta, tone, icon: Icon, note }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
                  </div>
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${getToneClasses(tone)}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#0F6B72]">{delta}</span>
                  <span className="text-[10px] text-slate-400">{note}</span>
                </div>
              </div>
            ))}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#2B2E33]">Coverage heatmap</p>
                  <p className="mt-1 text-xs text-slate-500">Staffing availability across zones and time windows</p>
                </div>
                <button className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Live
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[110px_repeat(6,minmax(0,1fr))] gap-2 bg-slate-50 p-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <div className="px-2 py-2">Zone</div>
                  {heatmapTimes.map((time) => (
                    <div key={time} className="px-2 py-2 text-center">{time}</div>
                  ))}
                </div>

                <div className="space-y-2 bg-white p-3">
                  {zoneCoverage.map(({ zone, values }) => (
                    <div key={zone} className="grid grid-cols-[110px_repeat(6,minmax(0,1fr))] gap-2">
                      <button
                        onClick={() => openAssignmentDrawer(zone)}
                        className="flex items-center justify-start rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:border-[#0F6B72] hover:text-[#0F6B72]"
                      >
                        {zone}
                      </button>
                      {values.map((value, index) => (
                        <button
                          key={`${zone}-${heatmapTimes[index]}`}
                          onClick={() => openAssignmentDrawer(zone)}
                          className={`flex h-12 items-center justify-center rounded-lg text-[11px] font-bold transition duration-150 hover:scale-[1.02] ${getCoverageColor(value)}`}
                          aria-label={`${zone} coverage at ${heatmapTimes[index]} is ${value}%`}
                        >
                          {value}%
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#2B2E33]">Staffing by zone</p>
                  <p className="mt-1 text-xs text-slate-500">Assigned vs required coverage</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Today
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {staffingByZone.map(({ zone, assigned, required, coverage, risk }) => (
                  <div key={zone} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <button
                        onClick={() => openAssignmentDrawer(zone)}
                        className="font-semibold text-slate-800 hover:text-[#0F6B72]"
                      >
                        {zone}
                      </button>
                      <span className="text-xs text-slate-500">{risk} risk</span>
                    </div>

                    <div className="mt-3 flex items-end gap-3">
                      <div className="flex-1">
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-[#0F6B72] via-[#19A0A6] to-[#6ED7B7]"
                            style={{ width: `${coverage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-700">{coverage}%</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{assigned} assigned</span>
                      <span>{required} required</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#2B2E33]">Service coverage</p>
                  <p className="mt-1 text-xs text-slate-500">Projected staffing availability vs required coverage</p>
                </div>
                <button className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Live
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {serviceCoverage.map(({ team, coverage, filled, required, active }) => (
                  <div key={team} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{team}</p>
                        <p className="text-[11px] text-slate-500">{filled} of {required} caregivers scheduled</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-[#0F6B72]">{coverage}%</p>
                        <p className="text-[10px] text-slate-500">Coverage</p>
                      </div>
                    </div>

                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-[#0F6B72] via-[#19A0A6] to-[#6ED7B7]"
                        style={{ width: `${coverage}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{active}</span>
                      <span className="inline-flex items-center gap-1 text-[#0F6B72] font-semibold">
                        Detail <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[#2B2E33]">Operational alerts</p>
                  <span className="text-xs font-semibold text-slate-500">3 active</span>
                </div>
                <div className="mt-4 space-y-3">
                  {alerts.map(({ title, detail, severity }) => (
                    <div key={title} className={`rounded-xl border p-3 ${getSeverityClasses(severity)}`}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">{title}</p>
                          <p className="mt-1 text-xs opacity-80">{detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[#2B2E33]">Shift readiness</p>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">4h outlook</span>
                </div>
                <div className="mt-4 space-y-3">
                  {shifts.map(({ title, time, percent, owner, accent }) => (
                    <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{title}</p>
                          <p className="text-[11px] text-slate-500">{time}</p>
                        </div>
                        <span className="text-sm font-bold text-slate-800">{percent}%</span>
                      </div>
                      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full ${accent}`} style={{ width: `${percent}%` }} />
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">{owner}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#2B2E33]">Caregiver availability</p>
                  <p className="mt-1 text-xs text-slate-500">Current capacity by assigned zone</p>
                </div>
                <button className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Full roster
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Clinician</th>
                      <th className="px-4 py-3">Zone</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Availability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
                    {teamRoster.map(({ name, role, zone, status, availability }) => (
                      <tr key={name} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-slate-800">{name}</p>
                            <p className="text-[11px] text-slate-500">{role}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span>{zone}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${getStatusClasses(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-linear-to-r from-emerald-400 to-[#0F6B72]"
                                style={{ width: availability }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-600">{availability}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#2B2E33]">Asset utilization</p>
                  <p className="mt-1 text-xs text-slate-500">Medical and room readiness</p>
                </div>
                <Stethoscope className="h-4 w-4 text-[#0F6B72]" />
              </div>

              <div className="mt-4 space-y-4">
                {equipment.map(({ name, total, inUse, available, status }) => {
                  const pct = (inUse / total) * 100;
                  return (
                    <div key={name} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">{name}</p>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{status}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{inUse} in use</span>
                        <span>{available} available</span>
                      </div>
                      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {drawerOpen && (
            <div className="absolute inset-0 z-40 flex justify-end bg-slate-950/20 backdrop-blur-[1px]">
              <aside className="h-full w-full max-w-md border-l border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Assignment drawer</p>
                    <h2 className="mt-1 text-lg font-bold text-[#2B2E33]">{selectedZone}</h2>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                    aria-label="Close assignment drawer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-5 p-5">
                  <div className="rounded-2xl bg-[#EDF8F7] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0F6B72]">Zone status</p>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#0F6B72]">
                        {selectedZoneSummary.risk} risk
                      </span>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-3xl font-bold text-slate-900">{selectedZoneSummary.coverage}%</p>
                        <p className="mt-1 text-xs text-slate-500">coverage index</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-800">{selectedZoneSummary.assigned}</p>
                        <p className="text-[11px] text-slate-500">of {selectedZoneSummary.required} staff assigned</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-[#2B2E33]">Recommended matches</p>
                    <div className="mt-3 space-y-3">
                      {candidateAssignments[selectedZone].map(({ name, role, match, badge }) => (
                        <button
                          key={name}
                          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-[#0F6B72] hover:bg-white"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{name}</p>
                            <p className="text-[11px] text-slate-500">{role}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-bold text-[#0F6B72]">{match}%</p>
                            <p className="text-[10px] font-medium text-slate-500">{badge}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-[#2B2E33]">Recommended action</p>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">Best fit</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Maya Ortega</p>
                        <p className="text-[11px] text-slate-500">RN Lead · available immediately</p>
                      </div>
                      <button className="inline-flex items-center gap-2 rounded-lg bg-[#0F6B72] px-3 py-2 text-xs font-semibold text-white">
                        Assign <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
