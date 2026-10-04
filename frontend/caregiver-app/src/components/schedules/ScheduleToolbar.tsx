import { CalendarDays, Filter, RefreshCw, Route } from 'lucide-react';

type ScheduleToolbarProps = {
	dateLabel: string;
	statusFilter: string;
	onFilterChange: (value: string) => void;
	routeUrl: string;
	loading: boolean;
	isOnline: boolean;
	onRefresh: () => void;
};

export default function ScheduleToolbar({ dateLabel, statusFilter, onFilterChange, routeUrl, loading, isOnline, onRefresh }: ScheduleToolbarProps) {
	return (
		<div className="border-b border-[#dedfdd] bg-[#fdfcfb]">
			<div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3 lg:px-10">
				<div className="flex items-center gap-3 text-sm"><CalendarDays aria-hidden="true" className="size-4 text-[#737c7e]" /><span className="font-semibold">{dateLabel}</span><span className="ml-2 border-l border-[#dedfdd] pl-4 text-[#737c7e]">Today</span></div>
				<div className="flex flex-wrap items-center gap-3">
					<div className="relative"><Filter aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#687174]" /><select aria-label="Filter visits" value={statusFilter} onChange={event => onFilterChange(event.target.value)} className="min-h-10 rounded-lg border border-[#dedfdd] bg-transparent py-2 pr-7 pl-9 text-xs text-[#596368] focus:outline-2 focus:outline-[#287b7c]"><option value="all">All visits</option><option value="remaining">Remaining</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="missed">Missed</option></select></div>
					{routeUrl && <a href={routeUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-2 rounded-lg bg-[#287b7c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#226c6d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287b7c]"><Route aria-hidden="true" className="size-4" />Open Route</a>}
					<button type="button" onClick={onRefresh} disabled={loading || !isOnline} aria-label="Refresh schedule" title="Refresh schedule" className="flex size-10 items-center justify-center rounded-lg text-[#737c7e] hover:bg-[#eff1ed] disabled:opacity-40"><RefreshCw aria-hidden="true" className={`size-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} /></button>
				</div>
			</div>
		</div>
	);
}