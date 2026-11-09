'use client';

import { BellRing, Check, CheckCircle2, Circle, Clock3, PhoneCall, RefreshCw, Siren, UserRound } from 'lucide-react';

// --- Data ---
export const PROTOCOL_STAGES = [
  { id: 'alert', label: 'Alert Triggered', detail: 'Emergency SOS signal received from Room 402 wearable.', time: '14:22:05' },
  { id: 'acknowledged', label: 'Acknowledged', detail: 'Protocol takeover initiated by fallback admin.', time: '14:23:12' },
  { id: 'family', label: 'Family Notified', detail: 'Automated notification queue pending primary contact reply.', time: null },
  { id: 'ems', label: 'EMS Dispatched', detail: 'Emergency medical services request on standby.', time: null },
  { id: 'arrival', label: 'Estimated Arrival', detail: 'Awaiting responder GPS signal.', time: null },
];

export const DELIVERY_STATES = {
  pending: { label: 'Message Pending', dot: 'bg-amber-400 animate-pulse', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  delivered: { label: 'Confirmed Delivered', dot: 'bg-teal-500', tone: 'border-teal-200 bg-teal-50 text-teal-700' },
  failed: { label: 'Failed (Retry x2)', dot: 'bg-rose-500', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
};

// --- EmergencyActions ---
export function EmergencyActions({ acknowledged, onAcknowledge, onNotify, onDispatch }) {
  return <section className="rounded-3xl border border-coral-soft bg-white p-5 shadow-[0_4px_18px_-10px_rgba(15,23,42,0.2)]"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Immediate Protocol Actions</p><div className="mt-4 space-y-2.5"><button onClick={onAcknowledge} disabled={acknowledged} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1b8a7f] disabled:bg-slate-300"><CheckCircle2 className="h-4 w-4" />{acknowledged ? 'Alert Acknowledged' : 'Acknowledge Alert'}</button><button onClick={onNotify} className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"><PhoneCall className="h-4 w-4" />Notify Family (Batch)</button><button onClick={onDispatch} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#be123c] py-3 text-sm font-semibold text-white shadow-[0_6px_16px_-7px_rgba(178,58,72,0.65)] hover:bg-[#be123c]"><Siren className="h-4 w-4" />Dispatch EMS Immediately</button></div><div className="mt-5 flex items-center gap-3 rounded-2xl border border-coral-soft bg-cream p-3 shadow-sm"><BellRing className="h-5 w-5 text-teal" /><div><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Responder ETA</p><p className="text-xs font-semibold text-slate-700">8.4 Miles (Est. 12 mins)</p></div></div></section>;
}

// --- EmergencyPatientCard ---
export function EmergencyPatientCard() {
  return <section className="rounded-3xl border border-coral-soft bg-white p-5 shadow-[0_4px_18px_-10px_rgba(15,23,42,0.2)]"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-deep/50 text-slate-400"><UserRound className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-slate-700">Eleanor Vance</p><p className="text-[10px] text-slate-400">Age 82 · Room 402</p></div></div><div className="mt-4 divide-y divide-coral-soft text-[11px]"><div className="flex justify-between py-2.5"><span className="text-slate-400">Primary Condition</span><span className="font-semibold text-slate-700">Post-Op Cardiology</span></div><div className="flex justify-between py-2.5"><span className="text-slate-400">Allergies</span><span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-semibold text-rose-600">Penicillin</span></div><div className="flex justify-between py-2.5"><span className="text-slate-400">Emergency Contact</span><span className="font-semibold text-teal">David Vance (Son)</span></div></div></section>;
}

// --- EmergencyStatusStrip ---
export function EmergencyStatusStrip({ state = 'pending', onRetry }) {
  const status = DELIVERY_STATES[state];
  return <div className="grid grid-cols-3 gap-3"><div className={`rounded-lg border px-3 py-2 ${DELIVERY_STATES.delivered.tone}`}><p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">Internal System Alert</p><p className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold"><span className={`h-1.5 w-1.5 rounded-full ${DELIVERY_STATES.delivered.dot}`} />Confirmed Delivered</p></div><div className={`rounded-lg border px-3 py-2 ${status.tone}`}><p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">Primary Family SMS</p><p className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold"><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</p></div><div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700"><p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">On-Call Caregiver</p><p className="mt-1 flex items-center justify-between text-[10px] font-semibold">Failed (Retry x2){onRetry && <button onClick={onRetry} aria-label="Retry caregiver notification"><RefreshCw className="h-3.5 w-3.5" /></button>}</p></div></div>;
}

// --- EmergencyTimeline ---
export function EmergencyTimeline({ stages = PROTOCOL_STAGES, activeStage }) {
  return <section className="rounded-2xl border border-coral-soft bg-white shadow-[0_4px_18px_-10px_rgba(15,23,42,0.2)]"><div className="flex items-center justify-between border-b border-coral-soft px-5 py-4"><h2 className="text-sm font-semibold text-ink">Active Protocol Timeline</h2><span className="rounded-full border border-coral-soft px-2.5 py-1 text-[10px] font-mono text-slate-500">Elapsed: 04:02s</span></div><div className="px-6 py-5">{stages.map((stage, index) => { const completed = index < activeStage; const active = index === activeStage; return <div key={stage.id} className="relative flex gap-4 pb-7 last:pb-0"><div className="relative flex w-5 shrink-0 justify-center">{index < stages.length - 1 && <span className={`absolute top-5 h-full w-px ${completed ? 'bg-teal' : 'bg-cream-deep'}`} />}<span className={`relative z-[1] flex h-5 w-5 items-center justify-center rounded-full border ${completed ? 'border-teal bg-teal text-white' : active ? 'border-amber-400 bg-amber-400 text-white shadow-[0_0_0_5px_rgba(245,158,11,0.13)] animate-pulse' : 'border-coral-soft bg-white text-slate-300'}`}>{completed ? <Check className="h-3 w-3" /> : active ? <Clock3 className="h-3 w-3" /> : <Circle className="h-2 w-2" />}</span></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className={`text-sm font-semibold ${completed ? 'text-teal' : active ? 'text-amber-700' : 'text-slate-400'}`}>{stage.label}</p>{stage.time && <span className="rounded bg-cream-deep/50 px-2 py-0.5 text-[10px] font-mono text-slate-400">{stage.time}</span>}</div><p className={`mt-1 text-xs leading-relaxed ${completed || active ? 'text-slate-500' : 'text-slate-400'}`}>{stage.detail}</p></div></div>; })}</div></section>;
}
