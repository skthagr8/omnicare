import { Check, Clock3, Compass, MapPin } from 'lucide-react';
import type { Visit } from '@/types/visit';

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function visitTime(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? 'Time unavailable' : timeFormatter.format(date);
}

type ScheduleVisitProps = { visit: Visit; highlighted: boolean; currentTime: number };

export default function ScheduleVisit({ visit, highlighted, currentTime }: ScheduleVisitProps) {
	const completed = visit.status === 'completed';
	const statusLabel = highlighted ? visit.status === 'in_progress' ? 'In progress' : Date.parse(visit.scheduled_start) <= currentTime && Date.parse(visit.scheduled_end) > currentTime ? 'Current visit' : 'Next up' : visit.status.replace('_', ' ');
	const initials = visit.client_name.split(/\s+/).filter(Boolean).slice(0, 2).map(name => name[0]).join('');

	return (
		<li className="relative grid grid-cols-[48px_minmax(0,1fr)] gap-3 pb-5 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-4">
			<div className="relative flex flex-col items-center pt-6 text-center">
				<span aria-hidden="true" className={`z-10 flex size-4 items-center justify-center rounded-full border bg-[#faf9f7] ${highlighted ? 'border-[#63afaf]' : 'border-[#cbd3ce]'}`}>{completed && <Check className="size-3 text-[#829e8d]" />}</span>
				<time dateTime={visit.scheduled_start} className={`z-10 mt-2 bg-[#faf9f7] py-1 text-[10px] leading-4 ${highlighted ? 'text-[#287b7c]' : 'text-[#737c7e]'}`}>{visitTime(visit.scheduled_start)}</time>
				<span aria-hidden="true" className="absolute top-10 bottom-0 w-px bg-[#dce4df]" />
			</div>
			<article aria-label={`${visit.client_name}, ${statusLabel}`} aria-current={highlighted ? 'step' : undefined} className={`overflow-hidden rounded-lg border ${highlighted ? 'border-[#cce4e2] bg-white shadow-[0_8px_24px_rgba(32,63,59,0.08)]' : 'border-[#eeefeb] bg-[#fdfcfb] shadow-[0_1px_3px_rgba(32,63,59,0.025)]'}`}>
				<div className="flex flex-wrap items-center gap-4 px-4 py-5 sm:flex-nowrap sm:px-6 sm:py-6">
					<div aria-hidden="true" className={`flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${completed ? 'bg-[#e8e9e6] text-[#7b8280]' : 'bg-[#dfebe5] text-[#55786c]'}`}>{initials}</div>
					<div className="min-w-0 flex-1 basis-32">
						<div className="flex flex-wrap items-center gap-2"><h2 className="text-base leading-6 font-bold wrap-anywhere">{visit.client_name}</h2>{highlighted && <span className="rounded-full bg-[#63afaf] px-2 py-0.5 text-[9px] font-bold text-white uppercase">{statusLabel}</span>}</div>
						<p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-[#287b7c]"><Clock3 aria-hidden="true" className="mt-1 size-3 shrink-0" /><span><time dateTime={visit.scheduled_start}>{visitTime(visit.scheduled_start)}</time> - <time dateTime={visit.scheduled_end}>{visitTime(visit.scheduled_end)}</time></span></p>
						<p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-[#7b8287]"><MapPin aria-hidden="true" className="mt-1 size-3 shrink-0" /><span className="wrap-anywhere">{visit.client_address || 'Address unavailable'}</span></p>
					</div>
					{!highlighted && <span className="text-[10px] text-[#737c7e] capitalize sm:ml-2">{statusLabel}</span>}
					{visit.client_address && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(visit.client_address)}`} target="_blank" rel="noopener noreferrer" aria-label={`Navigate to ${visit.client_name}`} className={`ml-auto flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287b7c] ${highlighted ? 'border-[#287b7c] bg-[#287b7c] text-white hover:bg-[#226c6d]' : 'border-[#dedfdd] text-[#687174] hover:bg-[#eff1ed]'}`}><Compass aria-hidden="true" className="size-3.5" />Navigate</a>}
				</div>
				{visit.notes && <p className="border-t border-[#e0eeeb] bg-[#f1f7f5] px-5 py-3 text-xs leading-5 text-[#397e7c]">{visit.notes}</p>}
			</article>
		</li>
	);
}