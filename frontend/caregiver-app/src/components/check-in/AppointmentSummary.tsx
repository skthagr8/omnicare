import { Navigation } from 'lucide-react';
import type { CheckInVisit } from '@/services/checkIn';

export default function AppointmentSummary({ visit, loading, error }: { visit: CheckInVisit | null; loading: boolean; error: string }) {
	return (
		<aside aria-label="Current appointment" className="absolute top-20 right-5 left-5 rounded-lg border border-white/70 bg-[#fffefa]/95 p-5 shadow-[0_4px_20px_rgba(32,63,59,0.08)] sm:top-6 sm:right-6 sm:left-auto sm:w-72">
			<div className="mb-4 flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e3efea] text-[#32877c]"><Navigation aria-hidden="true" className="size-4" /></span><div><h1 className="text-sm font-bold">Current Appointment</h1><p className="mt-0.5 text-[10px] text-[#68766f] uppercase">{visit?.check_in_at ? 'Checked in' : 'Arrival confirmation'}</p></div></div>
			{loading ? <p role="status" className="text-sm text-[#68766f]">Loading appointment...</p> : visit ? <><p className="text-[10px] font-semibold text-[#68766f] uppercase">Client name</p><p className="mt-1 text-base font-bold wrap-anywhere">{visit.clientName}</p><p className="mt-3 text-[10px] font-semibold text-[#68766f] uppercase">Destination</p><p className="mt-1 text-sm leading-5 wrap-anywhere text-[#52635c]">{visit.address}</p></> : <p className="text-sm leading-6 text-[#68766f]">{error ? 'Appointment unavailable' : 'No upcoming appointment'}</p>}
		</aside>
	);
}