import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Clock3, MapPin, Pin, Shield } from 'lucide-react';
import type { QueueVisit } from '@/services/schedule';

const riskStyles = {
	high: { label: 'High fall risk', className: 'bg-[#fbe9e6] text-[#9b4238]' },
	moderate: { label: 'Moderate fall risk', className: 'bg-[#fff1d6] text-[#926116]' },
	low: { label: 'Low fall risk', className: 'bg-[#eaf2e7] text-[#526d4c]' },
	unknown: { label: 'Fall risk unavailable', className: 'bg-[#eef0ed] text-[#657269]' },
};
const statusStyles = {
	scheduled: { label: 'Upcoming', className: 'bg-[#edf3f6] text-[#526f83]' },
	in_progress: { label: 'In Progress', className: 'bg-[#deefea] text-[#246b61]' },
	completed: { label: 'Completed', className: 'bg-[#eaf2e7] text-[#526d4c]' },
	missed: { label: 'Missed', className: 'bg-[#fbe9e6] text-[#9b4238]' },
	cancelled: { label: 'Cancelled', className: 'bg-[#eef0ed] text-[#657269]' },
};

function time(value: string) {
	const date = new Date(value);
	return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date) : 'Time unavailable';
}

export default function PatientQueueCard({ visit, active }: { visit: QueueVisit; active: boolean }) {
	const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
	const risk = riskStyles[visit.fall_risk];
	const status = statusStyles[visit.status] || { label: 'Status unavailable', className: 'bg-[#eef0ed] text-[#657269]' };
	const initials = visit.client_name.split(/\s+/).filter(Boolean).slice(0, 2).map(name => name[0]).join('');
	const photo = visit.patient_photo_url && failedPhoto !== visit.patient_photo_url && /^(https?:\/\/|\/(?!\/))/.test(visit.patient_photo_url) ? visit.patient_photo_url : null;
	return (
		<li>
			<Link href={`/visits/${encodeURIComponent(visit.id)}`} aria-label={`Open Point of Care for ${visit.client_name}, ${status.label}`} aria-current={active ? 'step' : undefined} className={`group block rounded-lg border border-l-4 p-5 transition-[box-shadow,background-color] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#287b7c] sm:p-6 ${active ? 'border-[#d0e4dd] border-l-[#32958b] bg-white shadow-[0_6px_24px_rgba(38,98,80,0.09)]' : 'border-[#e4e8e1] border-l-transparent bg-[#fffefa] hover:bg-white hover:shadow-sm'}`}>
				{active && <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-[#287b7c]"><Pin aria-hidden="true" className="size-3.5" />Current patient</p>}
				<div className="flex items-start gap-4">
					<div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#dce5dd] bg-[#e8eee5] text-lg font-semibold text-[#607967] sm:size-18">{photo ? <img src={photo} alt={`${visit.client_name}'s profile photo`} referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setFailedPhoto(photo)} /> : <span aria-label="Patient photo unavailable">{initials}</span>}</div>
					<div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="text-lg leading-7 font-bold wrap-anywhere text-[#293a36]">{visit.client_name}</h2><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{visit.status === 'completed' && <Check aria-hidden="true" className="size-3" />}{status.label}</span></div>
						<p className="mt-2 flex items-start gap-1.5 text-sm leading-6 text-[#68766d]"><MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" /><span className="wrap-anywhere">{visit.room ? `Room ${visit.room}${visit.client_address ? ` / ${visit.client_address}` : ''}` : visit.client_address || 'Room or address unavailable'}</span></p>
						<p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[#287b7c]"><Clock3 aria-hidden="true" className="size-4 shrink-0" /><span>{time(visit.scheduled_start)} - {time(visit.scheduled_end)}</span></p>
					</div>
					<ChevronRight aria-hidden="true" className="mt-1 hidden size-5 shrink-0 text-[#81938a] sm:block" />
				</div>
				<div className="mt-4 flex items-center justify-between gap-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-5 font-semibold ${risk.className}`}><Shield aria-hidden="true" className="size-3.5 shrink-0" />{risk.label}</span><ChevronRight aria-hidden="true" className="size-5 shrink-0 text-[#81938a] sm:hidden" /></div>
			</Link>
		</li>
	);
}