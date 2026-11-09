'use client';

import Link from 'next/link';
import {
	ArrowLeft,
	Check,
	FileText,
	ClipboardCheck,
	MessageCircle,
	Pill,
	Stethoscope,
	type LucideIcon,
	LoaderCircle,
	Send,
	WifiOff,
	RefreshCw,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { CheckInVisit, VisitSummaryContent, SummaryAssessment } from '../../services/visits';
import { useVisitSummary } from '../../hooks/useVisitFlow';

// --- formatters ---
export function summaryTime(value: string | null | undefined) {
	const date = value ? new Date(value) : null;
	return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date) : 'Not recorded';
}

export function summaryDate(value: string | null | undefined) {
	const date = value ? new Date(value) : null;
	return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(date) : 'Date unavailable';
}

export function summaryDuration(minutes: number | null) {
	if (minutes === null) return 'Not recorded';
	if (minutes < 60) return `${minutes} min`;
	return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;
}

// --- SummaryHeading ---
type SummaryHeadingProps = { visit: CheckInVisit | null | undefined; loading: boolean; completed: boolean; durationMinutes: number | null };

export function SummaryHeading({ visit, loading, completed, durationMinutes }: SummaryHeadingProps) {
	return (
		<header className="border-b border-cream bg-[#f2fbf9] px-5 py-8 sm:px-8 sm:py-10">
			<div className="mx-auto max-w-6xl">
				<div className="mb-5 flex flex-wrap items-center gap-4"><Link href={visit ? `/check-out?session_id=${encodeURIComponent(visit.id)}` : '/check-out'} className="inline-flex min-h-10 items-center gap-2 text-xs font-medium text-[#475569] focus-visible:outline-2 focus-visible:outline-teal"><ArrowLeft aria-hidden="true" className="size-3.5" />Back to Checkout</Link>{visit && <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${completed ? 'border-teal-soft bg-[#f2fbf9] text-[#334155]' : 'border-[#f6e8dd] bg-cream text-[#475569]'}`}>{completed && <Check aria-hidden="true" className="size-3" />}{completed ? 'Visit complete' : 'Visit not finalized'}</span>}</div>
				<h1 className="text-2xl leading-9 font-semibold wrap-anywhere sm:text-3xl">Visit Summary{visit && <>: <span className="text-teal">{visit.clientName}</span></>}</h1>
				<p className="mt-3 max-w-xl text-sm leading-7 text-[#475569]">{loading && !visit ? 'Gathering the visit record...' : visit ? `Care recorded on ${summaryDate(visit.check_in_at)} for ${visit.clientName}'s care circle.` : 'Review the care recorded during a completed visit.'}</p>
				<dl aria-label="Visit times" className="mt-6 flex flex-wrap gap-x-9 gap-y-4"><div><dt className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide">Check-in</dt><dd className="mt-1 text-sm font-semibold">{summaryTime(visit?.check_in_at)}</dd></div><div><dt className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide">Check-out</dt><dd className="mt-1 text-sm font-semibold">{summaryTime(visit?.check_out_at)}</dd></div><div><dt className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide">Duration</dt><dd className="mt-1 text-sm font-semibold text-teal">{summaryDuration(durationMinutes)}</dd></div></dl>
			</div>
		</header>
	);
}

// --- SummaryObservations ---
export function SummaryObservations({ content }: { content: VisitSummaryContent | null | undefined }) {
	return (
		<section aria-label="Observations" className="overflow-hidden rounded-2xl border border-coral-soft bg-cream shadow-[0_4px_18px_rgba(36,38,43,0.04)]">
			<h2 className="flex items-center gap-3 border-b border-cream px-5 py-5 text-base font-semibold"><span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-teal-soft text-teal"><FileText className="size-4" /></span>Observations</h2>
			<div className="bg-[repeating-linear-gradient(0deg,transparent,transparent_27px,rgba(244,123,79,0.035)_27px,rgba(244,123,79,0.035)_28px)] px-5 py-6 sm:px-6">
				{!content ? <p className="text-sm leading-7 text-[#475569]">Observation notes are unavailable for this summary.</p> : content.observations.length ? <ol className="space-y-6">{content.observations.map(observation => <li key={observation.id}><p className="text-sm leading-7 whitespace-pre-wrap wrap-anywhere text-[#334155]">{observation.note}</p><p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs leading-5 text-[#475569]">{observation.author_name && <span className="font-medium">{observation.author_name}</span>}<time dateTime={observation.recorded_at}>{summaryTime(observation.recorded_at)}</time></p></li>)}</ol> : <p className="text-sm leading-7 text-[#475569]">No observations recorded for this visit.</p>}
			</div>
		</section>
	);
}

// --- RecordedCareSections ---
function CareSection({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
	return <section aria-label={title} className="border-b border-cream py-7 first:pt-0"><h2 className="mb-5 flex items-center gap-3 text-base font-semibold"><span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-teal-soft text-teal"><Icon className="size-4" strokeWidth={1.75} /></span>{title}</h2>{children}</section>;
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

export function RecordedCareSections({ content, assessments, assessmentError, assessmentsAvailable }: RecordedCareSectionsProps) {
	return (
		<div>
			<CareSection title="Completed Tasks" icon={ClipboardCheck}>
				{!content ? <p className="text-sm leading-6 text-[#475569]">Task records are unavailable for this summary.</p> : content.completed_tasks.length ? <ul className="grid gap-3 sm:grid-cols-2">{content.completed_tasks.map(task => <li key={task.id} className="flex items-start gap-2.5 rounded-lg bg-[#f2fbf9] px-3 py-3 text-sm leading-6"><span aria-hidden="true" className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#64748b] text-white"><Check className="size-3" strokeWidth={2.5} /></span><span className="wrap-anywhere">{task.label}</span></li>)}</ul> : <p className="text-sm text-[#475569]">No completed tasks recorded.</p>}
			</CareSection>
			<CareSection title="Administered Medications" icon={Pill}>
				{!content ? <p className="text-sm leading-6 text-[#475569]">Administration records are unavailable for this summary.</p> : content.administered_medications.length ? <ul className="divide-y divide-cream">{content.administered_medications.map(medication => <li key={medication.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="flex min-w-0 flex-1 items-start gap-2.5"><Pill aria-hidden="true" className="mt-1 size-4 shrink-0 text-teal" /><div className="min-w-0"><h3 className="text-sm font-semibold wrap-anywhere">{medication.medication_name}</h3><p className="mt-1 text-xs leading-5 wrap-anywhere text-[#475569]">{medication.dosage}</p></div></div><time dateTime={medication.administered_at} className="text-xs text-[#475569]">{summaryTime(medication.administered_at)}</time></li>)}</ul> : <p className="text-sm text-[#475569]">No administered medications recorded.</p>}
			</CareSection>
			<CareSection title="Clinical Assessments" icon={Stethoscope}>
				{assessmentError ? <p role="alert" className="text-sm text-[#b45309]">{assessmentError}</p> : !assessmentsAvailable ? <p className="text-sm text-[#475569]">Assessment records are unavailable for this summary.</p> : assessments.length ? <ul className="space-y-3">{assessments.map(record => <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-cream px-3 py-3"><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold wrap-anywhere">{assessmentName(record.assessment_type)}</h3>{record.state === 'refused' && record.refused_reason && <p className="mt-1 text-xs leading-5 wrap-anywhere text-[#475569]">{record.refused_reason}</p>}</div><span aria-label={`${record.state}: ${assessmentResult(record)}`} className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs leading-5 font-semibold wrap-anywhere ${record.state === 'refused' ? 'bg-[#fef3c7] text-[#b45309]' : record.state === 'completed' ? 'bg-teal-soft text-[#334155]' : 'bg-[#f6e8dd] text-[#334155]'}`}>{record.state === 'refused' && <MessageCircle aria-hidden="true" className="size-3 shrink-0" />}{assessmentResult(record)}</span></li>)}</ul> : <p className="text-sm text-[#475569]">No assessment results recorded for this visit.</p>}
			</CareSection>
		</div>
	);
}

// --- FamilyShareAction ---
export function FamilyShareAction({ summary }: { summary: ReturnType<typeof useVisitSummary> }) {
	const recipientCount = summary.data?.content?.authorized_recipient_count || 0;
	return (
		<section aria-label="Family sharing" className="mt-8 border-t border-cream pt-7">
			{!summary.isOnline && <p role="status" className="mb-3 flex items-center gap-2 text-sm text-[#475569]"><WifiOff aria-hidden="true" className="size-4" />Connect before sending this summary.</p>}
			{summary.sendError && <p role="alert" className="mb-4 text-sm leading-6 text-[#b45309]">{summary.sendError}</p>}
			{summary.receipt && <p role="status" className="mb-4 flex items-start gap-2 text-sm leading-6 text-[#334155]"><Check aria-hidden="true" className="mt-1 size-4 shrink-0" />Sent to {summary.receipt.recipient_count} authorized family {summary.receipt.recipient_count === 1 ? 'recipient' : 'recipients'}.</p>}
			<button type="button" onClick={summary.sendToFamily} disabled={!summary.canSend} className="flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-teal px-5 py-4 text-base font-semibold text-white shadow-[0_3px_0_#1b8a7f,0_6px_16px_rgba(34,166,153,0.12)] transition-[translate,box-shadow,background-color] duration-150 enabled:hover:bg-teal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal enabled:active:translate-y-0.5 enabled:active:shadow-[0_1px_0_#1b8a7f] disabled:cursor-not-allowed disabled:bg-[#475569] disabled:shadow-none motion-reduce:transition-none">{summary.sending ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /> : summary.receipt ? <Check aria-hidden="true" className="size-5" /> : <Send aria-hidden="true" className="size-5" />}{summary.sending ? 'Sending...' : summary.receipt ? 'Sent to Family' : 'Send to Family'}</button>
			<p className="mt-3 text-center text-xs leading-5 text-[#475569]">{summary.receipt ? 'The recorded summary has been shared.' : !summary.completed ? 'A completed visit is required before sharing.' : !summary.data?.content ? 'Family sharing is unavailable until the full summary can be verified.' : !summary.data.content.can_share || recipientCount < 1 ? 'No authorized family recipients are available for this summary.' : `Share this recorded summary with ${recipientCount} authorized family ${recipientCount === 1 ? 'recipient' : 'recipients'}.`}</p>
		</section>
	);
}

// --- visit-summary page ---
export function VisitSummaryScreen() {
	const summary = useVisitSummary();
	return (
		<main className="caregiver-login min-h-svh bg-cream pb-[max(2.5rem,env(safe-area-inset-bottom))] text-ink">
			<SummaryHeading visit={summary.visit} loading={summary.loading} completed={summary.completed} durationMinutes={summary.durationMinutes} />
			<div className="mx-auto max-w-6xl px-5 sm:px-8">
				<div className="flex min-h-18 items-center justify-between gap-4 py-4"><p role="status" className="text-xs leading-5 text-[#475569]">{summary.loading ? 'Loading recorded care...' : summary.visit ? 'Visit record' : 'No completed visit selected'}</p><button type="button" onClick={summary.refreshSummary} disabled={summary.loading || summary.sending || !summary.isOnline} aria-label="Refresh summary" title="Refresh summary" className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[#475569] hover:bg-teal-soft focus-visible:outline-2 focus-visible:outline-teal disabled:opacity-50"><RefreshCw aria-hidden="true" className={`size-4 ${summary.loading ? 'animate-spin motion-reduce:animate-none' : ''}`} /></button></div>
				{summary.error && <p role="alert" className="mb-5 text-sm leading-6 text-[#b45309]">{summary.error}</p>}
				{summary.data?.contentError && <p role="status" className="mb-5 text-sm leading-6 text-[#475569]">{summary.data.contentError}</p>}
				{!summary.loading && !summary.visit && !summary.error && <p className="mb-6 text-sm leading-6 text-[#475569]">There are no completed visits available. <Link href="/schedules" className="font-semibold text-teal underline underline-offset-4">Back to schedule</Link></p>}
				<div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] lg:gap-10"><RecordedCareSections content={summary.data?.content} assessments={summary.data?.assessments || []} assessmentError={summary.data?.assessmentError || ''} assessmentsAvailable={Boolean(summary.data?.visit && !summary.loading && !summary.error && !summary.data.assessmentError)} /><SummaryObservations content={summary.data?.content} /></div>
				<FamilyShareAction summary={summary} />
			</div>
		</main>
	);
}
