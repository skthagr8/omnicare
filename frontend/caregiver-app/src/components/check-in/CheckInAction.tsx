import Link from 'next/link';
import { Check, Crosshair, LoaderCircle, RefreshCw, ShieldCheck, Signal, WifiOff } from 'lucide-react';
import type { useCheckIn } from '@/hooks/useCheckIn';

type CheckInActionProps = { checkInState: ReturnType<typeof useCheckIn> };

export default function CheckInAction({ checkInState: state }: CheckInActionProps) {
	const accuracy = state.location && state.locationFresh && !state.locationError ? state.location.accuracy <= 50 ? 'high' : 'low' : 'unavailable';
	return (
		<section aria-label="Confirm arrival" className="border-t border-[#e1e6de] bg-[#fffefa] px-5 pt-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:px-8">
			<div className="mx-auto max-w-xl">
				{state.visit?.is_demo && <p role="status" className="mb-4 rounded-lg border border-[#e9d39e] bg-[#fff5d9] px-4 py-3 text-center text-xs font-semibold leading-5 text-[#785716]">DEMO DATA / Check-in is disabled for sample visits.</p>}
				<p role="status" className="flex items-center justify-center gap-2 text-xs leading-6 text-[#738078]"><Signal aria-hidden="true" className="size-3.5" />Location accuracy: {state.locating ? 'locating...' : accuracy}{state.location && state.locationFresh && !state.locationError && <span>({Math.round(state.location.accuracy)} m)</span>}</p>
				{!state.isOnline && <p role="status" className="mt-2 flex items-center justify-center gap-2 text-xs text-[#738078]"><WifiOff aria-hidden="true" className="size-3.5" />Connect to save your check-in</p>}
				{state.loadError && <div className="mt-3 text-center"><p role="alert" className="text-sm leading-6 text-[#79523e]">{state.loadError}</p><button type="button" disabled={!state.isOnline || state.loading} onClick={state.reloadVisit} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#287b7c] disabled:opacity-50"><RefreshCw aria-hidden="true" className="size-4" />Retry appointment</button></div>}
				{state.visit && !state.alreadyCheckedIn && <>
					<p className="mt-3 text-center text-sm leading-6 text-[#647169]">Confirm your arrival at the client&apos;s residence. Your check-in will be timestamped for the visit record.</p>
					<div className="mt-3 text-center"><button type="button" disabled={state.locating || state.submitting} onClick={state.requestLocation} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#287b7c] hover:bg-[#eff5f0] focus-visible:outline-2 focus-visible:outline-[#287b7c] disabled:opacity-50"><Crosshair aria-hidden="true" className="size-4" />{state.locating ? 'Finding your location...' : state.location ? 'Refresh location' : 'Use my location'}</button></div>
					{state.locationError && <p role="alert" className="mt-2 text-center text-sm leading-6 text-[#79523e]">{state.locationError}</p>}
					{state.location && !state.locationFresh && !state.locating && <p role="status" className="mt-2 text-center text-xs text-[#738078]">Please refresh your location before checking in.</p>}
					<label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-3 text-sm leading-6 text-[#52635c]"><input type="checkbox" checked={state.manualConfirmed} disabled={state.submitting} onChange={event => state.setManualConfirmed(event.target.checked)} className="size-5 shrink-0 accent-[#247352] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#247352]" /><span>I confirm I am at this client&apos;s residence.</span></label>
				</>}
				{state.submitError && <div className="mt-3 text-center"><p role="alert" className="text-sm leading-6 text-[#79523e]">{state.submitError}</p><button type="button" onClick={state.reloadVisit} disabled={state.loading || !state.isOnline} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#287b7c]"><RefreshCw aria-hidden="true" className="size-4" />Refresh appointment</button></div>}
				<button type="button" onClick={state.checkIn} disabled={!state.canCheckIn} className="mt-4 flex min-h-18 w-full items-center justify-center gap-3 rounded-2xl bg-[#247352] px-6 py-5 text-lg font-bold text-white shadow-[0_4px_0_#19593e,0_8px_18px_rgba(36,115,82,0.12)] transition-[translate,box-shadow,background-color] duration-150 enabled:hover:bg-[#1c6547] focus-visible:outline-2 focus-visible:outline-offset-6 focus-visible:outline-[#247352] enabled:active:translate-y-0.5 enabled:active:shadow-[0_2px_0_#19593e] disabled:cursor-not-allowed disabled:bg-[#688576] disabled:shadow-none motion-reduce:transition-none">{state.submitting ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /> : state.alreadyCheckedIn ? <Check aria-hidden="true" className="size-5" /> : <ShieldCheck aria-hidden="true" className="size-5" />}{state.submitting ? 'Checking in...' : state.alreadyCheckedIn ? 'Checked In' : 'Check In'}</button>
				{state.alreadyCheckedIn && <p className="mt-3 text-center text-sm leading-6 text-[#647169]">Your arrival is recorded. <Link href="/schedules" className="font-semibold text-[#287b7c] underline underline-offset-4">Back to schedule</Link></p>}
			</div>
		</section>
	);
}