import Link from 'next/link';
import { Check, Crosshair, LoaderCircle, LogOut, RefreshCw, Signal, WifiOff } from 'lucide-react';
import type { useCheckOut } from '@/hooks/useCheckOut';

export default function CheckOutAction({ departure: state }: { departure: ReturnType<typeof useCheckOut> }) {
	const accuracy = state.location && state.locationFresh && !state.locationError ? state.location.accuracy <= 50 ? 'high' : 'low' : 'unavailable';
	const hasActiveVisit = state.visit?.status === 'in_progress';
	return (
		<section aria-label="Confirm departure" className="border-t border-[#e1e6de] bg-[#fffefa] px-5 pt-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:px-8">
			<div className="mx-auto max-w-xl">
				{state.visit?.is_demo && <p role="status" className="mb-4 rounded-lg border border-[#e9d39e] bg-[#fff5d9] px-4 py-3 text-center text-xs font-semibold leading-5 text-[#785716]">DEMO DATA / Check-out is disabled for sample visits.</p>}
				<p role="status" className="flex items-center justify-center gap-2 text-xs leading-6 text-[#738078]"><Signal aria-hidden="true" className="size-3.5" />Location accuracy: {state.locating ? 'locating...' : accuracy}{state.location && state.locationFresh && !state.locationError && <span>({Math.round(state.location.accuracy)} m)</span>}</p>
				{!state.isOnline && <p role="status" className="mt-2 flex items-center justify-center gap-2 text-xs text-[#738078]"><WifiOff aria-hidden="true" className="size-3.5" />Connect to save your check-out</p>}
				{state.loadError && <div className="mt-3 text-center"><p role="alert" className="text-sm leading-6 text-[#79523e]">{state.loadError}</p><button type="button" disabled={!state.isOnline || state.loading} onClick={state.reloadVisit} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#526d86] disabled:opacity-50"><RefreshCw aria-hidden="true" className="size-4" />Retry visit</button></div>}
				{hasActiveVisit && !state.alreadyCheckedOut && <>
					<p className="mt-3 text-center text-sm leading-6 text-[#647169]">Confirm your departure from the client&apos;s residence to record the end of this visit.</p>
					<div className="mt-3 text-center"><button type="button" disabled={state.locating || state.submitting} onClick={state.requestLocation} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#526d86] hover:bg-[#eff3f6] focus-visible:outline-2 focus-visible:outline-[#526d86] disabled:opacity-50"><Crosshair aria-hidden="true" className="size-4" />{state.locating ? 'Finding your location...' : state.location ? 'Refresh location' : 'Use my location'}</button></div>
					{state.locationError && <p role="alert" className="mt-2 text-center text-sm leading-6 text-[#79523e]">{state.locationError === 'Location permission denied' ? 'Location access is off. Allow location access in your browser, then try again.' : state.locationError}</p>}
					{state.location && !state.locationFresh && !state.locating && <p role="status" className="mt-2 text-center text-xs text-[#738078]">Please refresh your location before checking out.</p>}
				</>}
				{!state.loading && !state.loadError && !state.visit && <p role="status" className="mt-3 text-center text-sm leading-6 text-[#647169]">No visit is in progress. Return to your schedule to select a visit.</p>}
				{state.visit && !hasActiveVisit && !state.alreadyCheckedOut && <p role="status" className="mt-3 text-center text-sm leading-6 text-[#647169]">This visit has not started. Confirm your arrival before checking out.</p>}
				{state.submitError && <div className="mt-3 text-center"><p role="alert" className="text-sm leading-6 text-[#79523e]">{state.submitError}</p><button type="button" onClick={state.reloadVisit} disabled={state.loading || !state.isOnline || state.submitting} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#526d86]"><RefreshCw aria-hidden="true" className="size-4" />Refresh visit</button></div>}
				<button type="button" onClick={state.checkOut} disabled={!state.canCheckOut} className="mt-4 flex min-h-18 w-full items-center justify-center gap-3 rounded-2xl bg-[#526d86] px-6 py-5 text-lg font-bold text-white shadow-[0_4px_0_#3c5267,0_8px_18px_rgba(82,109,134,0.12)] transition-[translate,box-shadow,background-color] duration-150 enabled:hover:bg-[#455f78] focus-visible:outline-2 focus-visible:outline-offset-6 focus-visible:outline-[#526d86] enabled:active:translate-y-0.5 enabled:active:shadow-[0_2px_0_#3c5267] disabled:cursor-not-allowed disabled:bg-[#788693] disabled:shadow-none motion-reduce:transition-none">{state.submitting ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /> : state.alreadyCheckedOut ? <Check aria-hidden="true" className="size-5" /> : <LogOut aria-hidden="true" className="size-5" />}{state.submitting ? 'Checking out...' : state.alreadyCheckedOut ? 'Checked Out' : 'Check Out'}</button>
				{state.alreadyCheckedOut && <p role="status" className="mt-4 text-center text-sm leading-6 text-[#647169]">Your visit is complete. {state.durationMinutes !== null && <span>Recorded duration: {state.durationMinutes} min. </span>}<Link href={state.visit ? `/visit-summary?session_id=${encodeURIComponent(state.visit.id)}` : '/visit-summary'} className="font-semibold text-[#526d86] underline underline-offset-4">View visit summary</Link></p>}
			</div>
		</section>
	);
}