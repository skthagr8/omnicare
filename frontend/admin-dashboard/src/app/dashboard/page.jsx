'use client';

import { useEffect, useState } from 'react';
import {
  Filter,
  Search,
  Plus,
  Minus,
  Bell,
  ChevronDown,
  Radio,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';

const PINS = [
  { id: 'p1', name: 'Marcus J.', status: 'available', time: '14:05', top: '32%', left: '39%' },
  { id: 'p2', name: 'Elena W.', status: 'in-service', time: '14:18', top: '25%', left: '76%' },
  { id: 'p3', name: 'Sarah L.', status: 'en-route', time: '14:20', top: '55%', left: '56%' },
  { id: 'p4', name: 'David K.', status: 'emergency', time: '14:22', top: '48%', left: '68%' },
  { id: 'p5', name: 'Renee P.', status: 'available', time: '14:15', top: '73%', left: '31%' },
];

const STATUS_STYLES = {
  available: { dot: 'bg-emerald-500', ring: 'ring-emerald-500/30', label: 'AVAILABLE', text: 'text-emerald-600' },
  'en-route': { dot: 'bg-amber-500', ring: 'ring-amber-500/30', label: 'EN-ROUTE', text: 'text-amber-600' },
  'in-service': { dot: 'bg-sky-500', ring: 'ring-sky-500/30', label: 'IN-SERVICE', text: 'text-sky-600' },
  emergency: { dot: 'bg-rose-600', ring: 'ring-rose-600/30', label: 'EMERGENCY', text: 'text-rose-600' },
};

const PRIORITY_QUEUE = [
  {
    id: 'C1',
    name: 'Robert Miller',
    age: 78,
    condition: 'Post-Op Recovery',
    acuity: 'critical',
    assignedTo: 'David K.',
    nextWindow: '15:00',
  },
  {
    id: 'C2',
    name: 'Alice Thompson',
    age: 82,
    condition: 'Mobility Support',
    acuity: 'moderate',
    assignedTo: 'Sarah L.',
    nextWindow: '16:30',
  },
  {
    id: 'C3',
    name: 'Henry Ford',
    age: 74,
    condition: 'Routine Wellness',
    acuity: 'routine',
    assignedTo: 'Marcus J.',
    nextWindow: '17:15',
  },
  {
    id: 'C4',
    name: 'Margaret Chen',
    age: 89,
    condition: 'Critical Monitoring',
    acuity: 'critical',
    assignedTo: 'Unassigned',
    nextWindow: '—',
  },
];

const ACUITY_STYLES = {
  critical: 'border-rose-500',
  moderate: 'border-amber-500',
  routine: 'border-emerald-500',
};

const ACUITY_TEXT = {
  critical: 'text-rose-600',
  moderate: 'text-amber-600',
  routine: 'text-emerald-600',
};

function MapPin({ pin }) {
  const style = STATUS_STYLES[pin.status];
  const isEmergency = pin.status === 'emergency';

  return (
    <div className="absolute -translate-x-1/2 -translate-y-full" style={{ top: pin.top, left: pin.left }}>
      <div className="mb-1.5 flex flex-col items-center gap-1">
        <div className="whitespace-nowrap rounded-lg border border-white/60 bg-white/90 px-2.5 py-1 text-center shadow-sm backdrop-blur-sm">
          <p className="text-[11px] font-semibold text-slate-700">{pin.name}</p>
          <p className={`text-[9px] font-semibold tracking-wide ${style.text}`}>{style.label}</p>
          <p className="text-[9px] text-slate-400">last confirmed {pin.time}</p>
        </div>
        <div className="relative flex h-4 w-4 items-center justify-center">
          {isEmergency && (
            <span className={`absolute h-4 w-4 animate-ping rounded-full ${style.dot} opacity-50`} />
          )}
          <span className={`relative h-3 w-3 rounded-full ${style.dot} ring-4 ${style.ring}`} />
        </div>
      </div>
    </div>
  );
}

function ClientCard({ client }) {
  return (
    <div
      className={`rounded-xl border-l-4 bg-white/90 p-4 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.12)] ${ACUITY_STYLES[client.acuity]}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-slate-800">{client.name}</p>
        <span className="text-[10px] font-semibold tracking-wide text-slate-400">ID: {client.id}</span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        Age {client.age} • {client.condition}
      </p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Assigned To</p>
          <p className={`text-xs font-semibold ${ACUITY_TEXT[client.acuity]}`}>{client.assignedTo}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Next Window</p>
          <p className="text-xs font-semibold text-slate-600">{client.nextWindow}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const timeLabel = now.toISOString().slice(11, 16);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
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
          <span className="text-xs text-slate-400">{timeLabel} UTC</span>

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

        {/* Canvas */}
        <div className="relative flex min-h-0 flex-1">
          <main className="relative flex-1 overflow-hidden bg-[#DCE3E0]">
            {/* muted low-saturation basemap */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 30%, rgba(163,184,175,0.55) 0%, transparent 45%),
                  radial-gradient(circle at 75% 20%, rgba(150,190,190,0.45) 0%, transparent 50%),
                  radial-gradient(circle at 60% 70%, rgba(180,170,190,0.35) 0%, transparent 55%),
                  radial-gradient(circle at 30% 80%, rgba(160,190,165,0.5) 0%, transparent 45%),
                  linear-gradient(135deg, #DEE4E1 0%, #D6DEDB 100%)
                `,
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #1B2733 1px, transparent 1px), linear-gradient(to bottom, #1B2733 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />

            {PINS.map((pin) => (
              <MapPin key={pin.id} pin={pin} />
            ))}

            {/* map controls */}
            <div className="absolute left-4 top-4 flex flex-col gap-2">
              <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm hover:bg-slate-50">
                <Filter className="h-4 w-4 text-slate-500" />
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm hover:bg-slate-50">
                <Search className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="absolute bottom-24 left-4 flex flex-col overflow-hidden rounded-lg bg-white shadow-sm">
              <button className="flex h-9 w-9 items-center justify-center border-b border-slate-100 hover:bg-slate-50">
                <Plus className="h-4 w-4 text-slate-500" />
              </button>
              <button className="flex h-9 w-9 items-center justify-center hover:bg-slate-50">
                <Minus className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {/* legend */}
            <div className="absolute bottom-4 left-4 w-48 rounded-lg bg-white/95 p-3 shadow-sm backdrop-blur-sm">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Map Legend
              </p>
              <div className="flex flex-col gap-1.5 text-xs text-slate-600">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Available
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> En-Route
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> In-Service
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-600" /> Emergency
                </span>
              </div>
            </div>

            {/* status bar */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full bg-[#1B2733] px-5 py-2.5 text-xs text-slate-200 shadow-lg">
              <span className="flex items-center gap-1.5 font-medium text-white">
                <Radio className="h-3.5 w-3.5 text-emerald-400" />
                All Systems Operational
              </span>
              <span className="h-3 w-px bg-white/15" />
              <span>
                Response Time <span className="font-semibold text-white">4.2m avg</span>
              </span>
              <span className="h-3 w-px bg-white/15" />
              <span>
                Capacity <span className="font-semibold text-white">88.4%</span>
              </span>
            </div>
          </main>

          {/* frosted glass right panel */}
          <aside className="flex w-80 shrink-0 flex-col border-l border-white/40 bg-white/70 backdrop-blur-xl">
            <div className="flex items-center justify-between px-5 pt-5">
              <p className="text-sm font-semibold text-slate-800">Queue Watch</p>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                5 Active
              </span>
            </div>

            <div className="mx-5 mt-4 flex rounded-lg bg-slate-100/80 p-1">
              <button className="flex-1 rounded-md bg-white py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                Acuity
              </button>
              <button className="flex-1 rounded-md py-1.5 text-xs font-medium text-slate-500">
                Distance
              </button>
            </div>

            <p className="mx-5 mt-5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Priority Focus
            </p>

            <div className="mt-3 flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5">
              {PRIORITY_QUEUE.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>

            <div className="border-t border-slate-200/70 p-4">
              <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F6B72] py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0d5b61]">
                Dispatch Center
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
