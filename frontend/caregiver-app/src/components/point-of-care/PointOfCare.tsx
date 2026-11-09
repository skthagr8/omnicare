'use client';

import {
	Activity,
	Footprints,
	Thermometer,
	CheckCircle2,
	Circle,
	Clock3,
	MessageCircle,
	type LucideIcon,
	ClipboardList,
	History,
	Pill,
	Stethoscope,
	ArrowLeft,
	ShieldCheck,
	UserRound,
	AlertTriangle,
	LoaderCircle,
	X,
} from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { InstrumentId, AssessmentRecord, AssessmentState, CheckInVisit, AssessmentEntry } from '../../services/visits';
import type { CareTab, usePointOfCare, AssessmentAction } from '../../hooks/useVisitFlow';

// --- instruments ---
export const instruments = [
	{ id: 'tug' as InstrumentId, name: 'TUG', fullName: 'Timed Up and Go', description: 'Record mobility and balance observations from the timed assessment.', icon: Footprints },
	{ id: 'cmai' as InstrumentId, name: 'CMAI', fullName: 'Cohen-Mansfield Agitation Inventory', description: 'Record the assessed frequency of agitation-related behaviors.', icon: Activity },
	{ id: 'braden' as InstrumentId, name: 'Braden', fullName: 'Braden Scale', description: 'Record the pressure-injury risk assessment and skin observations.', icon: Thermometer },
];

// --- InstrumentCard ---
type InstrumentCardProps<Id extends string> = {
	instrument: { id: Id; name: string; fullName: string; description: string; icon: LucideIcon };
	current?: Pick<AssessmentRecord, 'state'>;
	lastRecorded?: Pick<AssessmentRecord, 'administered_at' | 'created_at'>;
	available: boolean;
	disabled: boolean;
	onAction: (instrument: Id, state: AssessmentState) => void;
	secondaryActions?: ReactNode;
};

export function InstrumentCard<Id extends string = InstrumentId>({ instrument, current, lastRecorded, available, disabled, onAction, secondaryActions }: InstrumentCardProps<Id>) {
	const currentState = current?.state || 'pending';
	const timestamp = lastRecorded?.administered_at || lastRecorded?.created_at;
	const recordedLabel = !available ? 'Unavailable' : timestamp && Number.isFinite(Date.parse(timestamp)) ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp)) : 'Never';
	return (
		<article aria-labelledby={`instrument-${instrument.id}`} className="rounded-2xl border border-coral-soft bg-cream px-5 py-5 shadow-[0_1px_3px_rgba(36,38,43,0.025)] sm:px-6 sm:py-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex min-w-0 flex-1 basis-72 items-start gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal"><instrument.icon className="size-5" strokeWidth={1.5} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 id={`instrument-${instrument.id}`} className="text-base font-semibold wrap-anywhere">{instrument.name}</h3><span className="text-[10px] leading-4 wrap-anywhere text-[#475569] uppercase tracking-wide">{instrument.fullName}</span></div><p className="mt-2 max-w-sm text-xs leading-5 wrap-anywhere text-[#475569]">{instrument.description}</p></div></div>
				<div className={`flex items-start gap-3 ${secondaryActions ? 'w-full justify-end sm:w-auto' : ''}`}><div className="text-right"><p className="text-[10px] text-[#475569] uppercase tracking-wide">Last recorded</p><p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-[#475569]"><Clock3 aria-hidden="true" className="size-3" />{recordedLabel}</p></div>{secondaryActions}</div>
			</div>
			<div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-coral-soft pt-4">
				<p className={`text-xs font-medium ${available && currentState === 'refused' ? 'text-[#b45309]' : available && currentState === 'completed' ? 'text-[#334155]' : 'text-[#475569]'}`}>Visit status: {available ? currentState === 'completed' ? 'Completed' : currentState === 'refused' ? 'Refused' : 'Pending' : 'Unavailable'}</p>
				<div role="group" aria-label={`${instrument.name} assessment actions`} className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:grid-cols-[104px_104px_104px]">
					<button type="button" disabled={disabled} onClick={() => onAction(instrument.id, 'pending')} className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-coral-soft bg-cream px-2 text-xs font-semibold text-[#475569] hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#475569] disabled:cursor-not-allowed disabled:opacity-65"><Circle aria-hidden="true" className="hidden size-3.5 shrink-0 sm:block" />Pending</button>
					<button type="button" disabled={disabled} onClick={() => onAction(instrument.id, 'refused')} className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[#f59e0b] bg-[#fffbeb] px-2 text-xs font-semibold text-[#b45309] hover:bg-[#fef3c7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b45309] disabled:cursor-not-allowed disabled:opacity-65"><MessageCircle aria-hidden="true" className="hidden size-3.5 shrink-0 sm:block" />Refused</button>
					<button type="button" disabled={disabled} onClick={() => onAction(instrument.id, 'completed')} className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[#475569] bg-[#475569] px-2 text-xs font-semibold text-white hover:bg-[#334155] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#475569] disabled:cursor-not-allowed disabled:opacity-65"><CheckCircle2 aria-hidden="true" className="hidden size-3.5 shrink-0 sm:block" />Complete</button>
				</div>
			</div>
		</article>
	);
}

// --- CareTabs ---
const workflowTabs = [
	{ id: 'tasks' as CareTab, label: 'Tasks', icon: ClipboardList },
	{ id: 'assessments' as CareTab, label: 'Assessments', icon: Stethoscope },
	{ id: 'medication' as CareTab, label: 'Medication', icon: Pill },
];

export function CareTabs({ activeTab, onChange, includeHistory = false }: { activeTab: CareTab; onChange: (tab: CareTab) => void; includeHistory?: boolean }) {
	const tabs = includeHistory ? [...workflowTabs, { id: 'history' as CareTab, label: 'History', icon: History }] : workflowTabs;
	return (
		<div role="tablist" aria-label="Point of care" className={`mx-auto mb-9 grid w-full rounded-full border border-teal-soft bg-[#f2fbf9] p-1 ${includeHistory ? 'max-w-xl grid-cols-4' : 'max-w-md grid-cols-3'}`}>
			{tabs.map((tab, index) => <button key={tab.id} id={`care-tab-${tab.id}`} role="tab" type="button" aria-selected={activeTab === tab.id} aria-controls={`care-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => onChange(tab.id)} onKeyDown={event => {
				const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
				if (next !== null) { event.preventDefault(); onChange(tabs[next].id); document.getElementById(`care-tab-${tabs[next].id}`)?.focus(); }
			}} className={`relative flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-full font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-teal sm:text-sm ${includeHistory ? 'px-1 text-[10px] sm:px-2' : 'px-2 text-xs'} ${activeTab === tab.id ? 'bg-white text-teal shadow-sm' : 'text-[#334155] hover:bg-white/60'}`}><tab.icon aria-hidden="true" className="hidden size-4 shrink-0 sm:block" /><span>{tab.label}</span>{activeTab === tab.id && <span aria-hidden="true" className="absolute right-5 bottom-1.5 left-5 h-0.5 rounded-full bg-[#5cc4b8]" />}</button>)}
		</div>
	);
}

// --- CareVisitHeader ---
export function CareVisitHeader({ visit, loading }: { visit: CheckInVisit | null | undefined; loading: boolean }) {
	return (
		<section aria-label="Current client" className="border-b border-coral-soft bg-cream px-5 py-5 sm:px-8">
			<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
				<div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-teal-soft text-[#334155]"><UserRound className="size-6" /></span><div className="min-w-0"><h1 className="text-xl leading-7 font-semibold wrap-anywhere">{loading && !visit ? 'Loading visit...' : visit?.clientName || 'Point of Care'}</h1><p className="mt-1 text-xs leading-5 wrap-anywhere text-[#475569]">{visit?.address || 'Visit workspace'}</p></div></div>
				<div className="flex flex-wrap items-center gap-3"><Link href="/schedules" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs text-[#334155] hover:bg-teal-soft focus-visible:outline-2 focus-visible:outline-teal"><ArrowLeft aria-hidden="true" className="size-4" />Back to Schedule</Link>{visit && (visit.status === 'in_progress' ? <><span className="flex items-center gap-2 text-xs font-semibold text-[#334155]"><ShieldCheck aria-hidden="true" className="size-4" />Visit in progress</span><Link href={`/check-out?session_id=${encodeURIComponent(visit.id)}`} className="inline-flex min-h-11 items-center rounded-lg border border-coral-soft px-4 text-xs font-semibold text-[#475569] hover:bg-cream focus-visible:outline-2 focus-visible:outline-[#475569]">Check Out</Link></> : <Link href={`/check-in?session_id=${encodeURIComponent(visit.id)}`} className="inline-flex min-h-11 items-center rounded-xl bg-teal px-4 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal shadow-sm">Confirm Arrival</Link>)}</div>
			</div>
		</section>
	);
}

// --- CareEmergencyButton ---
export function CareEmergencyButton() {
	return <div className="fixed inset-x-0 bottom-0 z-30 h-28 border-t border-coral-soft bg-cream"><Link href="/emergency" aria-label="Emergency" title="Emergency" className="fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex size-20 flex-col items-center justify-center gap-1 rounded-full border-4 border-cream bg-[#e11d48] text-white shadow-[0_6px_24px_rgba(178,58,72,0.25)] hover:bg-[#be123c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e11d48] active:scale-95 motion-reduce:transition-none sm:right-7"><AlertTriangle aria-hidden="true" className="size-6" strokeWidth={1.75} /><span className="text-[10px] font-semibold">Emergency</span></Link></div>;
}

// --- CarePanel ---
export function CarePanel({ care }: { care: ReturnType<typeof usePointOfCare> }) {
	return (
		<section id={`care-panel-${care.tab}`} role="tabpanel" aria-labelledby={`care-tab-${care.tab}`} tabIndex={0} className="outline-none focus-visible:ring-2 focus-visible:ring-[#5cc4b8]">
			{care.tab === 'assessments' ? <>
				<div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Clinical Assessments</h2><p className="mt-1 text-xs leading-5 text-[#475569]">Required evaluations for the current visit.</p></div><div className="flex items-center gap-3"><span className="text-[10px] text-[#475569] uppercase tracking-wide">Progress</span><progress aria-label="Resolved assessments" value={care.resolvedCount} max={3} className="h-1.5 w-28 overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[#f6e8dd] [&::-webkit-progress-value]:bg-[#5cc4b8] [&::-moz-progress-bar]:bg-[#5cc4b8]" /><span className="text-xs text-[#334155]">{care.resolvedCount}/3</span></div></div>
				{care.context?.assessmentError && <p role="alert" className="mb-5 text-sm leading-6 text-[#b45309]">{care.context.assessmentError}</p>}
				<div className="space-y-5">{instruments.map(instrument => <InstrumentCard key={instrument.id} instrument={instrument} current={care.currentRecords[instrument.id]} lastRecorded={care.context?.assessments.find(record => record.assessment_type === instrument.id)} available={Boolean(care.context?.visit && !care.loading && !care.error && !care.context.assessmentError)} disabled={!care.canRecord} onAction={care.openAction} />)}</div>
			</> : care.tab === 'tasks' ? <><h2 className="mb-6 text-xl font-semibold">Visit Tasks</h2><div className="border-y border-coral-soft py-12 text-center"><ClipboardList aria-hidden="true" className="mx-auto mb-4 size-8 text-[#64748b]" /><p className="text-sm leading-6 text-[#334155]">No task list is available for this visit.</p></div></> : <>
				<h2 className="mb-6 text-xl font-semibold">Medication</h2>
				{care.context?.medicationError ? <p role="alert" className="text-sm leading-6 text-[#b45309]">{care.context.medicationError}</p> : care.loading ? <p role="status" className="text-sm text-[#334155]">Loading medications...</p> : care.context?.medications.length ? <ul className="space-y-4">{care.context.medications.map(medication => <li key={medication.id} className="rounded-2xl border border-coral-soft bg-cream p-5 shadow-sm"><div className="flex items-start gap-3"><Pill aria-hidden="true" className="mt-1 size-5 shrink-0 text-teal" /><div><h3 className="text-base font-semibold wrap-anywhere">{medication.name}</h3><p className="mt-1 text-sm text-[#334155]">{medication.dosage}</p><p className="mt-2 text-xs text-[#475569]">Scheduled window: {medication.window_start_local} - {medication.window_end_local}</p>{medication.instructions && <p className="mt-3 text-sm leading-6 wrap-anywhere text-[#334155]">{medication.instructions}</p>}</div></div></li>)}</ul> : <div className="border-y border-coral-soft py-12 text-center"><Pill aria-hidden="true" className="mx-auto mb-4 size-8 text-[#64748b]" /><p className="text-sm text-[#334155]">{care.error || !care.visit ? 'Medication list unavailable' : 'No active medications listed'}</p></div>}
			</>}
		</section>
	);
}

// --- AssessmentDialog ---
type AssessmentValues = Pick<AssessmentEntry, 'refused_reason' | 'tug' | 'cmai' | 'braden'>;
type AssessmentDialogProps = { action: AssessmentAction | null; saving: boolean; onClose: () => void; onSave: (values: AssessmentValues) => Promise<void> };
const fieldClass = 'mt-2 min-h-12 w-full rounded-lg border border-[#f0d9c8] bg-white px-3 py-3 text-base text-ink outline-none focus:ring-2 focus:ring-[#5cc4b8]';

export function AssessmentDialog({ action, saving, onClose, onSave }: AssessmentDialogProps) {
	const dialog = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		if (action && !dialog.current?.open) dialog.current?.showModal();
		if (!action && dialog.current?.open) dialog.current.close();
	}, [action]);
	const instrument = instruments.find(item => item.id === action?.instrument);
	const title = action?.state === 'refused' ? 'Record refusal' : action?.state === 'pending' ? 'Mark pending' : 'Record completed assessment';

	return (
		<dialog ref={dialog} aria-labelledby="assessment-dialog-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }} className="caregiver-login fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-coral-soft bg-cream p-6 text-ink shadow-xl backdrop:bg-black/25">
			{action && <form key={`${action.instrument}-${action.state}`} onSubmit={event => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				const score = Number(data.get('score'));
				const values: AssessmentValues = action.state === 'refused' ? { refused_reason: String(data.get('reason') || '').trim() } : action.state === 'completed' ? action.instrument === 'tug' ? { tug: { completion_time_sec: score, hesitation_flag: data.get('hesitation') === 'on', freezing_flag: data.get('freezing') === 'on' } } : action.instrument === 'cmai' ? { cmai: { total_score: score } } : { braden: { total_score: score, skin_inspection_notes: String(data.get('notes') || '').trim() || undefined } } : {};
				if (action.state === 'refused' && !values.refused_reason) return;
				if (action.state === 'completed' && !Number.isFinite(score)) return;
				void onSave(values);
			}}>
				<div className="mb-5 flex items-start justify-between gap-4"><div><p className="mb-1 text-sm font-semibold text-teal">{instrument?.name}</p><h2 id="assessment-dialog-title" className="text-xl leading-7 font-semibold">{title}</h2></div><button type="button" aria-label="Close assessment dialog" title="Close" disabled={saving} onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[#475569] hover:bg-teal-soft focus-visible:outline-2 focus-visible:outline-teal"><X aria-hidden="true" className="size-5" /></button></div>
				<fieldset disabled={saving} className="min-w-0 space-y-4">
					{action.state === 'refused' ? <div><label htmlFor="refusal-reason" className="text-sm font-semibold">Reason for refusal</label><textarea id="refusal-reason" name="reason" required maxLength={1000} rows={3} className={fieldClass} /><p className="mt-2 text-xs leading-5 text-[#475569]">The client&apos;s choice will be recorded as a refusal.</p></div> : action.state === 'pending' ? <p className="text-sm leading-6 text-[#334155]">Record this assessment as pending for the current visit. Any earlier record will remain in the history.</p> : <>
						<div><label htmlFor="assessment-score" className="text-sm font-semibold">{action.instrument === 'tug' ? 'Completion time (seconds)' : 'Total assessed score'}</label><input id="assessment-score" name="score" type="number" inputMode="decimal" required min={action.instrument === 'tug' ? 0.01 : action.instrument === 'cmai' ? 29 : 6} max={action.instrument === 'tug' ? undefined : action.instrument === 'cmai' ? 203 : 23} step={action.instrument === 'tug' ? 0.01 : 1} className={fieldClass} /></div>
						{action.instrument === 'tug' && <div className="space-y-2 text-sm"><label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="hesitation" className="size-5 accent-[#475569]" />Hesitation observed</label><label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="freezing" className="size-5 accent-[#475569]" />Freezing observed</label></div>}
						{action.instrument === 'braden' && <div><label htmlFor="skin-notes" className="text-sm font-semibold">Skin observations (optional)</label><textarea id="skin-notes" name="notes" maxLength={1000} rows={3} className={fieldClass} /></div>}
					</>}
				</fieldset>
				<div className="mt-6 flex gap-3"><button type="button" disabled={saving} onClick={onClose} className="min-h-12 flex-1 rounded-lg border border-coral-soft px-3 text-sm font-semibold text-[#334155]">Cancel</button><button type="submit" disabled={saving} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold disabled:cursor-wait ${action.state === 'refused' ? 'border-[#f59e0b] bg-[#fef3c7] text-[#b45309]' : 'border-[#475569] bg-[#475569] text-white'}`}>{saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}{saving ? 'Saving...' : action.state === 'refused' ? 'Save refusal' : action.state === 'pending' ? 'Save pending' : 'Save result'}</button></div>
			</form>}
		</dialog>
	);
}
