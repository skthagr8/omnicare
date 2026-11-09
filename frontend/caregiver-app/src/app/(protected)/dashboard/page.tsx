'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
	Activity,
	CalendarClock,
	Check,
	CheckCircle2,
	Circle,
	Clock3,
	LockKeyhole,
	MapPin,
	Pill,
	ShieldAlert,
	WifiOff,
} from 'lucide-react';
import { useOnlineStatus } from '../../../hooks/useDevice';
import { useVisitMedications } from '../../../hooks/useCareRecords';
import { MedicationOutcomeDialog } from '../../../components/medications/Medications';
import { diagnosisStyle, patientAge } from '../../../components/dashboard/Dashboard';
import { apiClient } from '../../../services/api';
import {
	ASSESSMENT_NAMES,
	fetchShiftAssessments,
	fetchShiftClient,
	fetchShiftMedications,
	fetchShiftProfile,
	fetchShiftSession,
	fetchShiftTasks,
	type ShiftAssessment,
	type ShiftClient,
	type ShiftMedication,
	type ShiftProfile,
	type ShiftSession,
	type ShiftTask,
} from '../../../services/dashboard';

// Every section is loaded from a backend route (see services/dashboard.ts).
// null = that request failed; [] = the backend returned nothing for this visit.
type DashboardData = {
	session: ShiftSession;
	client: ShiftClient | null;
	profile: ShiftProfile | null;
	tasks: ShiftTask[] | null;
	medications: ShiftMedication[] | null;
	assessments: ShiftAssessment[] | null;
};
type TimelineItem = { id: string; title: string; detail: string; due: Date | null; resolved: boolean; result?: string; href: string; kind: 'task' | 'medication' | 'assessment' };

// Checklist badge for an assessment's record in this visit ('none' = no record yet).
const assessmentStatus: Record<'none' | 'pending' | 'completed' | 'refused' | 'skipped', { label: string; className: string }> = {
	none: { label: 'Not started', className: 'bg-[#ffe4e6] text-[#be123c]' },
	pending: { label: 'Pending', className: 'bg-[#fef3c7] text-[#b45309]' },
	completed: { label: 'Completed', className: 'bg-teal-soft text-teal' },
	refused: { label: 'Refused', className: 'bg-[#f1e7f3] text-[#6f4a7a]' },
	skipped: { label: 'Skipped', className: 'bg-cream text-[#334155]' },
};
const acuityStyles: Record<string, { label: string; className: string }> = {
	red: { label: 'High acuity', className: 'bg-[#ffe4e6] text-[#be123c]' },
	amber: { label: 'Medium acuity', className: 'bg-[#fef3c7] text-[#b45309]' },
	green: { label: 'Low acuity', className: 'bg-teal-soft text-teal' },
};
const taskResults: Record<ShiftTask['state'], string | undefined> = { pending: undefined, completed: 'Completed', partially_completed: 'Partly done', refused: 'Refused', skipped: 'Skipped' };
const medicationResults: Record<string, string> = { administered: 'Administered', refused: 'Refused', missed: 'Missed', cancelled: 'Cancelled' };

// A medication window ("HH:MM") placed on the visit's own day.
function windowTime(day: Date, clock: string) {
	const [hours, minutes] = clock.split(':').map(Number);
	const due = new Date(day);
	due.setHours(hours, minutes, 0, 0);
	return due;
}

function timeLabel(date: Date | null) {
	return date ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date) : 'Anytime';
}

function MedicationFocus({ sessionId, patientName, visitDay, now }: { sessionId: string; patientName: string; visitDay: Date; now: Date | null }) {
	const list = useVisitMedications(sessionId);
	const nowMs = now?.getTime() ?? visitDay.getTime();
	const due = list.medications.filter(medication => !list.latest.has(medication.id)).map(medication => ({ medication, at: windowTime(visitDay, medication.window_start_local) })).sort((first, second) => {
		const firstRank = first.at.getTime() < nowMs ? 0 : 1;
		const secondRank = second.at.getTime() < nowMs ? 0 : 1;
		return firstRank - secondRank || first.at.getTime() - second.at.getTime();
	});
	const nextDose = due[0];
	return <section id="medication-action" aria-labelledby="medication-action-title" className="scroll-mt-28 rounded-3xl border border-teal/20 bg-teal-soft/60 p-6 sm:p-7">
		<div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#334155]">Medication / next action</p><h2 id="medication-action-title" className="mt-1 text-xl font-medium">{list.loading ? 'Checking medication schedule...' : nextDose?.medication.name || (list.error ? 'Medication schedule unavailable' : 'No dose awaiting a record')}</h2></div><Pill aria-hidden="true" className="size-6 text-teal" /></div>
		{list.error ? <p role="status" className="mt-3 text-sm text-[#334155]">Medication details could not be loaded. Open the visit medication list before providing care.</p> : nextDose ? <>
			<p className="mt-2 text-sm text-[#334155]">{nextDose.medication.dosage} <span className="text-[#475569]">/ window {nextDose.medication.window_start_local}–{nextDose.medication.window_end_local}</span></p>
			{nextDose.medication.instructions && <p className="mt-1 text-xs leading-5 text-[#334155]">{nextDose.medication.instructions}</p>}
			<div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!list.canRecord} onClick={() => list.openAction(nextDose.medication, 'administered')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal px-4 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"><Check aria-hidden="true" className="size-4" />Administered</button><button type="button" disabled={!list.canRecord} onClick={() => list.openAction(nextDose.medication, 'refused')} className="min-h-11 rounded-xl border border-[#f59e0b] bg-[#fffbeb] px-4 text-xs font-semibold text-[#b45309] disabled:cursor-not-allowed disabled:opacity-50">Refused</button><button type="button" disabled={!list.canRecord} onClick={() => list.openAction(nextDose.medication, 'missed')} className="min-h-11 rounded-xl border border-coral-soft bg-white px-4 text-xs font-semibold text-[#334155] disabled:cursor-not-allowed disabled:opacity-50">Missed</button></div>
			{!list.canRecord && !list.loading && <p className="mt-2 text-[11px] text-[#475569]">{list.data?.visit.status !== 'in_progress' ? 'Check in before recording medication care.' : !list.isOnline ? 'Connect to record medication care.' : 'Medication recording is paused until visit records are verified.'}</p>}
		</> : !list.loading && <p className="mt-2 text-sm text-[#334155]">{list.medications.length ? 'All listed doses have a recorded outcome for this visit.' : `No medications are assigned to ${patientName} through their diagnoses.`}</p>}
		<div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p role="status" aria-live="polite" className="text-xs text-[#334155]">{list.announcement || list.saveError}</p><Link href={`/visits/${encodeURIComponent(sessionId)}/medications`} className="min-h-10 inline-flex items-center text-xs font-semibold text-teal underline underline-offset-4">Full medication record</Link></div>
		<MedicationOutcomeDialog list={list} />
	</section>;
}

export default function DashboardPage() {
	const isOnline = useOnlineStatus();
	const [data, setData] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [accessDenied, setAccessDenied] = useState(false);
	const [error, setError] = useState('');
	const [now, setNow] = useState<Date | null>(null);

	useEffect(() => {
		const timer = setInterval(() => setNow(new Date()), 60000);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		const { signal } = controller;
		apiClient.get<{ role: string }>('/auth/me', { signal }).then(async ({ data: user }) => {
			// GET /scheduling/visits/today and /sessions/{id}/client are caregiver-only on the backend.
			if (user.role.toLowerCase() !== 'caregiver') {
				if (!disposed) { setAccessDenied(true); setData(null); }
				return;
			}
			if (!disposed) setAccessDenied(false);
			const session = await fetchShiftSession(signal);
			if (!session) {
				if (!disposed) { setData(null); setNow(new Date()); }
				return;
			}
			const [client, profile, tasks, medications, assessments] = await Promise.allSettled([
				fetchShiftClient(session.id, signal),
				fetchShiftProfile(session.client_id, signal),
				fetchShiftTasks(session.id, signal),
				fetchShiftMedications(session.id, signal),
				fetchShiftAssessments(session.id, signal),
			]);
			if (disposed) return;
			const value = <T,>(result: PromiseSettledResult<T>) => result.status === 'fulfilled' ? result.value : null;
			setData({ session, client: value(client), profile: value(profile), tasks: value(tasks), medications: value(medications), assessments: value(assessments) });
			setNow(new Date());
		}).catch(() => { if (!disposed) setError('Your assigned shift could not be loaded. Check your connection and try again.'); })
			.finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, []);

	const session = data?.session;
	const client = data?.client;
	const sessionId = session?.id || '';
	const name = client?.full_name || 'Assigned patient';
	const diagnosis = data?.profile?.diagnosis ? diagnosisStyle(data.profile.diagnosis.category) : null;
	const diagnosisDetail = data?.profile?.diagnosis?.stage || data?.profile?.diagnosis?.affected_side;
	const acuity = data?.profile?.acuity ? acuityStyles[data.profile.acuity.level] : null;

	// The visit window is the session's own scheduled_start..scheduled_end; progress runs from check-in.
	const start = session ? new Date(session.scheduled_start) : null;
	const end = session ? new Date(session.scheduled_end) : null;
	const progressStart = session?.check_in_at ? new Date(session.check_in_at) : start;
	const shiftProgress = progressStart && end && now && session?.status === 'in_progress' ? Math.max(0, Math.min(100, ((now.getTime() - progressStart.getTime()) / Math.max(1, end.getTime() - progressStart.getTime())) * 100)) : 0;
	const shiftLabel = start && end ? `${timeLabel(start)} – ${timeLabel(end)}` : '';

	const timeline: TimelineItem[] = [];
	if (session && start) {
		for (const task of data?.tasks || []) {
			timeline.push({ id: task.id, title: task.title, detail: task.details || `${task.priority} priority care task`, due: task.due_at ? new Date(task.due_at) : null, resolved: task.state !== 'pending', result: taskResults[task.state], href: `/visits/${encodeURIComponent(sessionId)}/tasks`, kind: 'task' });
		}
		for (const item of data?.medications || []) {
			const status = item.administration?.status;
			timeline.push({ id: item.medication.id, title: item.medication.name, detail: `${item.medication.dosage} / window ${item.medication.window_start_local}–${item.medication.window_end_local}${item.is_required ? '' : ' / if prescribed'}`, due: windowTime(start, item.medication.window_start_local), resolved: Boolean(status && status !== 'pending'), result: status ? medicationResults[status] : undefined, href: `/visits/${encodeURIComponent(sessionId)}/medications`, kind: 'medication' });
		}
		for (const item of data?.assessments || []) {
			const state = item.completed?.state;
			timeline.push({ id: item.assessment_type, title: ASSESSMENT_NAMES[item.assessment_type].name, detail: item.instructions || ASSESSMENT_NAMES[item.assessment_type].full_name, due: null, resolved: state === 'completed' || state === 'refused' || state === 'skipped', result: state && state !== 'pending' ? state[0].toUpperCase() + state.slice(1) : undefined, href: `/visits/${encodeURIComponent(sessionId)}/assessments`, kind: 'assessment' });
		}
	}
	timeline.sort((first, second) => (first.due?.getTime() ?? start?.getTime() ?? 0) - (second.due?.getTime() ?? start?.getTime() ?? 0));

	if (accessDenied) return <main className="caregiver-login mx-auto max-w-xl px-6 py-16 text-center text-ink"><LockKeyhole aria-hidden="true" className="mx-auto mb-5 size-8 text-[#475569]" /><h1 className="text-2xl font-semibold">Caregiver access required</h1><p className="mt-3 text-sm leading-6 text-[#475569]">This dashboard is for the assigned caregiver&apos;s active shift.</p><Link href="/schedules" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-teal px-5 text-sm font-semibold text-white shadow-sm">Open schedule</Link></main>;

	return <main className="caregiver-login min-h-[calc(100svh-72px)] bg-cream pb-10 text-ink">
		{!isOnline && <div role="status" className="flex items-center gap-2 border-b border-coral-soft bg-cream px-5 py-2 text-xs text-[#475569] sm:px-8"><WifiOff aria-hidden="true" className="size-3.5" />Offline / Loaded clinical records are read-only</div>}
		{error && <p role="alert" className="border-b border-[#fde68a] bg-[#fffbeb] px-5 py-3 text-sm text-[#b45309]">{error}</p>}
		{loading && !session ? <div role="status" className="mx-auto max-w-3xl px-5 py-12 text-sm text-[#475569]">Loading your assigned patient...</div> : !session ? <section className="mx-auto max-w-2xl px-5 py-16 text-center"><CalendarClock aria-hidden="true" className="mx-auto mb-4 size-9 text-[#475569]" /><h1 className="text-xl font-semibold">No assigned visit today</h1><p className="mt-2 text-sm leading-6 text-[#475569]">Your schedule has no active, upcoming, or completed visit to show.</p><Link href="/schedules" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-teal px-5 text-sm font-semibold text-white shadow-sm">Open my schedule</Link></section> : <>
			<header className="sticky top-0 z-20 border-b border-coral-soft bg-cream/95 px-5 py-4 shadow-[0_3px_12px_rgba(36,38,43,0.04)] backdrop-blur sm:px-8">
				<div className="mx-auto flex max-w-3xl items-center gap-3">
					<div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-linear-to-br from-teal to-coral text-sm font-semibold text-white shadow">
						<span aria-hidden="true">{name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span>
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-[10px] font-semibold uppercase tracking-wide text-[#475569]">Your assigned patient</p>
						<div className="flex flex-wrap items-baseline gap-x-2">
							<h1 className="min-w-0 text-2xl font-semibold sm:text-3xl">{name}</h1>
							{client?.date_of_birth && <span className="text-sm font-medium text-[#475569]">{patientAge(client.date_of_birth, now)} y</span>}
						</div>
						<p className="mt-0.5 truncate text-xs text-[#475569]">{diagnosis ? `${diagnosis.label}${diagnosisDetail ? ` / ${diagnosisDetail}` : ''}` : data?.profile === null ? 'Diagnosis unavailable' : 'No active diagnosis recorded'}</p>
					</div>
					<div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
						<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${session.status === 'in_progress' ? 'bg-teal-soft text-teal' : session.status === 'completed' ? 'bg-cream text-[#334155]' : 'bg-[#fef3c7] text-[#b45309]'}`}><span className="size-1.5 rounded-full bg-current" />{session.status.replace('_', ' ')}</span>
						{acuity && <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${acuity.className}`}>{acuity.label}</span>}
					</div>
				</div>
				<div className="mx-auto mt-3 flex max-w-3xl flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#475569]">
					{client?.address_text && <span className="flex min-w-0 items-center gap-1.5"><MapPin aria-hidden="true" className="size-3.5 shrink-0" /><span className="truncate">{client.address_text}</span></span>}
					{acuity && <span className="sm:hidden">{acuity.label}</span>}
					{!acuity && data?.profile && <span>Acuity tier: <strong className="font-semibold text-[#334155]">not recorded</strong></span>}
				</div>
			</header>

			<div className="mx-auto max-w-3xl space-y-7 px-5 py-5 sm:py-7">
				{session.status === 'scheduled' && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 shadow-sm"><p className="text-xs leading-5 text-[#b45309]">Your visit is scheduled for {shiftLabel}.</p><Link href={`/check-in?session_id=${encodeURIComponent(session.id)}`} className="inline-flex min-h-10 items-center rounded-xl bg-teal px-4 text-xs font-semibold text-white shadow-sm">Check in</Link></div>}
				{session.status === 'in_progress' && <div className="flex items-center justify-between gap-3 text-xs text-[#475569]"><span className="flex items-center gap-2"><Clock3 aria-hidden="true" className="size-4" />{shiftLabel}{session.check_in_at ? ` / checked in ${timeLabel(new Date(session.check_in_at))}` : ''}</span><span>{Math.round(shiftProgress)}% elapsed</span></div>}
				{session.status === 'in_progress' && <div aria-label="Visit progress" className="-mt-6 h-1 overflow-hidden rounded-full bg-teal-soft"><div className="h-full rounded-full bg-teal transition-[width]" style={{ width: `${shiftProgress}%` }} /></div>}

				<MedicationFocus sessionId={sessionId} patientName={name} visitDay={start || new Date(session.scheduled_start)} now={now} />

				<section aria-labelledby="shift-timeline-title"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#475569]">Care plan / {shiftLabel}</p><h2 id="shift-timeline-title" className="mt-1 text-2xl font-medium">Visit timeline</h2></div><span className="text-xs text-[#475569]">{timeline.length} items</span></div>
					{data?.tasks === null || data?.assessments === null || data?.medications === null ? <p role="status" className="mb-3 rounded-lg bg-[#fffbeb] px-3 py-2 text-xs leading-5 text-[#b45309]">{[data?.tasks === null && 'tasks', data?.medications === null && 'medications', data?.assessments === null && 'assessments'].filter(Boolean).join(', ')} could not be loaded. Check each section before providing care.</p> : null}
					{timeline.length ? <ol className="relative ml-3 border-l border-coral-soft">{timeline.map(item => {
						const overdue = Boolean(item.due && now && item.due < now && !item.resolved);
						const Icon = item.resolved ? CheckCircle2 : item.kind === 'medication' ? Pill : item.kind === 'assessment' ? Activity : Circle;
						return <li key={`${item.kind}-${item.id}`} className="relative pb-5 pl-7 last:pb-0"><span aria-hidden="true" className={`absolute top-0.5 -left-3.25 flex size-6 items-center justify-center rounded-full border-2 border-cream ${overdue ? 'bg-[#e11d48] text-white' : item.resolved ? 'bg-teal-soft text-teal' : 'bg-white text-[#475569]'}`}><Icon className="size-3.5" /></span><Link href={item.href} className={`block rounded-lg border px-4 py-3 focus-visible:outline-2 focus-visible:outline-teal ${overdue ? 'border-[#fecdd3] bg-[#fff1f2]' : item.resolved ? 'border-teal-soft bg-[#f2fbf9]' : 'border-[#f6e8dd] bg-white'}`}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-[#475569]">{item.detail}</p></div><span className={`text-[11px] font-semibold ${overdue ? 'text-[#be123c]' : item.resolved ? 'text-teal' : 'text-[#475569]'}`}>{overdue ? 'Overdue' : item.result || timeLabel(item.due)}</span></div></Link></li>;
					})}</ol> : <div className="rounded-2xl border border-dashed border-coral-soft bg-white px-4 py-6 shadow-sm"><p className="text-sm font-semibold">No care items for this visit</p><p className="mt-1 text-xs leading-5 text-[#475569]">Tasks are assigned per visit; medications and assessments come from the patient&apos;s active diagnoses.</p></div>}
				</section>

				<section aria-labelledby="risk-panel-title" className="rounded-3xl border border-coral-soft bg-white/50 p-6 shadow-sm"><div className="mb-3 flex items-center gap-2"><ShieldAlert aria-hidden="true" className="size-5 text-[#b45309]" /><h2 id="risk-panel-title" className="text-xl font-medium">Care signals</h2></div><p className="text-sm leading-6 text-[#475569]">Cognitive-decline predictions are available to administrators and linked family members only. Report changes you observe with a visit note below.</p></section>

				<section aria-labelledby="assessment-launcher-title"><div className="mb-3 flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#475569]">Required by diagnosis</p><h2 id="assessment-launcher-title" className="mt-1 text-2xl font-medium">Assessment checklist</h2></div><Link href={`/visits/${encodeURIComponent(sessionId)}/assessments`} className="min-h-10 inline-flex items-center text-xs font-semibold text-teal underline underline-offset-4">Open all</Link></div>{data?.assessments?.length ? <ul className="divide-y divide-coral-soft overflow-hidden rounded-3xl border border-coral-soft bg-white/60 shadow-sm">{data.assessments.map(item => { const names = ASSESSMENT_NAMES[item.assessment_type]; const record = item.completed; const resolved = record && record.state !== 'pending'; const timestamp = resolved ? record.administered_at || record.created_at : null; const status = assessmentStatus[record?.state ?? 'none']; const detail = [item.is_required ? 'Required' : 'Optional', item.frequency_days ? `every ${item.frequency_days} day${item.frequency_days === 1 ? '' : 's'}` : null, timestamp ? `${status.label.toLowerCase()} ${new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(timestamp))}` : record ? 'awaiting results this visit' : 'not yet started this visit', record?.state === 'refused' && record.refused_reason ? `reason: ${record.refused_reason}` : null].filter(Boolean).join(' / '); return <li key={item.assessment_type}><Link href={`/visits/${encodeURIComponent(sessionId)}/assessments`} className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 focus-visible:outline-2 focus-visible:outline-teal"><span className="min-w-0"><strong className="text-sm">{names.name}</strong><span className="ml-2 text-xs text-[#475569]">{names.full_name}</span><span className="mt-1 block text-[11px] text-[#475569]">{detail}</span></span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${status.className}`}>{status.label}</span></Link></li>; })}</ul> : <p role="status" className="rounded-3xl border border-dashed border-coral/40 bg-white/40 px-6 py-6 text-sm text-[#475569]">{data?.assessments === null ? 'Assessment records are unavailable.' : 'No assessments are required by this patient’s active diagnoses.'}</p>}</section>

			</div>
		</>}
	</main>;
}
