import { ClipboardCheck } from 'lucide-react';
import type { CheckInVisit } from '@/services/checkIn';

type VisitDepartureSummaryProps = { visit: CheckInVisit | null; loading: boolean; error: string; durationMinutes: number | null; completed: boolean };

export default function VisitDepartureSummary({ visit, loading, error, durationMinutes, completed }: VisitDepartureSummaryProps) {
	const start = visit?.check_in_at ? new Date(visit.check_in_at) : null;
	const startLabel = start && Number.isFinite(start.getTime()) ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(start) : 'Not recorded';
	return (
		<aside aria-label="Visit summary" className="relative mx-5 my-5 rounded-lg border border-[#e1e6de] bg-[#fffefa]/95 p-4 shadow-[0_4px_20px_rgba(32,63,59,0.08)] sm:absolute sm:top-6 sm:right-6 sm:m-0 sm:w-72 sm:border-white/70 sm:p-5">
			<div className="mb-3 flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#eaf0ed] text-[#678274]"><ClipboardCheck aria-hidden="true" className="size-4" /></span><div><h1 className="text-sm font-bold">Visit Summary</h1><p className="mt-0.5 text-[10px] text-[#68766f] uppercase">{completed ? 'Session complete' : 'Session ending'}</p></div></div>
			{loading && !visit ? <p role="status" className="text-sm text-[#68766f]">Loading visit...</p> : visit ? <>
				<p className="text-[10px] font-semibold text-[#68766f] uppercase">Client</p><p className="mt-1 text-base font-bold wrap-anywhere">{visit.clientName}</p>
				<dl className="mt-3 grid grid-cols-2 gap-3"><div><dt className="text-[10px] font-semibold text-[#68766f] uppercase">Start time</dt><dd className="mt-1 text-xs font-medium">{startLabel}</dd></div><div><dt className="text-[10px] font-semibold text-[#68766f] uppercase">Duration</dt><dd className="mt-1 text-xs font-medium">{durationMinutes === null ? 'Unavailable' : `${durationMinutes} min`}</dd></div></dl>
				<p className="mt-3 text-[10px] font-semibold text-[#68766f] uppercase">Location</p><p className="mt-1 text-xs leading-5 wrap-anywhere text-[#52635c]">{visit.address}</p>
			</> : <p className="text-sm leading-6 text-[#68766f]">{error ? 'Visit unavailable' : 'No visit in progress'}</p>}
		</aside>
	);
}