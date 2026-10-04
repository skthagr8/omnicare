import { ArrowDownWideNarrow, CalendarDays, RefreshCw, WifiOff } from 'lucide-react';
import type { useSchedule } from '@/hooks/useSchedule';
import type { QueueSort } from '@/services/patientQueue';
import PatientQueueCard from './PatientQueueCard';

export default function PatientQueue({ schedule }: { schedule: ReturnType<typeof useSchedule> }) {
	return (
		<div className="mx-auto max-w-3xl px-5 pb-12 sm:px-8">
			<div role="status" aria-live="polite" className="flex min-h-10 items-center gap-2 text-xs text-[#68766d]">{!schedule.isOnline && <><WifiOff aria-hidden="true" className="size-3.5 shrink-0" />Offline / {schedule.visits.length ? 'Showing last loaded queue' : 'Connect to load your patient queue'}</>}</div>
			<header className="mb-7 flex flex-wrap items-end justify-between gap-5 border-b border-[#e4e8e1] pb-6">
				<div><p className="mb-2 flex items-center gap-2 text-sm text-[#68766d]"><CalendarDays aria-hidden="true" className="size-4" />{schedule.dateLabel}</p><h1 className="text-2xl leading-8 font-bold text-[#293a36]">My Patient Queue</h1><p className="mt-2 text-sm text-[#68766d]">{schedule.loading && !schedule.visits.length ? 'Loading your shift...' : `${schedule.visits.length} ${schedule.visits.length === 1 ? 'visit' : 'visits'} this shift`}</p></div>
				<div className="flex items-center gap-2"><div className="relative"><ArrowDownWideNarrow aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#68766d]" /><select aria-label="Sort patient queue" value={schedule.sort} onChange={event => schedule.setSort(event.target.value as QueueSort)} className="min-h-12 rounded-lg border border-[#cbd8cd] bg-white py-2 pr-8 pl-10 text-sm text-[#40564b] focus:outline-2 focus:outline-[#287b7c]"><option value="time">By time</option><option value="risk">By risk level</option><option value="status">By status</option></select></div><button type="button" aria-label="Refresh patient queue" title="Refresh patient queue" disabled={schedule.loading || !schedule.isOnline} onClick={schedule.refreshSchedule} className="flex size-12 items-center justify-center rounded-lg border border-[#cbd8cd] bg-white text-[#68766d] hover:bg-[#f1f6ee] focus-visible:outline-2 focus-visible:outline-[#287b7c] disabled:opacity-50"><RefreshCw aria-hidden="true" className={`size-4 ${schedule.loading ? 'animate-spin motion-reduce:animate-none' : ''}`} /></button></div>
			</header>
			{schedule.error && <p role="alert" className="mb-5 text-sm leading-6 text-[#79523e]">{schedule.error}</p>}
			{schedule.clientWarning && <p role="status" className="mb-5 text-sm leading-6 text-[#68766d]">Some patient details are unavailable. Refresh when connected.</p>}
			{schedule.loading && !schedule.visits.length ? <div role="status" aria-label="Loading patient queue" className="space-y-5">{[1, 2, 3].map(index => <div key={index} aria-hidden="true" className="h-48 animate-pulse rounded-lg bg-[#edf0e9] motion-reduce:animate-none" />)}</div> : schedule.queueVisits.length ? <ol aria-label="Shift patient queue" className="space-y-5">{schedule.queueVisits.map(visit => <PatientQueueCard key={visit.id} visit={visit} active={visit.id === schedule.activeId} />)}</ol> : <div role="status" className="py-12 text-center"><CalendarDays aria-hidden="true" className="mx-auto mb-4 size-8 text-[#81938a]" /><p className="text-base font-semibold text-[#40564b]">{!schedule.isOnline ? 'Patient queue unavailable offline' : schedule.error ? 'Patient queue unavailable' : 'No patients scheduled this shift'}</p></div>}
		</div>
	);
}