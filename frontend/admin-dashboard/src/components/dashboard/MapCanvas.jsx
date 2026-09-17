'use client';

import { Filter, Minus, Plus, Radio, Search } from 'lucide-react';
import { PINS, STATUS_STYLES } from './dashboardData';

function MapPin({ pin }) {
  const style = STATUS_STYLES[pin.status];
  const isEmergency = pin.status === 'emergency';
  return (
    <div className="absolute -translate-x-1/2 -translate-y-full" style={{ top: pin.top, left: pin.left }}>
      <div className="mb-1.5 flex flex-col items-center gap-1"><div className="whitespace-nowrap rounded-lg border border-white/60 bg-white/90 px-2.5 py-1 text-center shadow-sm backdrop-blur-sm"><p className="text-[11px] font-semibold text-slate-700">{pin.name}</p><p className={`text-[9px] font-semibold tracking-wide ${style.text}`}>{style.label}</p><p className="text-[9px] text-slate-400">last confirmed {pin.time}</p></div><div className="relative flex h-4 w-4 items-center justify-center">{isEmergency && <span className={`absolute h-4 w-4 animate-ping rounded-full ${style.dot} opacity-50`} />}<span className={`relative h-3 w-3 rounded-full ${style.dot} ring-4 ${style.ring}`} /></div></div>
    </div>
  );
}

function MapControls() {
  return <><div className="absolute left-4 top-4 flex flex-col gap-2"><button className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm hover:bg-slate-50"><Filter className="h-4 w-4 text-slate-500" /></button><button className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm hover:bg-slate-50"><Search className="h-4 w-4 text-slate-500" /></button></div><div className="absolute bottom-24 left-4 flex flex-col overflow-hidden rounded-lg bg-white shadow-sm"><button className="flex h-9 w-9 items-center justify-center border-b border-slate-100 hover:bg-slate-50"><Plus className="h-4 w-4 text-slate-500" /></button><button className="flex h-9 w-9 items-center justify-center hover:bg-slate-50"><Minus className="h-4 w-4 text-slate-500" /></button></div></>;
}

function MapLegend() {
  return <div className="absolute bottom-4 left-4 w-48 rounded-lg bg-white/95 p-3 shadow-sm backdrop-blur-sm"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Map Legend</p><div className="flex flex-col gap-1.5 text-xs text-slate-600"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />Available</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" />En-Route</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-sky-500" />In-Service</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-600" />Emergency</span></div></div>;
}

function OperationsStatusBar() {
  return <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full bg-[#1B2733] px-5 py-2.5 text-xs text-slate-200 shadow-lg"><span className="flex items-center gap-1.5 font-medium text-white"><Radio className="h-3.5 w-3.5 text-emerald-400" />All Systems Operational</span><span className="h-3 w-px bg-white/15" /><span>Response Time <span className="font-semibold text-white">4.2m avg</span></span><span className="h-3 w-px bg-white/15" /><span>Capacity <span className="font-semibold text-white">88.4%</span></span></div>;
}

export default function MapCanvas() {
  return <main className="relative flex-1 overflow-hidden bg-[#DCE3E0]"><div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(163,184,175,0.55) 0%, transparent 45%), radial-gradient(circle at 75% 20%, rgba(150,190,190,0.45) 0%, transparent 50%), radial-gradient(circle at 60% 70%, rgba(180,170,190,0.35) 0%, transparent 55%), radial-gradient(circle at 30% 80%, rgba(160,190,165,0.5) 0%, transparent 45%), linear-gradient(135deg, #DEE4E1 0%, #D6DEDB 100%)' }} /><div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(to right, #1B2733 1px, transparent 1px), linear-gradient(to bottom, #1B2733 1px, transparent 1px)', backgroundSize: '48px 48px' }} />{PINS.map((pin) => <MapPin key={pin.id} pin={pin} />)}<MapControls /><MapLegend /><OperationsStatusBar /></main>;
}
