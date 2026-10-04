import { CheckCircle2, Circle, Clock3, MessageCircle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AssessmentRecord, AssessmentState, InstrumentId } from '@/services/pointOfCare';

type InstrumentCardProps<Id extends string> = {
	instrument: { id: Id; name: string; fullName: string; description: string; icon: LucideIcon };
	current?: Pick<AssessmentRecord, 'state'>;
	lastRecorded?: Pick<AssessmentRecord, 'administered_at' | 'created_at'>;
	available: boolean;
	disabled: boolean;
	onAction: (instrument: Id, state: AssessmentState) => void;
	secondaryActions?: ReactNode;
};

export default function InstrumentCard<Id extends string = InstrumentId>({ instrument, current, lastRecorded, available, disabled, onAction, secondaryActions }: InstrumentCardProps<Id>) {
	const currentState = current?.state || 'pending';
	const timestamp = lastRecorded?.administered_at || lastRecorded?.created_at;
	const recordedLabel = !available ? 'Unavailable' : timestamp && Number.isFinite(Date.parse(timestamp)) ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp)) : 'Never';
	return (
		<article aria-labelledby={`instrument-${instrument.id}`} className="rounded-lg border border-[#e7e9e3] bg-[#fdfcfb] px-5 py-5 shadow-[0_1px_3px_rgba(32,63,59,0.025)] sm:px-6 sm:py-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex min-w-0 flex-1 basis-72 items-start gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eaf3f0] text-[#5a9d99]"><instrument.icon className="size-5" strokeWidth={1.5} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 id={`instrument-${instrument.id}`} className="text-base font-bold wrap-anywhere">{instrument.name}</h3><span className="text-[10px] leading-4 wrap-anywhere text-[#737c77] uppercase">{instrument.fullName}</span></div><p className="mt-2 max-w-sm text-xs leading-5 wrap-anywhere text-[#737c77]">{instrument.description}</p></div></div>
				<div className={`flex items-start gap-3 ${secondaryActions ? 'w-full justify-end sm:w-auto' : ''}`}><div className="text-right"><p className="text-[10px] text-[#737c77] uppercase">Last recorded</p><p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-[#737c77]"><Clock3 aria-hidden="true" className="size-3" />{recordedLabel}</p></div>{secondaryActions}</div>
			</div>
			<div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#e7e9e3] pt-4">
				<p className={`text-xs font-medium ${available && currentState === 'refused' ? 'text-[#9a681c]' : available && currentState === 'completed' ? 'text-[#587360]' : 'text-[#737c77]'}`}>Visit status: {available ? currentState === 'completed' ? 'Completed' : currentState === 'refused' ? 'Refused' : 'Pending' : 'Unavailable'}</p>
				<div role="group" aria-label={`${instrument.name} assessment actions`} className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:grid-cols-[104px_104px_104px]">
					<button type="button" disabled={disabled} onClick={() => onAction(instrument.id, 'pending')} className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[#cdd3d0] bg-[#f6f7f5] px-2 text-xs font-semibold text-[#68736c] hover:bg-[#edf0eb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68736c] disabled:cursor-not-allowed disabled:opacity-65"><Circle aria-hidden="true" className="hidden size-3.5 shrink-0 sm:block" />Pending</button>
					<button type="button" disabled={disabled} onClick={() => onAction(instrument.id, 'refused')} className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[#d4a34d] bg-[#fffaf0] px-2 text-xs font-semibold text-[#94621b] hover:bg-[#fff0d3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bc8a35] disabled:cursor-not-allowed disabled:opacity-65"><MessageCircle aria-hidden="true" className="hidden size-3.5 shrink-0 sm:block" />Refused</button>
					<button type="button" disabled={disabled} onClick={() => onAction(instrument.id, 'completed')} className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[#637862] bg-[#637862] px-2 text-xs font-semibold text-white hover:bg-[#536b54] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#637862] disabled:cursor-not-allowed disabled:opacity-65"><CheckCircle2 aria-hidden="true" className="hidden size-3.5 shrink-0 sm:block" />Complete</button>
				</div>
			</div>
		</article>
	);
}