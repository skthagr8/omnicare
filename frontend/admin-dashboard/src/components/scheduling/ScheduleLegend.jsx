import { Users } from 'lucide-react';

export default function ScheduleLegend() {
  return <div className="absolute bottom-6 right-6 w-52 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-[0_10px_24px_-12px_rgba(15,23,42,0.32)] backdrop-blur-sm"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Acuity Legend</p><div className="mt-3 space-y-2 text-xs text-slate-600"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />Critical / Urgent</span><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Stable / Monitoring</span><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Routine / Wellness</span></div><div className="mt-4 border-t border-slate-100 pt-3 text-[10px] font-semibold text-[#0F6B72]"><Users className="mr-1 inline h-3.5 w-3.5" />18 Active Personnel</div></div>;
}
