import { ClipboardList, Pill } from 'lucide-react';
import type { usePointOfCare } from '@/hooks/usePointOfCare';
import InstrumentCard from './InstrumentCard';
import { instruments } from './instruments';

export default function CarePanel({ care }: { care: ReturnType<typeof usePointOfCare> }) {
	return (
		<section id={`care-panel-${care.tab}`} role="tabpanel" aria-labelledby={`care-tab-${care.tab}`} tabIndex={0} className="outline-none focus-visible:ring-2 focus-visible:ring-[#63afaf]">
			{care.tab === 'assessments' ? <>
				<div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Clinical Assessments</h2><p className="mt-1 text-xs leading-5 text-[#737c77]">Required evaluations for the current visit.</p></div><div className="flex items-center gap-3"><span className="text-[10px] text-[#737c77] uppercase">Progress</span><progress aria-label="Resolved assessments" value={care.resolvedCount} max={3} className="h-1.5 w-28 overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[#e6ede8] [&::-webkit-progress-value]:bg-[#63afaf] [&::-moz-progress-bar]:bg-[#63afaf]" /><span className="text-xs text-[#64716b]">{care.resolvedCount}/3</span></div></div>
				{care.context?.assessmentError && <p role="alert" className="mb-5 text-sm leading-6 text-[#79523e]">{care.context.assessmentError}</p>}
				<div className="space-y-5">{instruments.map(instrument => <InstrumentCard key={instrument.id} instrument={instrument} current={care.currentRecords[instrument.id]} lastRecorded={care.context?.assessments.find(record => record.assessment_type === instrument.id)} available={Boolean(care.context?.visit && !care.loading && !care.error && !care.context.assessmentError)} disabled={!care.canRecord} onAction={care.openAction} />)}</div>
			</> : care.tab === 'tasks' ? <><h2 className="mb-6 text-xl font-bold">Visit Tasks</h2><div className="border-y border-[#e7e9e3] py-12 text-center"><ClipboardList aria-hidden="true" className="mx-auto mb-4 size-8 text-[#7b9689]" /><p className="text-sm leading-6 text-[#64716b]">No task list is available for this visit.</p></div></> : <>
				<h2 className="mb-6 text-xl font-bold">Medication</h2>
				{care.context?.medicationError ? <p role="alert" className="text-sm leading-6 text-[#79523e]">{care.context.medicationError}</p> : care.loading ? <p role="status" className="text-sm text-[#64716b]">Loading medications...</p> : care.context?.medications.length ? <ul className="space-y-4">{care.context.medications.map(medication => <li key={medication.id} className="rounded-lg border border-[#e7e9e3] bg-[#fdfcfb] p-5"><div className="flex items-start gap-3"><Pill aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#5a9d99]" /><div><h3 className="text-base font-bold wrap-anywhere">{medication.name}</h3><p className="mt-1 text-sm text-[#64716b]">{medication.dosage}</p><p className="mt-2 text-xs text-[#737c77]">Scheduled window: {medication.window_start_local} - {medication.window_end_local}</p>{medication.instructions && <p className="mt-3 text-sm leading-6 wrap-anywhere text-[#64716b]">{medication.instructions}</p>}</div></div></li>)}</ul> : <div className="border-y border-[#e7e9e3] py-12 text-center"><Pill aria-hidden="true" className="mx-auto mb-4 size-8 text-[#7b9689]" /><p className="text-sm text-[#64716b]">{care.error || !care.visit ? 'Medication list unavailable' : 'No active medications listed'}</p></div>}
			</>}
		</section>
	);
}