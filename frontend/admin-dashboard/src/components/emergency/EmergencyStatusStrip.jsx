import { RefreshCw } from 'lucide-react';
import { DELIVERY_STATES } from './emergencyData';

export default function EmergencyStatusStrip({ state = 'pending', onRetry }) {
  const status = DELIVERY_STATES[state];
  return <div className="grid grid-cols-3 gap-3"><div className={`rounded-lg border px-3 py-2 ${DELIVERY_STATES.delivered.tone}`}><p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">Internal System Alert</p><p className="mt-1 flex items-center gap-1.5 text-[10px] font-bold"><span className={`h-1.5 w-1.5 rounded-full ${DELIVERY_STATES.delivered.dot}`} />Confirmed Delivered</p></div><div className={`rounded-lg border px-3 py-2 ${status.tone}`}><p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">Primary Family SMS</p><p className="mt-1 flex items-center gap-1.5 text-[10px] font-bold"><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</p></div><div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700"><p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">On-Call Caregiver</p><p className="mt-1 flex items-center justify-between text-[10px] font-bold">Failed (Retry x2){onRetry && <button onClick={onRetry} aria-label="Retry caregiver notification"><RefreshCw className="h-3.5 w-3.5" /></button>}</p></div></div>;
}
