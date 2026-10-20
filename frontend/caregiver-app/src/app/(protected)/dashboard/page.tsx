'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, CalendarClock, Check, CheckCircle2, Circle, Clock3, HeartPulse, LockKeyhole, Pill, RefreshCw, Shield, ShieldAlert, UserRound, WifiOff } from 'lucide-react';
import { z } from 'zod';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useVisitMedications } from '@/hooks/useVisitMedications';
import MedicationOutcomeDialog from '@/components/medications/MedicationOutcomeDialog';
import { diagnosisStyle, patientAge } from '@/components/dashboard/dashboardStyles';
import { fetchTodaySchedule } from '@/services/schedule';
import { fetchShellPatient, type ShellPatient } from '@/services/visitShell';
import { fetchVisitTasks, type VisitTask } from '@/services/visitTasks';
import { fetchAssessmentList, itemEntries, type AssessmentItem } from '@/services/assessmentList';
import { fetchVisitMedications } from '@/services/visitMedications';
import type { QueueVisit } from '@/services/schedule';
import { apiClient } from '@/services/api';

type VisitMedicationData = Awaited<ReturnType<typeof useVisitMedications>>['data'];
type DashboardData = {
	visit: QueueVisit;
	patient: ShellPatient | null;
	tasks: VisitTask[] | null;
	medications: VisitMedicationData;
	assessments: AssessmentItem[] | null;
};
type TimelineItem = { id: string; title: string; detail: string; due: Date | null; resolved: boolean; result?: string; href: string; kind: 'task' | 'medication' | 'assessment' };
const shiftMilliseconds = 8 * 60 * 60 * 1000;
const observationReceiptSchema = z.object({ id: z.string().min(1), session_id: z.string().min(1), client_id: z.string().min(1), note: z.string().min(1), created_at: z.string().refine(value => Number.isFinite(Date.parse(value))) });
const observationTags = ['Fall', 'Confusion', 'Refusal of care', 'Skin issue'];

function localDoseTime(shiftStart: Date, clock: string, rollover = false) {
	const [hours, minutes] = clock.split(':').map(Number);
	const due = new Date(shiftStart);
	due.setHours(hours, minutes, 0, 0);
	if (rollover && due < shiftStart) due.setDate(due.getDate() + 1); // overnight shifts
	return due;
}

function timeLabel(date: Date | null) {
	return date ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date) : 'Anytime';
}

function MedicationFocus({ sessionId, patientName }: { sessionId: string; patientName: string }) {
	const list = useVisitMedications(sessionId);
	const due = list.medications.filter(medication => !list.latest.has(medication.id)).map(medication => ({ medication, at: localDoseTime(new Date(), medication.window_start_local) })).sort((first, second) => {
		const firstRank = first.at.getTime() < Date.now() ? 0 : 1;
		const secondRank = second.at.getTime() < Date.now() ? 0 : 1;
		return firstRank - secondRank || first.at.getTime() - second.at.getTime();
	});
	const nextDose = due[0];
	return <section id="medication-action" aria-labelledby="medication-action-title" className="scroll-mt-28 border-l-4 border-l-[#287b7c] bg-[#eaf3f0] px-5 py-5 sm:px-7 sm:py-6">
		<div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase text-[#527f79]">Medication / next action</p><h2 id="medication-action-title" className="mt-1 text-lg font-bold">{list.loading ? 'Checking medication schedule...' : nextDose?.medication.name || (list.error ? 'Medication schedule unavailable' : 'No dose awaiting a record')}</h2></div><Pill aria-hidden="true" className="size-6 text-[#287b7c]" /></div>
		{list.error ? <p role="status" className="mt-3 text-sm text-[#715f50]">Medication details could not be loaded. Open the visit medication list before providing care.</p> : nextDose ? <>
			<p className="mt-2 text-sm text-[#405850]">{nextDose.medication.dosage} <span className="text-[#6b7f76]">/ route not supplied / due {timeLabel(nextDose.at)}</span></p>
			{nextDose.medication.instructions && <p className="mt-1 text-xs leading-5 text-[#61756c]">{nextDose.medication.instructions}</p>}
			<div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!list.canRecord} onClick={() => list.openAction(nextDose.medication, 'administered')} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#287b7c] px-4 text-xs font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287b7c] disabled:cursor-not-allowed disabled:opacity-50"><Check aria-hidden="true" className="size-4" />Administered</button><button type="button" disabled={!list.canRecord} onClick={() => list.openAction(nextDose.medication, 'refused')} className="min-h-11 rounded-md border border-[#b8985a] bg-[#fffaf0] px-4 text-xs font-semibold text-[#765b26] disabled:cursor-not-allowed disabled:opacity-50">Refused</button><button type="button" disabled={!list.canRecord} onClick={() => list.openAction(nextDose.medication, 'missed')} className="min-h-11 rounded-md border border-[#d2dcd5] bg-white px-4 text-xs font-semibold text-[#52635c] disabled:cursor-not-allowed disabled:opacity-50">Missed</button></div>
			{!list.canRecord && !list.loading && <p className="mt-2 text-[11px] text-[#6b7f76]">{list.data?.visit.is_demo ? 'Demo records are read-only.' : list.data?.visit.status !== 'in_progress' ? 'Check in before recording medication care.' : !list.isOnline ? 'Connect to record medication care.' : 'Medication recording is paused until visit records are verified.'}</p>}
		</> : !list.loading && <p className="mt-2 text-sm text-[#405850]">{list.medications.length ? 'All listed doses have a recorded outcome for this visit.' : `No active medications are listed for ${patientName}.`}</p>}
		<div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p role="status" aria-live="polite" className="text-xs text-[#526b60]">{list.announcement || list.saveError}</p><Link href={`/visits/${encodeURIComponent(sessionId)}/medications`} className="min-h-10 inline-flex items-center text-xs font-semibold text-[#216e68] underline underline-offset-4">Full medication record</Link></div>
		<MedicationOutcomeDialog list={list} />
	</section>;
}

export default function DashboardPage() {
	const isOnline = useOnlineStatus();
	const [data, setData] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [accessDenied, setAccessDenied] = useState(false);
	const [error, setError] = useState('');
	const [refresh, setRefresh] = useState(0);
	const [now, setNow] = useState<Date | null>(null);
	const [note, setNote] = useState('');
	const [noteTag, setNoteTag] = useState('');
	const [noteSaving, setNoteSaving] = useState(false);
	const [noteError, setNoteError] = useState('');
	const [savedNote, setSavedNote] = useState<{ note: string; createdAt: string } | null>(null);

	useEffect(() => {
		const timer = setInterval(() => setNow(new Date()), 60000);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		setLoading(true);
		setError('');
		apiClient.get<{ role: string }>('/auth/me', { signal: controller.signal }).then(async ({ data: user }) => {
			if (user.role.toLowerCase() !== 'caregiver') {
				if (!disposed) { setAccessDenied(true); setData(null); }
				return;
			}
			if (!disposed) setAccessDenied(false);
			const schedule = await fetchTodaySchedule(controller.signal);
			const visit = schedule.visits.find(item => item.status === 'in_progress') || schedule.visits.find(item => item.status === 'scheduled') || [...schedule.visits].reverse().find(item => item.status === 'completed');
			if (!visit) {
				if (!disposed) { setData(null); setNow(new Date()); }
				return;
			}
			const [patientResult, taskResult, medicationResult, assessmentResult] = await Promise.allSettled([
				fetchShellPatient(visit.client_id, controller.signal),
				fetchVisitTasks(visit.id, controller.signal),
				fetchVisitMedications(visit.id, controller.signal),
				fetchAssessmentList(visit.id, controller.signal),
			]);
			if (disposed) return;
			setData({
				visit,
				patient: patientResult.status === 'fulfilled' ? patientResult.value : null,
				tasks: taskResult.status === 'fulfilled' ? taskResult.value.tasks : null,
				medications: medicationResult.status === 'fulfilled' ? medicationResult.value : null,
				assessments: assessmentResult.status === 'fulfilled' ? assessmentResult.value.items : null,
			});
			setNow(new Date());
		}).catch(() => { if (!disposed) setError('Your assigned shift could not be loaded. Check your connection and try again.'); })
			.finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [refresh]);

	const visit = data?.visit;
	const patient = data?.patient;
	const sessionId = visit?.id || '';
	const demoVisit = Boolean(visit?.id.startsWith('demo-'));
	const canSaveObservation = Boolean(visit?.status === 'in_progress' && isOnline && !demoVisit && !noteSaving);
	const name = patient?.full_name || visit?.client_name || 'Assigned patient';
	const diagnosis = patient?.diagnosis_category ? diagnosisStyle(patient.diagnosis_category) : null;
	const risk = (visit?.fall_risk || patient?.fall_risk_level || '').toLowerCase();
	const start = visit ? new Date(visit.actual_start || visit.scheduled_start) : null;
	const end = start ? new Date(start.getTime() + shiftMilliseconds) : null;
	const shiftProgress = start && now && visit?.status === 'in_progress' ? Math.max(0, Math.min(100, ((now.getTime() - start.getTime()) / shiftMilliseconds) * 100)) : 0;
	const shiftLabel = start && end ? `${timeLabel(start)} – ${timeLabel(end)} / 8-hour shift` : '8-hour shift';

	const timeline: TimelineItem[] = [];
	if (visit && start && end) {
		for (const task of data?.tasks || []) {
			const due = localDoseTime(start, medication.window_start_local, true);
			if (!due || (due >= start && due <= end)) timeline.push({ id: task.id, title: task.title, detail: task.details || 'Scheduled care task', due, resolved: task.status !== 'pending', result: task.status === 'completed' ? 'Completed' : task.status === 'skipped' ? 'Skipped' : undefined, href: `/visits/${encodeURIComponent(sessionId)}/tasks`, kind: 'task' });
		}
		for (const item of data?.assessments || []) {
			const last = itemEntries(item)[0];
			const due = item.due_at ? new Date(item.due_at) : null;
			if (!due || (due >= start && due <= end)) timeline.push({ id: item.id, title: item.instrument.name, detail: item.instrument.full_name, due, resolved: last?.state === 'completed' || last?.state === 'refused', result: last?.state === 'completed' ? 'Completed' : last?.state === 'refused' ? 'Refused' : undefined, href: `/visits/${encodeURIComponent(sessionId)}/assessments`, kind: 'assessment' });
		}
		const records = data?.medications?.records || [];
		for (const medication of data?.medications?.medications || []) {
			const due = localDoseTime(start, medication.window_start_local);
			if (due < start || due > end) continue;
			const record = records.find(item => item.medication_id === medication.id);
			timeline.push({ id: medication.id, title: medication.name, detail: `${medication.dosage} / medication window`, due, resolved: Boolean(record), result: record?.status, href: `/visits/${encodeURIComponent(sessionId)}/medications`, kind: 'medication' });
		}
	}
	timeline.sort((first, second) => (first.due?.getTime() ?? start?.getTime() ?? 0) - (second.due?.getTime() ?? start?.getTime() ?? 0));
	const emergencyHref = visit ? demoVisit ? `/visits/${encodeURIComponent(sessionId)}/emergency` : '/emergency' : '/emergency';

	async function saveObservation(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!visit || !note.trim() || !canSaveObservation) return;
		const noteText = `${noteTag ? `[${noteTag}] ` : ''}${note.trim()}`;
		setNoteSaving(true);
		setNoteError('');
		try {
			const { data: receipt } = await apiClient.post('/assessments/observations', { session_id: visit.id, client_id: visit.client_id, note: noteText, is_flagged: Boolean(noteTag), flag_reason: noteTag || null });
			const verified = observationReceiptSchema.parse(receipt);
			if (verified.session_id !== visit.id || verified.client_id !== visit.client_id || verified.note !== noteText) throw new Error('Observation could not be verified');
			setSavedNote({ note: verified.note, createdAt: verified.created_at });
			setNote('');
			setNoteTag('');
		} catch {
			setNoteError('The note could not be confirmed. Please refresh the visit before retrying.');
		} finally { setNoteSaving(false); }
	}

	if (accessDenied) return <main className="caregiver-login mx-auto max-w-xl px-6 py-16 text-center text-[#29343d]"><LockKeyhole aria-hidden="true" className="mx-auto mb-5 size-8 text-[#748793]" /><h1 className="text-2xl font-bold">Caregiver access required</h1><p className="mt-3 text-sm leading-6 text-[#637480]">This dashboard is for the assigned caregiver&apos;s active shift.</p><Link href="/schedules" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#287b7c] px-5 text-sm font-semibold text-white">Open schedule</Link></main>;

	return <main className="caregiver-login min-h-[calc(100svh-72px)] bg-[#f5f7f4] pb-28 text-[#29343d]">
		{!isOnline && <div role="status" className="flex items-center gap-2 border-b border-[#dce5df] bg-[#f4f7f4] px-5 py-2 text-xs text-[#637480] sm:px-8"><WifiOff aria-hidden="true" className="size-3.5" />Offline / Loaded clinical records are read-only</div>}
		{error && <p role="alert" className="border-b border-[#ead8c7] bg-[#fff8f2] px-5 py-3 text-sm text-[#79523e]">{error}</p>}
		{loading && !visit ? <div role="status" className="mx-auto max-w-3xl px-5 py-12 text-sm text-[#637480]">Loading your assigned patient...</div> : !visit ? <section className="mx-auto max-w-2xl px-5 py-16 text-center"><CalendarClock aria-hidden="true" className="mx-auto mb-4 size-9 text-[#71877b]" /><h1 className="text-xl font-bold">No assigned visit today</h1><p className="mt-2 text-sm leading-6 text-[#637480]">Your schedule has no active, upcoming, or completed visit to show.</p><Link href="/schedules" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-[#287b7c] px-5 text-sm font-semibold text-white">Open my schedule</Link></section> : <>
			<header className="sticky top-0 z-20 border-b border-[#d9e2dc] bg-[#fbfcfa]/95 px-5 py-4 shadow-[0_3px_12px_rgba(39,52,58,0.04)] backdrop-blur sm:px-8">
				<div className="mx-auto flex max-w-3xl items-center gap-3"><div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d8e2db] bg-[#e8efea] text-sm font-bold text-[#527468]">{visit.patient_photo_url ? <img src={visit.patient_photo_url} alt={`${name}`} className="size-full object-cover" /> : <span>{name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span>}</div><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase text-[#658078]">Your assigned patient</p><div className="flex flex-wrap items-baseline gap-x-2"><h1 className="min-w-0 text-lg font-bold sm:text-xl">{name}</h1>{patient?.date_of_birth && <span className="text-sm font-medium text-[#65756f]">{patientAge(patient.date_of_birth, now)} y</span>}</div><p className="mt-0.5 truncate text-xs text-[#637480]">{diagnosis?.label || 'Primary diagnosis unavailable'}{visit.room ? ` / Room ${visit.room}` : ''}</p></div><span className={`hidden shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[10px] font-bold sm:inline-flex ${visit.status === 'in_progress' ? 'bg-[#e5f2e9] text-[#3f7054]' : visit.status === 'completed' ? 'bg-[#edf0ed] text-[#64716b]' : 'bg-[#fff1d5] text-[#85601e]'}`}><span className="size-1.5 rounded-full bg-current" />{visit.status.replace('_', ' ')}</span></div>
				<div className="mx-auto mt-3 flex max-w-3xl flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#637480]"><span className="flex items-center gap-1.5"><Shield aria-hidden="true" className="size-3.5" />Allergies: <strong className="font-semibold text-[#465a52]">No allergy data available</strong></span><span className="flex items-center gap-1.5"><HeartPulse aria-hidden="true" className="size-3.5" />Code status: <strong className="font-semibold text-[#465a52]">Unavailable</strong></span></div>
				{demoVisit && <p role="status" className="mx-auto mt-2 max-w-3xl text-[10px] font-bold text-[#936b22]">DEMO DATA / Synthetic records are read-only.</p>}
			</header>

			<div className="mx-auto max-w-3xl space-y-7 px-5 py-5 sm:py-7">
				{visit.status === 'scheduled' && <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#eadfbd] bg-[#fffaf0] px-4 py-3"><p className="text-xs leading-5 text-[#765f34]">Your shift is scheduled to begin at {timeLabel(new Date(visit.scheduled_start))}.</p><Link href={`/check-in?session_id=${encodeURIComponent(visit.id)}${demoVisit ? '&demo=1' : ''}`} className="inline-flex min-h-10 items-center rounded-md bg-[#287b7c] px-4 text-xs font-bold text-white">Check in</Link></div>}
				{visit.status === 'in_progress' && <div className="flex items-center justify-between gap-3 text-xs text-[#63756d]"><span className="flex items-center gap-2"><Clock3 aria-hidden="true" className="size-4" />{shiftLabel}</span><span>{Math.round(shiftProgress)}% elapsed</span></div>}
				{visit.status === 'in_progress' && <div aria-label="Shift progress" className="-mt-6 h-1 overflow-hidden rounded-full bg-[#dce7df]"><div className="h-full rounded-full bg-[#398a76] transition-[width]" style={{ width: `${shiftProgress}%` }} /></div>}

				<MedicationFocus sessionId={sessionId} patientName={name} />

				<section aria-labelledby="shift-timeline-title"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase text-[#668078]">8-hour care plan</p><h2 id="shift-timeline-title" className="mt-1 text-xl font-bold">Shift timeline</h2></div><span className="text-xs text-[#718079]">{timeline.length} scheduled items</span></div>
					{data?.tasks === null || data?.assessments === null || data?.medications === null ? <p role="status" className="mb-3 rounded-sm bg-[#fff8f2] px-3 py-2 text-xs leading-5 text-[#76583f]">Some scheduled records could not be loaded. Check each section before providing care.</p> : null}
					{timeline.length ? <ol className="relative ml-3 border-l border-[#cbd9d0]">{timeline.map(item => {
						const overdue = Boolean(item.due && now && item.due < now && !item.resolved);
						const Icon = item.resolved ? CheckCircle2 : item.kind === 'medication' ? Pill : item.kind === 'assessment' ? Activity : Circle;
						return <li key={`${item.kind}-${item.id}`} className="relative pb-5 pl-7 last:pb-0"><span aria-hidden="true" className={`absolute top-0.5 -left-3.25 flex size-6 items-center justify-center rounded-full border-2 border-[#f5f7f4] ${overdue ? 'bg-[#b34b42] text-white' : item.resolved ? 'bg-[#e3f0e7] text-[#397354]' : 'bg-white text-[#778980]'}`}><Icon className="size-3.5" /></span><Link href={item.href} className={`block rounded-sm border px-4 py-3 focus-visible:outline-2 focus-visible:outline-[#287b7c] ${overdue ? 'border-[#e4bdb5] bg-[#fff7f5]' : item.resolved ? 'border-[#dce8df] bg-[#f8fbf8]' : 'border-[#e0e7e1] bg-white'}`}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-[#687871]">{item.detail}</p></div><span className={`text-[11px] font-semibold ${overdue ? 'text-[#a83f36]' : item.resolved ? 'text-[#447454]' : 'text-[#687871]'}`}>{overdue ? 'Overdue' : item.result || timeLabel(item.due)}</span></div></Link></li>;
					})}</ol> : <div className="rounded-sm border border-dashed border-[#cedbd2] bg-white px-4 py-6"><p className="text-sm font-semibold">No timed care items were returned</p><p className="mt-1 text-xs leading-5 text-[#718079]">Confirm medication, task, and assessment schedules before relying on this timeline.</p></div>}
				</section>

				<section aria-labelledby="risk-panel-title" className="border-y border-[#dce5df] py-5"><div className="mb-4 flex items-center gap-2"><ShieldAlert aria-hidden="true" className="size-5 text-[#a65b38]" /><h2 id="risk-panel-title" className="text-lg font-bold">Care signals</h2></div>{risk === 'high' || risk === 'moderate' ? <article className={`border-l-4 px-4 py-3 ${risk === 'high' ? 'border-l-[#b64d40] bg-[#fff5f2]' : 'border-l-[#b78935] bg-[#fffaf0]'}`}><h3 className={`text-sm font-bold ${risk === 'high' ? 'text-[#8c3e34]' : 'text-[#795e29]'}`}>{risk === 'high' ? 'Elevated fall risk today' : 'Fall risk needs attention'}</h3><p className="mt-1 text-xs leading-5 text-[#6d6256]">The patient record lists {risk} fall risk. This is a care-profile signal, not a live model explanation.</p><Link href={`/visits/${encodeURIComponent(sessionId)}/assessments`} className="mt-2 inline-flex min-h-9 items-center text-xs font-semibold text-[#287b7c] underline underline-offset-4">Review mobility assessments</Link></article> : <p className="text-sm leading-6 text-[#687871]">{risk === 'low' ? 'The patient record lists low fall risk. Continue routine observation.' : 'No verified risk signal is available for this patient. Do not interpret missing data as no risk.'}</p>}
					<p className="mt-3 text-xs leading-5 text-[#718079]">Automated decline alerts and feature explanations are not connected to the caregiver record yet.</p>
				</section>

				<section aria-labelledby="assessment-launcher-title"><div className="mb-3 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase text-[#668078]">Structured care</p><h2 id="assessment-launcher-title" className="mt-1 text-lg font-bold">Assessment checklist</h2></div><Link href={`/visits/${encodeURIComponent(sessionId)}/assessments`} className="min-h-10 inline-flex items-center text-xs font-semibold text-[#287b7c] underline underline-offset-4">Open all</Link></div>{data?.assessments?.length ? <ul className="divide-y divide-[#e3e9e4] border-y border-[#dce5df] bg-white">{data.assessments.map(item => { const last = itemEntries(item)[0]; const timestamp = last?.administered_at || last?.created_at; const status = last?.state === 'completed' ? 'Complete' : last?.state === 'refused' ? 'Refused' : 'Due'; const dateLabel = timestamp ? `${last?.state === 'completed' ? 'Last completed' : 'Last recorded'}: ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(timestamp))}` : 'No record'; return <li key={item.id}><Link href={`/visits/${encodeURIComponent(sessionId)}/assessments`} className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 focus-visible:outline-2 focus-visible:outline-[#287b7c]"><span className="min-w-0"><strong className="text-sm">{item.instrument.name}</strong><span className="ml-2 text-xs text-[#718079]">{item.instrument.full_name}</span><span className="mt-1 block text-[11px] text-[#718079]">{dateLabel}</span></span><span className={`shrink-0 rounded-sm px-2 py-1 text-[10px] font-bold ${status === 'Complete' ? 'bg-[#e5f2e9] text-[#3f7054]' : status === 'Refused' ? 'bg-[#fff1d5] text-[#85601e]' : 'bg-[#fbe9e6] text-[#9b4238]'}`}>{status}</span></Link></li>; })}</ul> : <p role="status" className="border-y border-[#dce5df] py-4 text-sm text-[#687871]">{data?.assessments === null ? 'Assessment records are unavailable.' : 'No assessment checklist is available for this shift.'}</p>}</section>

				<section aria-labelledby="vitals-title" className="border-y border-[#dce5df] py-5"><div className="flex items-center gap-2"><HeartPulse aria-hidden="true" className="size-5 text-[#587f89]" /><h2 id="vitals-title" className="text-lg font-bold">Vitals &amp; observations</h2></div><p className="mt-2 text-sm leading-6 text-[#687871]">Vitals entry and 7-day trends are not available in the connected clinical record. No readings are shown here.</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{['Blood pressure', 'Pulse', 'Temperature', 'Glucose'].map(label => <div key={label} className="border border-[#e0e7e1] bg-white px-3 py-3"><p className="text-[10px] text-[#718079]">{label}</p><p className="mt-1 text-sm font-semibold text-[#637480]">No reading</p></div>)}</div><p className="mt-3 text-[11px] text-[#718079]">If a vital sign is required by the care plan, use the approved clinical record workflow.</p></section>

				<section aria-labelledby="incident-title"><div className="mb-3"><p className="text-[10px] font-bold uppercase text-[#668078]">Visit record</p><h2 id="incident-title" className="mt-1 text-lg font-bold">Incident / notes</h2><p className="mt-1 text-xs leading-5 text-[#718079]">Saved observations attach to this visit. Family/admin delivery is not confirmed by this form.</p></div><form onSubmit={saveObservation} className="space-y-3"><div role="group" aria-label="Observation quick tags" className="flex flex-wrap gap-2">{observationTags.map(tag => <button key={tag} type="button" aria-pressed={noteTag === tag} onClick={() => setNoteTag(current => current === tag ? '' : tag)} className={`min-h-9 rounded-sm border px-3 text-[11px] font-semibold ${noteTag === tag ? 'border-[#287b7c] bg-[#e8f3f0] text-[#216e68]' : 'border-[#d3ded6] bg-white text-[#596b63]'}`}>{tag}</button>)}</div><label htmlFor="care-observation" className="block text-xs font-semibold text-[#52635c]">What did you observe?</label><textarea id="care-observation" value={note} onChange={event => setNote(event.target.value)} maxLength={2000} rows={3} placeholder="Record a factual, time-specific observation..." className="w-full rounded-sm border border-[#d3ded6] bg-white px-3 py-3 text-sm leading-5 outline-none placeholder:text-[#87938d] focus:border-[#328277] focus:ring-2 focus:ring-[#328277]/15" /><div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-xs text-[#687871]">{noteError || (demoVisit ? 'Demo notes are not saved.' : visit.status !== 'in_progress' ? 'Check in before documenting visit observations.' : savedNote ? `Saved ${new Date(savedNote.createdAt).toLocaleString()}` : '')}</p><button type="submit" disabled={!note.trim() || !canSaveObservation} className="min-h-11 rounded-md bg-[#354f48] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">{noteSaving ? 'Saving...' : 'Save visit note'}</button></div>{savedNote && <p className="border-l-2 border-[#88a997] bg-white px-3 py-2 text-xs leading-5 text-[#566860]">{savedNote.note}</p>}</form></section>
			</div>
		</>}
		{visit && <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e2d3d2] bg-[#fff9f8]/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-8"><div className="mx-auto flex max-w-3xl items-center justify-between gap-3"><p className="hidden text-xs text-[#725d5a] sm:block">If the patient needs urgent help, escalate now.</p><Link href={emergencyHref} className="ml-auto inline-flex min-h-12 items-center gap-2 rounded-md bg-[#a83e47] px-5 text-sm font-bold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a83e47]"><AlertTriangle aria-hidden="true" className="size-4" />Emergency / escalate</Link></div></div>}
	</main>;
}
