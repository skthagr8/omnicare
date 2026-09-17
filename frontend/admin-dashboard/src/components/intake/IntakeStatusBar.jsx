import { Activity, ShieldCheck } from 'lucide-react';

export default function IntakeStatusBar() {
  return <div className="flex items-center justify-between border-t border-slate-200 bg-white px-8 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"><span className="flex items-center gap-1.5"><Activity className="h-3 w-3 text-emerald-500" />System Health: Optimized</span><span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-[#0F6B72]" />HIPAA Compliant Session</span><span>Session ID: INT-992-CHEN&nbsp;&nbsp; v2.4.1</span></div>;
}
