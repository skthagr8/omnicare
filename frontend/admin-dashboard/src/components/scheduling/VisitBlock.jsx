import { Clock } from 'lucide-react';
import { ACUITY_STYLES } from './scheduleData';

export default function VisitBlock({ visit }) {
  const style = ACUITY_STYLES[visit.acuity];
  return <div className={`absolute inset-y-1.5 rounded-lg border border-slate-200 border-l-4 px-3 py-2 shadow-sm ${style.edge} ${style.fill}`} style={{ left: `calc(${visit.start} * (100% / 6) + 5px)`, width: `calc(${visit.span} * (100% / 6) - 10px)` }}><p className={`truncate text-xs font-bold ${style.text}`}>{visit.client}</p><p className="mt-1 flex items-center gap-1 truncate text-[10px] text-slate-500"><Clock className="h-3 w-3 shrink-0" />{visit.time} · {visit.type}</p></div>;
}
