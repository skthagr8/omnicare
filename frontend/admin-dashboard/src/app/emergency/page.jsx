'use client';

import { useState } from 'react';
import { AlertOctagon, CheckCircle2, MapPin, ShieldCheck } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import EmergencyActions from '../../components/emergency/EmergencyActions';
import EmergencyPatientCard from '../../components/emergency/EmergencyPatientCard';
import EmergencyStatusStrip from '../../components/emergency/EmergencyStatusStrip';
import EmergencyTimeline from '../../components/emergency/EmergencyTimeline';
import { PROTOCOL_STAGES } from '../../components/emergency/emergencyData';

export default function EmergencyPage() {
  const [activeStage, setActiveStage] = useState(1);
  const [deliveryState, setDeliveryState] = useState('pending');
  const [notice, setNotice] = useState('');

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };

  const acknowledge = () => {
    setActiveStage((current) => Math.max(current, 1));
    showNotice('Emergency protocol acknowledged and logged.');
  };

  const notifyFamily = () => {
    setDeliveryState('delivered');
    setActiveStage((current) => Math.max(current, 2));
    showNotice('Family notification batch delivered.');
  };

  const dispatchEms = () => {
    setActiveStage((current) => Math.max(current, 3));
    showNotice('EMS dispatch request queued for immediate response.');
  };

  return <div className="flex h-screen w-full overflow-hidden bg-[#F4F6F8]"><Sidebar /><div className="flex min-w-0 flex-1 flex-col"><DashboardHeader timeLabel="14:22" /><header className="relative bg-[#B23A48] px-6 py-4 text-white shadow-[0_5px_18px_-8px_rgba(178,58,72,0.65)]"><div className="flex items-center gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15"><AlertOctagon className="h-6 w-6" /></span><div><h1 className="text-lg font-bold">Eleanor Vance</h1><p className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-white/80"><span className="rounded bg-white/15 px-1.5 py-0.5">EMR-99201</span>Critical Emergency: Unresponsive Signal</p></div><div className="ml-auto flex items-center gap-8 text-right"><div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/65">Caregiver Status</p><p className="mt-1 flex items-center justify-end gap-1.5 text-xs font-bold"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Marcus Johnson (En-Route)</p></div><div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/65">Incident Time</p><p className="mt-1 text-sm font-bold">14:22:05 UTC</p></div></div></div><span className="absolute -bottom-7 right-6 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-700 shadow-sm">Assumed as fallback admin for this org.</span></header><main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-9"><div className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)_250px] gap-5"><div className="space-y-4"><EmergencyTimeline stages={PROTOCOL_STAGES} activeStage={activeStage} /><EmergencyStatusStrip state={deliveryState} onRetry={() => showNotice('Caregiver notification retry queued.')} /><div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-[11px] text-slate-500"><span className="mr-2 text-amber-500">△</span>Note: Emergency dispatch requires visual or audible confirmation per org protocol P-442. <span className="font-semibold text-slate-600">View protocol doc</span></div></div><div className="space-y-4"><EmergencyActions acknowledged={activeStage > 0} onAcknowledge={acknowledge} onNotify={notifyFamily} onDispatch={dispatchEms} /><EmergencyPatientCard /><section className="rounded-lg border border-[#9DD8DD] bg-[#ECF8FA] p-4 text-[11px] text-[#39727A]"><p className="flex items-center gap-2 font-semibold text-[#0F6B72]"><ShieldCheck className="h-3.5 w-3.5" />Protocol Sync Active</p><p className="mt-2 leading-relaxed">This session is being recorded for operational audit. Fallback admin takeover logged at 14:23:12.</p></section><div className="flex items-center gap-2 text-[10px] text-slate-400"><MapPin className="h-3.5 w-3.5" />North Springfield Facility</div></div></div></main><footer className="flex items-center gap-5 border-t border-slate-200 bg-white px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"><span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="h-3 w-3" />Protocol Session: Verified</span><span>LIFE-SUPPORT MONITOR: STABLE</span><span className="ml-auto">v2.4.0-Stable · © 2024 OmniCare Operations</span></footer>{notice && <div className="fixed bottom-6 right-6 z-30 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-xl">{notice}</div>}</div></div>;
}
