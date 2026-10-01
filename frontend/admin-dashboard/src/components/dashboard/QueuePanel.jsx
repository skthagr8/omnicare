'use client';

import { ACUITY_STYLES, ACUITY_TEXT, PRIORITY_QUEUE } from './dashboardData';

function ClientCard({ client }) {
  return (
    <div className={`rounded-xl border-l-4 bg-white/90 p-4 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.12)] ${ACUITY_STYLES[client.acuity]}`}>
      <div className="flex items-start justify-between"><p className="text-sm font-semibold text-slate-800">{client.name}</p><span className="text-[10px] font-semibold tracking-wide text-slate-400">ID: {client.id}</span></div>
      <p className="mt-0.5 text-xs text-slate-500">Age {client.age} • {client.condition}</p>
      <div className="mt-3 flex items-end justify-between">
        <div><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Assigned To</p><p className={`text-xs font-semibold ${ACUITY_TEXT[client.acuity]}`}>{client.assignedTo}</p></div>
        <div className="text-right"><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Next Window</p><p className="text-xs font-semibold text-slate-600">{client.nextWindow}</p></div>
      </div>
    </div>
  );
}

export default function QueuePanel() {
  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-white/40 bg-white/70 backdrop-blur-xl">
      <div className="flex items-center justify-between px-5 pt-5"><p className="text-sm font-semibold text-slate-800">Queue Watch</p><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">5 Active</span></div>
      <div className="mx-5 mt-4 flex rounded-lg bg-slate-100/80 p-1"><button className="flex-1 rounded-md bg-white py-1.5 text-xs font-semibold text-slate-700 shadow-sm">Acuity</button><button className="flex-1 rounded-md py-1.5 text-xs font-medium text-slate-500">Distance</button></div>
      <p className="mx-5 mt-5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Priority Focus</p>
      <div className="mt-3 flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5">{PRIORITY_QUEUE.map((client) => <ClientCard key={client.id} client={client} />)}</div>
      <div className="border-t border-slate-200/70 p-4"><button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F6B72] py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0d5b61]">Dispatch Center</button></div>
    </aside>
  );
}
