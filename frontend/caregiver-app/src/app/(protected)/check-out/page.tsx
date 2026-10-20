'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CheckInMap from '@/components/check-in/CheckInMap';
import CheckOutAction from '@/components/check-out/CheckOutAction';
import VisitDepartureSummary from '@/components/check-out/VisitDepartureSummary';
import { useCheckOut } from '@/hooks/useCheckOut';

export default function CheckOutPage() {
	const departure = useCheckOut();
	const center = departure.location || departure.visit?.destination || null;
	const careHref = departure.visit ? `/point-of-care?session_id=${encodeURIComponent(departure.visit.id)}` : '/point-of-care';
	return (
		<main className="caregiver-login min-h-svh bg-[#fffefa] text-[#303d36]">
			<div className="relative">
				<div className="relative h-[64svh] min-h-88">
					<CheckInMap center={center} isOnline={departure.isOnline} isCurrentLocation={Boolean(departure.location)} />
					<Link href={careHref} className="absolute top-5 left-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/70 bg-[#fffefa]/95 px-4 text-xs font-semibold text-[#52635c] shadow-sm focus-visible:outline-2 focus-visible:outline-[#526d86] sm:top-6 sm:left-6"><ArrowLeft aria-hidden="true" className="size-4" />Back to Patient Care</Link>
				</div>
				<VisitDepartureSummary visit={departure.visit} loading={departure.loading} error={departure.loadError} durationMinutes={departure.durationMinutes} completed={departure.alreadyCheckedOut} />
			</div>
			<CheckOutAction departure={departure} />
			<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e1e6de] bg-[#fffefa] px-5 py-4 text-[10px] text-[#738078] sm:px-8"><span>Visit: {departure.visit?.id || 'Not selected'}</span><span>{departure.alreadyCheckedOut ? 'Session complete' : 'Session ending'}{departure.durationMinutes !== null ? ` · ${departure.durationMinutes} min` : ''}</span></footer>
		</main>
	);
}
