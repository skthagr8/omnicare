import type { ReactNode } from 'react';
import { Check, ClipboardCheck, MessageCircle, Pill, Stethoscope, type LucideIcon } from 'lucide-react';
import type { SummaryAssessment, VisitSummaryContent } from '@/services/visitSummary';
import { summaryTime } from './formatters';

function CareSection({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
	return <section aria-label={title} className="border-b border-[#edf0eb] py-7 first:pt-0"><h2 className="mb-5 flex items-center gap-3 text-base font-bold"><span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-[#edf6f3] text-[#5a9d99]"><Icon className="size-4" strokeWidth={1.75} /></span>{title}</h2>{children}</section>;
}

function assessmentName(type: string) {
	return ({ tug: 'TUG (Timed Up and Go)', cmai: 'CMAI', braden: 'Braden Scale', delirium: 'Delirium Screening', delirium_screen: 'Delirium Screening' } as Record<string, string>)[type] || type.replaceAll('_', ' ');
}

function assessmentResult(record: SummaryAssessment) {
	if (record.state === 'refused') return 'Refused';
	if (record.state === 'pending') return 'Pending';
	if (record.assessment_type === 'tug' && record.tug?.completion_time_sec != null) return `${record.tug.completion_time_sec} sec`;
	if (record.assessment_type === 'cmai' && record.cmai?.total_score != null) return `${record.cmai.total_score} points`;
	if (record.assessment_type === 'braden' && record.braden?.total_score != null) return `${record.braden.total_score} points`;
	if (record.delirium?.cam_positive != null) return `CAM: ${record.delirium.cam_positive ? 'positive' : 'negative'}`;
	return 'Completed';
}

type RecordedCareSectionsProps = { content: VisitSummaryContent | null | undefined; assessments: SummaryAssessment[]; assessmentError: string; assessmentsAvailable: boolean };

export default function RecordedCareSections({ content, assessments, assessmentError, assessmentsAvailable }: RecordedCareSectionsProps) {
	return (
		<div>
			<CareSection title="Completed Tasks" icon={ClipboardCheck}>
				{!content ? <p className="text-sm leading-6 text-[#737c77]">Task records are unavailable for this summary.</p> : content.completed_tasks.length ? <ul className="grid gap-3 sm:grid-cols-2">{content.completed_tasks.map(task => <li key={task.id} className="flex items-start gap-2.5 rounded-lg bg-[#f3f7f1] px-3 py-3 text-sm leading-6"><span aria-hidden="true" className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#82967e] text-white"><Check className="size-3" strokeWidth={2.5} /></span><span className="wrap-anywhere">{task.label}</span></li>)}</ul> : <p className="text-sm text-[#737c77]">No completed tasks recorded.</p>}
			</CareSection>
			<CareSection title="Administered Medications" icon={Pill}>
				{!content ? <p className="text-sm leading-6 text-[#737c77]">Administration records are unavailable for this summary.</p> : content.administered_medications.length ? <ul className="divide-y divide-[#f0f1ec]">{content.administered_medications.map(medication => <li key={medication.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="flex min-w-0 flex-1 items-start gap-2.5"><Pill aria-hidden="true" className="mt-1 size-4 shrink-0 text-[#5a9d99]" /><div className="min-w-0"><h3 className="text-sm font-semibold wrap-anywhere">{medication.medication_name}</h3><p className="mt-1 text-xs leading-5 wrap-anywhere text-[#737c77]">{medication.dosage}</p></div></div><time dateTime={medication.administered_at} className="text-xs text-[#737c77]">{summaryTime(medication.administered_at)}</time></li>)}</ul> : <p className="text-sm text-[#737c77]">No administered medications recorded.</p>}
			</CareSection>
			<CareSection title="Clinical Assessments" icon={Stethoscope}>
				{assessmentError ? <p role="alert" className="text-sm text-[#79523e]">{assessmentError}</p> : !assessmentsAvailable ? <p className="text-sm text-[#737c77]">Assessment records are unavailable for this summary.</p> : assessments.length ? <ul className="space-y-3">{assessments.map(record => <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f7f8f5] px-3 py-3"><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold wrap-anywhere">{assessmentName(record.assessment_type)}</h3>{record.state === 'refused' && record.refused_reason && <p className="mt-1 text-xs leading-5 wrap-anywhere text-[#737c77]">{record.refused_reason}</p>}</div><span aria-label={`${record.state}: ${assessmentResult(record)}`} className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs leading-5 font-semibold wrap-anywhere ${record.state === 'refused' ? 'bg-[#fff1d5] text-[#926116]' : record.state === 'completed' ? 'bg-[#e6f0e7] text-[#49694d]' : 'bg-[#eceeeb] text-[#657167]'}`}>{record.state === 'refused' && <MessageCircle aria-hidden="true" className="size-3 shrink-0" />}{assessmentResult(record)}</span></li>)}</ul> : <p className="text-sm text-[#737c77]">No assessment results recorded for this visit.</p>}
			</CareSection>
		</div>
	);
}