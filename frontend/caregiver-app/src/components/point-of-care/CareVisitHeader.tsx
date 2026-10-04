import Link from 'next/link';
import { ArrowLeft, ShieldCheck, UserRound } from 'lucide-react';
import type { CheckInVisit } from '@/services/checkIn';

export default function CareVisitHeader({ visit, loading }: { visit: CheckInVisit | null | undefined; loading: boolean }) {
	return (
		<section aria-label="Current client" className="border-b border-[#dedfdd] bg-[#fdfcfb] px-5 py-5 sm:px-8">
			<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
				<div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#e2ece6] text-[#58786c]"><UserRound className="size-6" /></span><div className="min-w-0"><h1 className="text-xl leading-7 font-bold wrap-anywhere">{loading && !visit ? 'Loading visit...' : visit?.clientName || 'Point of Care'}</h1><p className="mt-1 text-xs leading-5 wrap-anywhere text-[#737c77]">{visit?.address || 'Visit workspace'}</p></div></div>
				<div className="flex flex-wrap items-center gap-3"><Link href="/schedules" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs text-[#64716b] hover:bg-[#eff4ef] focus-visible:outline-2 focus-visible:outline-[#287b7c]"><ArrowLeft aria-hidden="true" className="size-4" />Back to Schedule</Link>{visit && (visit.status === 'in_progress' ? <><span className="flex items-center gap-2 text-xs font-semibold text-[#4c7361]"><ShieldCheck aria-hidden="true" className="size-4" />Visit in progress</span><Link href={`/check-out?session_id=${encodeURIComponent(visit.id)}`} className="inline-flex min-h-11 items-center rounded-lg border border-[#bcc8d2] px-4 text-xs font-semibold text-[#526d86] hover:bg-[#eff3f6] focus-visible:outline-2 focus-visible:outline-[#526d86]">Check Out</Link></> : <Link href={`/check-in?session_id=${encodeURIComponent(visit.id)}`} className="inline-flex min-h-11 items-center rounded-lg bg-[#287b7c] px-4 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287b7c]">Confirm Arrival</Link>)}</div>
			</div>
		</section>
	);
}