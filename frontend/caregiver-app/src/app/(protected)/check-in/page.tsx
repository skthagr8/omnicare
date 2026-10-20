'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AppointmentSummary from '@/components/check-in/AppointmentSummary';
import CheckInAction from '@/components/check-in/CheckInAction';
import CheckInMap from '@/components/check-in/CheckInMap';
import CheckInToast from '@/components/check-in/CheckInToast';
import { useCheckIn } from '@/hooks/useCheckIn';

export default function CheckInPage() {
	const state = useCheckIn();
	const center = state.location || state.visit?.destination || null;

	return (
		<main className="caregiver-login min-h-svh bg-[#fffefa] text-[#303d36]">
			<div className="relative h-[64svh] min-h-88">
				<CheckInMap center={center} isOnline={state.isOnline} isCurrentLocation={Boolean(state.location)} />
				<Link href="/schedules" className="absolute top-5 left-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/70 bg-[#fffefa]/95 px-4 text-xs font-semibold text-[#52635c] shadow-sm focus-visible:outline-2 focus-visible:outline-[#287b7c] sm:top-6 sm:left-6"><ArrowLeft aria-hidden="true" className="size-4" />Back to Schedule</Link>
				<AppointmentSummary visit={state.visit} loading={state.loading} error={state.loadError} />
			</div>
			<CheckInAction checkInState={state} />
			<CheckInToast receipt={state.receipt} />
		</main>
	);
}
