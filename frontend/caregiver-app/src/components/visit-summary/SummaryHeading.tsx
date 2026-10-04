import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import type { CheckInVisit } from '@/services/checkIn';
import { summaryDate, summaryDuration, summaryTime } from './formatters';

type SummaryHeadingProps = { visit: CheckInVisit | null | undefined; loading: boolean; completed: boolean; durationMinutes: number | null };

export default function SummaryHeading({ visit, loading, completed, durationMinutes }: SummaryHeadingProps) {
	return (
		<header className="border-b border-[#edf0eb] bg-[#f3f8f6] px-5 py-8 sm:px-8 sm:py-10">
			<div className="mx-auto max-w-6xl">
				<div className="mb-5 flex flex-wrap items-center gap-4"><Link href={visit ? `/check-out?session_id=${encodeURIComponent(visit.id)}` : '/check-out'} className="inline-flex min-h-10 items-center gap-2 text-xs font-medium text-[#66756d] focus-visible:outline-2 focus-visible:outline-[#287b7c]"><ArrowLeft aria-hidden="true" className="size-3.5" />Back to Checkout</Link>{visit && <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${completed ? 'border-[#d4e1d2] bg-[#f5f9f3] text-[#5a735b]' : 'border-[#e0e4df] bg-[#f7f8f5] text-[#737c77]'}`}>{completed && <Check aria-hidden="true" className="size-3" />}{completed ? 'Visit complete' : 'Visit not finalized'}</span>}</div>
				<h1 className="text-2xl leading-9 font-bold wrap-anywhere sm:text-3xl">Visit Summary{visit && <>: <span className="text-[#287b7c]">{visit.clientName}</span></>}</h1>
				<p className="mt-3 max-w-xl text-sm leading-7 text-[#66756d]">{loading && !visit ? 'Gathering the visit record...' : visit ? `Care recorded on ${summaryDate(visit.check_in_at)} for ${visit.clientName}'s care circle.` : 'Review the care recorded during a completed visit.'}</p>
				<dl aria-label="Visit times" className="mt-6 flex flex-wrap gap-x-9 gap-y-4"><div><dt className="text-[10px] font-semibold text-[#737c77] uppercase">Check-in</dt><dd className="mt-1 text-sm font-bold">{summaryTime(visit?.check_in_at)}</dd></div><div><dt className="text-[10px] font-semibold text-[#737c77] uppercase">Check-out</dt><dd className="mt-1 text-sm font-bold">{summaryTime(visit?.check_out_at)}</dd></div><div><dt className="text-[10px] font-semibold text-[#737c77] uppercase">Duration</dt><dd className="mt-1 text-sm font-bold text-[#287b7c]">{summaryDuration(durationMinutes)}</dd></div></dl>
			</div>
		</header>
	);
}