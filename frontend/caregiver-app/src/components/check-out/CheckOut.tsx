'use client';

import { ClipboardCheck, Check, Crosshair, LoaderCircle, LogOut, RefreshCw, Signal, WifiOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { CheckInVisit } from '../../services/visits';
import { useCheckOut } from '../../hooks/useVisitFlow';
import { CheckInMap } from '../check-in/CheckIn';

// --- VisitDepartureSummary ---
type VisitDepartureSummaryProps = { visit: CheckInVisit | null; loading: boolean; error: string; durationMinutes: number | null; completed: boolean };

export function VisitDepartureSummary({ visit, loading, error, durationMinutes, completed }: VisitDepartureSummaryProps) {
	const start = visit?.check_in_at ? new Date(visit.check_in_at) : null;
	const startLabel = start && Number.isFinite(start.getTime()) ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(start) : 'Not recorded';
	return (
		<aside aria-label="Visit summary" className="relative mx-5 my-5 rounded-2xl border border-coral-soft bg-cream/95 p-4 shadow-[0_4px_20px_rgba(36,38,43,0.08)] sm:absolute sm:top-6 sm:right-6 sm:m-0 sm:w-72 sm:border-white/70 sm:p-5">
			<div className="mb-3 flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f6e8dd] text-[#475569]"><ClipboardCheck aria-hidden="true" className="size-4" /></span><div><h1 className="text-sm font-semibold">Visit Summary</h1><p className="mt-0.5 text-[10px] text-[#475569] uppercase tracking-wide">{completed ? 'Session complete' : 'Session ending'}</p></div></div>
			{loading && !visit ? <p role="status" className="text-sm text-[#475569]">Loading visit...</p> : visit ? <>
				<p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide">Client</p><p className="mt-1 text-base font-semibold wrap-anywhere">{visit.clientName}</p>
				<dl className="mt-3 grid grid-cols-2 gap-3"><div><dt className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide">Start time</dt><dd className="mt-1 text-xs font-medium">{startLabel}</dd></div><div><dt className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide">Duration</dt><dd className="mt-1 text-xs font-medium">{durationMinutes === null ? 'Unavailable' : `${durationMinutes} min`}</dd></div></dl>
				<p className="mt-3 text-[10px] font-semibold text-[#475569] uppercase tracking-wide">Location</p><p className="mt-1 text-xs leading-5 wrap-anywhere text-[#334155]">{visit.address}</p>
			</> : <p className="text-sm leading-6 text-[#475569]">{error ? 'Visit unavailable' : 'No visit in progress'}</p>}
		</aside>
	);
}

// --- CheckOutAction ---
export function CheckOutAction({ departure: state }: { departure: ReturnType<typeof useCheckOut> }) {
	const accuracy = state.location && state.locationFresh && !state.locationError ? state.location.accuracy <= 50 ? 'high' : 'low' : 'unavailable';
	const hasActiveVisit = state.visit?.status === 'in_progress';
	return (
		<section aria-label="Confirm departure" className="border-t border-coral-soft bg-cream px-5 pt-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:px-8">
			<div className="mx-auto max-w-xl">
				<p role="status" className="flex items-center justify-center gap-2 text-xs leading-6 text-[#475569]"><Signal aria-hidden="true" className="size-3.5" />Location accuracy: {state.locating ? 'locating...' : accuracy}{state.location && state.locationFresh && !state.locationError && <span>({Math.round(state.location.accuracy)} m)</span>}</p>
				{!state.isOnline && <p role="status" className="mt-2 flex items-center justify-center gap-2 text-xs text-[#475569]"><WifiOff aria-hidden="true" className="size-3.5" />Connect to save your check-out</p>}
				{state.loadError && <div className="mt-3 text-center"><p role="alert" className="text-sm leading-6 text-[#b45309]">{state.loadError}</p><button type="button" disabled={!state.isOnline || state.loading} onClick={state.reloadVisit} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#475569] disabled:opacity-50"><RefreshCw aria-hidden="true" className="size-4" />Retry visit</button></div>}
				{hasActiveVisit && !state.alreadyCheckedOut && <>
					<p className="mt-3 text-center text-sm leading-6 text-[#334155]">Confirm your departure from the client&apos;s residence to record the end of this visit.</p>
					<div className="mt-3 text-center"><button type="button" disabled={state.locating || state.submitting} onClick={state.requestLocation} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#475569] hover:bg-cream focus-visible:outline-2 focus-visible:outline-[#475569] disabled:opacity-50"><Crosshair aria-hidden="true" className="size-4" />{state.locating ? 'Finding your location...' : state.location ? 'Refresh location' : 'Use my location'}</button></div>
					{state.locationError && <p role="alert" className="mt-2 text-center text-sm leading-6 text-[#b45309]">{state.locationError === 'Location permission denied' ? 'Location access is off. Allow location access in your browser, then try again.' : state.locationError}</p>}
					{state.location && !state.locationFresh && !state.locating && <p role="status" className="mt-2 text-center text-xs text-[#475569]">Please refresh your location before checking out.</p>}
				</>}
				{!state.loading && !state.loadError && !state.visit && <p role="status" className="mt-3 text-center text-sm leading-6 text-[#334155]">No visit is in progress. Return to your schedule to select a visit.</p>}
				{state.visit && !hasActiveVisit && !state.alreadyCheckedOut && <p role="status" className="mt-3 text-center text-sm leading-6 text-[#334155]">This visit has not started. Confirm your arrival before checking out.</p>}
				{state.submitError && <div className="mt-3 text-center"><p role="alert" className="text-sm leading-6 text-[#b45309]">{state.submitError}</p><button type="button" onClick={state.reloadVisit} disabled={state.loading || !state.isOnline || state.submitting} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#475569]"><RefreshCw aria-hidden="true" className="size-4" />Refresh visit</button></div>}
				<button type="button" onClick={state.checkOut} disabled={!state.canCheckOut} className="mt-4 flex min-h-18 w-full items-center justify-center gap-3 rounded-2xl bg-[#475569] px-6 py-5 text-lg font-semibold text-white shadow-[0_4px_0_#334155,0_8px_18px_rgba(36,38,43,0.12)] transition-[translate,box-shadow,background-color] duration-150 enabled:hover:bg-[#334155] focus-visible:outline-2 focus-visible:outline-offset-6 focus-visible:outline-[#475569] enabled:active:translate-y-0.5 enabled:active:shadow-[0_2px_0_#334155] disabled:cursor-not-allowed disabled:bg-[#64748b] disabled:shadow-none motion-reduce:transition-none">{state.submitting ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /> : state.alreadyCheckedOut ? <Check aria-hidden="true" className="size-5" /> : <LogOut aria-hidden="true" className="size-5" />}{state.submitting ? 'Checking out...' : state.alreadyCheckedOut ? 'Checked Out' : 'Check Out'}</button>
				{state.alreadyCheckedOut && <p role="status" className="mt-4 text-center text-sm leading-6 text-[#334155]">Your visit is complete. {state.durationMinutes !== null && <span>Recorded duration: {state.durationMinutes} min. </span>}<Link href={state.visit ? `/visit-summary?session_id=${encodeURIComponent(state.visit.id)}` : '/visit-summary'} className="font-semibold text-[#475569] underline underline-offset-4">View visit summary</Link></p>}
			</div>
		</section>
	);
}

// --- check-out page ---
export function CheckOutScreen() {
	const departure = useCheckOut();
	const center = departure.location || departure.visit?.destination || null;
	const careHref = departure.visit ? `/point-of-care?session_id=${encodeURIComponent(departure.visit.id)}` : '/point-of-care';
	return (
		<main className="caregiver-login min-h-svh bg-cream text-ink">
			<div className="relative">
				<div className="relative h-[64svh] min-h-88">
					<CheckInMap center={center} isOnline={departure.isOnline} isCurrentLocation={Boolean(departure.location)} />
					<Link href={careHref} className="absolute top-5 left-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/70 bg-cream/95 px-4 text-xs font-semibold text-[#334155] shadow-sm focus-visible:outline-2 focus-visible:outline-[#475569] sm:top-6 sm:left-6"><ArrowLeft aria-hidden="true" className="size-4" />Back to Patient Care</Link>
				</div>
				<VisitDepartureSummary visit={departure.visit} loading={departure.loading} error={departure.loadError} durationMinutes={departure.durationMinutes} completed={departure.alreadyCheckedOut} />
			</div>
			<CheckOutAction departure={departure} />
			<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-coral-soft bg-cream px-5 py-4 text-[10px] text-[#475569] sm:px-8"><span>Visit: {departure.visit?.id || 'Not selected'}</span><span>{departure.alreadyCheckedOut ? 'Session complete' : 'Session ending'}{departure.durationMinutes !== null ? ` · ${departure.durationMinutes} min` : ''}</span></footer>
		</main>
	);
}
