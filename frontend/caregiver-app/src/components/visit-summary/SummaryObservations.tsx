import { FileText } from 'lucide-react';
import type { VisitSummaryContent } from '@/services/visitSummary';
import { summaryTime } from './formatters';

export default function SummaryObservations({ content }: { content: VisitSummaryContent | null | undefined }) {
	return (
		<section aria-label="Observations" className="overflow-hidden rounded-lg border border-[#eceee6] bg-[#fffefa] shadow-[0_4px_18px_rgba(52,63,48,0.04)]">
			<h2 className="flex items-center gap-3 border-b border-[#edf0eb] px-5 py-5 text-base font-bold"><span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-[#edf6f3] text-[#5a9d99]"><FileText className="size-4" /></span>Observations</h2>
			<div className="bg-[repeating-linear-gradient(0deg,transparent,transparent_27px,rgba(113,130,104,0.035)_27px,rgba(113,130,104,0.035)_28px)] px-5 py-6 sm:px-6">
				{!content ? <p className="text-sm leading-7 text-[#737c77]">Observation notes are unavailable for this summary.</p> : content.observations.length ? <ol className="space-y-6">{content.observations.map(observation => <li key={observation.id}><p className="text-sm leading-7 whitespace-pre-wrap wrap-anywhere text-[#526158]">{observation.note}</p><p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs leading-5 text-[#7a847a]">{observation.author_name && <span className="font-medium">{observation.author_name}</span>}<time dateTime={observation.recorded_at}>{summaryTime(observation.recorded_at)}</time></p></li>)}</ol> : <p className="text-sm leading-7 text-[#737c77]">No observations recorded for this visit.</p>}
			</div>
		</section>
	);
}