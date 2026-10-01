import { Info } from 'lucide-react';

const SUMMARY = [
  ['Overall Utilization', '88.4%', '+2.4%', 'text-emerald-600'],
  ['Active Personnel', '412', '-12', 'text-rose-500'],
  ['Total Billed Hours', '18,450.5', '+1.8k', 'text-emerald-600'],
];

export default function ReportSummary() {
  return <div className="mt-5 grid grid-cols-4 gap-4">{SUMMARY.map(([label, value, change, changeClass]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><div className="mt-1.5 flex items-baseline gap-2"><p className="font-mono text-2xl font-bold text-[#2B2E33]">{value}</p><span className={`text-xs font-semibold ${changeClass}`}>{change}</span></div></div>)}<div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Critical Overages<Info className="h-3 w-3" /></div><div className="mt-1.5 flex items-baseline gap-2"><p className="font-mono text-2xl font-bold text-[#2B2E33]">04</p><span className="text-xs font-medium text-slate-400">Steady</span></div></div></div>;
}
