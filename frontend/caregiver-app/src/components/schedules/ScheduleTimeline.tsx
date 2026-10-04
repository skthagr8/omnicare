import { CalendarDays, Check, WifiOff } from 'lucide-react';
import type { Visit } from '@/types/visit';
import ScheduleVisit from './ScheduleVisit';

type ScheduleTimelineProps = {
	isOnline: boolean;
	visits: Visit[];
	visibleVisits: Visit[];
	loading: boolean;
	error: string;
	clientWarning: boolean;
	priority?: Visit;
	currentTime: number;
	dateLabel: string;
};

export default function ScheduleTimeline({ isOnline, visits, visibleVisits, loading, error, clientWarning, priority, currentTime, dateLabel }: ScheduleTimelineProps) {
	return (
		<div className="mx-auto max-w-4xl px-5 pb-16 sm:px-10 lg:pt-3">
			<div role="status" aria-live="polite" className="flex h-8 items-center gap-2 text-xs text-[#737c7e]">{!isOnline && <><WifiOff aria-hidden="true" className="size-3.5" />Offline · {visits.length ? 'Showing last loaded schedule' : 'Connect to load your schedule'}</>}</div>
			<div className="mb-8 mt-2">
				<h1 className="text-2xl leading-8 font-bold">Daily Schedule</h1>
				<p className="mt-1 text-sm leading-6 text-[#737c7e]">{loading && !visits.length ? 'Loading today\'s visits...' : `You have ${visits.length} scheduled ${visits.length === 1 ? 'visit' : 'visits'} for today.`}</p>
			</div>
			{error && <p role="alert" className="mb-6 border-l-2 border-[#9b745a] pl-3 text-sm leading-6 text-[#79523e]">{error}</p>}
			{clientWarning && <p role="status" className="mb-6 text-sm leading-6 text-[#737c7e]">Some client details are unavailable. Refresh when connected.</p>}
			{loading && !visits.length ? (
				<div role="status" aria-label="Loading schedule" className="space-y-5 sm:ml-20">{[1, 2, 3].map(index => <div key={index} aria-hidden="true" className="h-32 animate-pulse rounded-lg bg-[#efefec] motion-reduce:animate-none" />)}</div>
			) : visibleVisits.length ? (
				<ol aria-label="Today's visits">
					{visibleVisits.map(visit => <ScheduleVisit key={visit.id} visit={visit} highlighted={visit.id === priority?.id} currentTime={currentTime} />)}
				</ol>
			) : (
				<div className="border-t border-[#dedfdd] py-16 text-center"><CalendarDays aria-hidden="true" className="mx-auto mb-4 size-9 text-[#809787]" strokeWidth={1.5} /><h2 className="text-lg font-semibold">{!isOnline && !visits.length ? 'Schedule unavailable offline' : error && !visits.length ? 'Schedule unavailable' : visits.length ? 'No visits match this filter' : 'No visits scheduled today'}</h2></div>
			)}
			{!loading && visits.length > 0 && visits.every(visit => ['completed', 'cancelled', 'missed'].includes(visit.status)) && <div role="status" className="mt-8 text-center"><span className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-[#e6ede5]"><Check aria-hidden="true" className="size-5 text-[#718e7a]" /></span><p className="text-xs font-semibold">Schedule Complete</p><p className="mt-1 text-[10px] text-[#737c7e]">{dateLabel}</p></div>}
		</div>
	);
}