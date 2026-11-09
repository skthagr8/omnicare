'use client';

import Link from 'next/link';
import { Clock3, RefreshCw, ChevronLeft, ChevronRight, X, WifiOff } from 'lucide-react';
import { useRef } from 'react';
import { useVisitShell } from '../../hooks/useVisitFlow';
import { AssessmentDialog, CareEmergencyButton, CarePanel, CareTabs } from '../point-of-care/PointOfCare';

// --- PatientHistory ---
export function PatientHistory({ shell }: { shell: ReturnType<typeof useVisitShell> }) {
	return <section id="care-panel-history" role="tabpanel" aria-labelledby="care-tab-history" tabIndex={0} className="focus-visible:outline-2 focus-visible:outline-teal">
		<div className="mb-6 flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Patient History</h2><p className="mt-1 text-xs text-[#475569]">Recorded visits / read-only</p></div><button type="button" disabled={!shell.care.isOnline || shell.historyLoading} onClick={shell.refreshHistory} aria-label="Refresh history" title="Refresh history" className="flex size-10 items-center justify-center rounded-lg text-[#334155] disabled:opacity-50"><RefreshCw aria-hidden="true" className="size-4" /></button></div>
		{shell.historyLoading ? <p role="status" className="text-sm text-[#475569]">Loading visit history...</p> : shell.historyError ? <p role="alert" className="text-sm leading-6 text-[#b45309]">{shell.historyError}</p> : !shell.care.visit ? <p className="text-sm text-[#475569]">Patient history unavailable.</p> : shell.history.length ? <ol aria-label="Patient visit history" className="space-y-5">{shell.history.map(visit => {
			const date = new Date(visit.scheduled_start);
			const dateLabel = Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Date unavailable';
			const records = shell.care.context?.assessments.filter(record => record.session_id === visit.id && record.client_id === visit.client_id) || [];
			return <li key={visit.id} className="border-l-2 border-teal-soft pl-5"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><Clock3 aria-hidden="true" className="size-4 text-teal" />{dateLabel}</h3><span className="rounded-full bg-teal-soft px-2 py-1 text-xs capitalize text-[#334155]">{visit.status.toLowerCase().replaceAll('_', ' ')}</span></div>{records.length > 0 && <ul className="mb-3 space-y-1">{records.map(record => <li key={record.id} className="text-xs leading-5 text-[#475569]">{record.assessment_type.toUpperCase()} / {record.state}{record.state === 'refused' && record.refused_reason ? `: ${record.refused_reason}` : ''}</li>)}</ul>}<Link href={`/visit-summary?session_id=${encodeURIComponent(visit.id)}`} className="inline-flex min-h-10 items-center text-xs font-semibold text-teal underline underline-offset-4">View visit record</Link></li>;
		})}</ol> : <p className="text-sm text-[#475569]">No visit history recorded for this patient.</p>}
	</section>;
}

// --- PatientVisitHeader ---
export function PatientVisitHeader({ shell }: { shell: ReturnType<typeof useVisitShell> }) {
	const { care, patient, previous, next } = shell;
	const summary = useRef<HTMLDialogElement>(null);
	const name = patient?.full_name || care.visit?.clientName || (care.loading ? 'Loading patient...' : 'Patient unavailable');
	const birth = patient?.date_of_birth ? new Date(`${patient.date_of_birth}T00:00:00`) : null;
	const validBirth = birth && Number.isFinite(birth.getTime()) && shell.now && birth <= shell.now;
	const age = validBirth ? shell.now!.getFullYear() - birth!.getFullYear() - (shell.now!.getMonth() < birth!.getMonth() || (shell.now!.getMonth() === birth!.getMonth() && shell.now!.getDate() < birth!.getDate()) ? 1 : 0) : null;
	const birthLabel = validBirth ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(birth!) : 'Unavailable';
	const switchLocked = care.saving || Boolean(care.action) || !care.isOnline || shell.queueLoading;
	const chevronClass = 'flex size-10 shrink-0 items-center justify-center rounded-full border border-[#f6e8dd] text-[#334155] focus-visible:outline-2 focus-visible:outline-teal';

	return <header className="shrink-0 border-b border-coral-soft bg-cream px-5 py-5 sm:px-8">
		<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5">
			<div className="flex min-w-0 flex-1 items-start gap-3"><div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-coral-soft bg-teal-soft font-semibold text-[#475569]"><span aria-hidden="true">{name.split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span></div>
				<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl leading-7 font-semibold wrap-anywhere">{name}</h1><div role="group" aria-label="Patient switcher" className="flex items-center gap-1">{previous && !switchLocked ? <Link href={`/visits/${encodeURIComponent(previous.id)}`} aria-label={`Previous patient: ${previous.client_name}`} title={`Previous patient: ${previous.client_name}`} className={chevronClass}><ChevronLeft aria-hidden="true" className="size-4" /></Link> : <button type="button" aria-label="Previous patient" disabled className={`${chevronClass} opacity-40`}><ChevronLeft aria-hidden="true" className="size-4" /></button>}{next && !switchLocked ? <Link href={`/visits/${encodeURIComponent(next.id)}`} aria-label={`Next patient: ${next.client_name}`} title={`Next patient: ${next.client_name}`} className={chevronClass}><ChevronRight aria-hidden="true" className="size-4" /></Link> : <button type="button" aria-label="Next patient" disabled className={`${chevronClass} opacity-40`}><ChevronRight aria-hidden="true" className="size-4" /></button>}</div>{shell.position && <span className="text-xs text-[#475569]">{shell.position}</span>}</div>
					<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-5 text-[#475569]"><span>DOB: {birthLabel}{age !== null ? ` (${age}y)` : ''}</span></div><p className="mt-2 text-xs leading-5 wrap-anywhere text-[#475569]">{patient?.address_text || care.visit?.address || 'Address unavailable'}</p>
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2"><button type="button" disabled={!patient} onClick={() => summary.current?.showModal()} className="min-h-11 rounded-full border border-coral-soft px-4 text-xs font-semibold text-[#334155] focus-visible:outline-2 focus-visible:outline-teal disabled:opacity-50">Patient Summary</button>{care.visit?.status === 'scheduled' ? <Link href={`/check-in?session_id=${encodeURIComponent(care.visit.id)}`} className="inline-flex min-h-11 items-center rounded-full bg-teal px-4 text-xs font-semibold text-white">Confirm Arrival</Link> : care.visit && <span className="px-2 text-xs font-semibold text-[#334155]">{care.visit.status === 'in_progress' ? 'Visit in progress' : care.visit.status === 'completed' ? 'Visit completed' : care.visit.status.replace('_', ' ')}</span>}</div>
		</div>
		{shell.patientError && <p role="status" className="mx-auto mt-3 max-w-6xl text-xs text-[#475569]">{shell.patientError}</p>}
		<dialog ref={summary} aria-labelledby="patient-summary-title" className="caregiver-login fixed inset-0 m-auto max-h-[85svh] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-2xl border border-coral-soft bg-cream p-6 text-ink backdrop:bg-black/25 shadow-sm"><div className="mb-5 flex items-center justify-between gap-4"><h2 id="patient-summary-title" className="text-xl font-semibold">Patient Summary</h2><button type="button" onClick={() => summary.current?.close()} aria-label="Close patient summary" className="flex size-10 items-center justify-center rounded-lg"><X aria-hidden="true" className="size-5" /></button></div><h3 className="text-lg font-semibold">{name}</h3><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs text-[#475569]">DOB / age</dt><dd className="mt-1">{birthLabel}{age !== null ? ` / ${age} years` : ''}</dd></div><div><dt className="text-xs text-[#475569]">Patient ID</dt><dd className="mt-1 wrap-anywhere">{patient?.id}</dd></div><div><dt className="text-xs text-[#475569]">Address</dt><dd className="mt-1 wrap-anywhere">{patient?.address_text}</dd></div></dl></dialog>
	</header>;
}

// --- VisitShell ---
export function VisitShell({ sessionId }: { sessionId: string }) {
	const shell = useVisitShell(sessionId);
	const { care } = shell;
	return <main className="caregiver-login flex h-[calc(100svh-224px)] flex-col bg-cream text-ink md:h-[calc(100svh-184px)]">
		<div className="max-h-[55%] shrink-0 overflow-y-auto"><PatientVisitHeader shell={shell} /></div>
		<div role="status" aria-live="polite" className="flex min-h-9 shrink-0 items-center gap-2 border-b border-coral-soft bg-[#f2fbf9] px-5 text-xs text-[#475569] sm:px-8">{!care.isOnline && <><WifiOff aria-hidden="true" className="size-3.5 shrink-0" />Offline / Showing loaded records. Connect to save care updates.</>}</div>
		<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><div className="mx-auto max-w-3xl px-5 pt-6 pb-8 sm:px-8">
			<CareTabs activeTab={care.tab} onChange={care.setTab} includeHistory />
			{care.tab === 'tasks' && <Link href={`/visits/${encodeURIComponent(sessionId)}/tasks`} className="mb-4 inline-flex min-h-11 items-center text-xs font-semibold text-teal underline underline-offset-4">Manage visit tasks</Link>}
			{care.tab === 'assessments' && <Link href={`/visits/${encodeURIComponent(sessionId)}/assessments`} className="mb-4 inline-flex min-h-11 items-center text-xs font-semibold text-teal underline underline-offset-4">Manage assessments</Link>}
			{care.tab === 'medication' && <Link href={`/visits/${encodeURIComponent(sessionId)}/medications`} className="mb-4 inline-flex min-h-11 items-center text-xs font-semibold text-teal underline underline-offset-4">Medication list &amp; full schedule</Link>}
			<div className="mb-3 flex items-center justify-between gap-3"><p role="status" className="text-xs text-[#475569]">{care.loading ? 'Loading visit records...' : shell.queueError}</p><button type="button" disabled={care.loading || care.saving || !care.isOnline} onClick={care.refreshVisit} aria-label="Refresh visit" className="flex size-10 items-center justify-center rounded-lg text-[#334155] disabled:opacity-50"><RefreshCw aria-hidden="true" className="size-4" /></button></div>
			{care.error && <p role="alert" className="mb-5 text-sm leading-6 text-[#b45309]">{care.error}</p>}
			{care.saveError && <p role="alert" className="mb-5 text-sm leading-6 text-[#b45309]">{care.saveError}</p>}
			{care.visit?.status === 'scheduled' && care.tab !== 'history' && <p className="mb-5 text-sm text-[#334155]">Confirm your arrival before recording assessments.</p>}
			<p role="status" aria-live="polite" className="mb-3 text-sm text-[#334155]">{care.announcement}</p>
			{care.tab === 'history' ? <PatientHistory shell={shell} /> : <CarePanel care={care} />}
		</div></div>
		<AssessmentDialog action={care.action} saving={care.saving} onClose={care.closeAction} onSave={care.recordAssessment} />
		<CareEmergencyButton />
	</main>;
}