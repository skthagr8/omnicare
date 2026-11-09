'use client';

import { CalendarDays, Flag, UsersRound, RefreshCw, Search, SlidersHorizontal, Clock3, UserRound } from 'lucide-react';
import type { useAdminDashboard } from '../../hooks/useSchedule';

// --- dashboardStyles ---
export function normalizeCode(value: string) { return value.toLowerCase().replaceAll('-', '_').replaceAll(' ', '_'); }

export const diagnoses: Record<string, { label: string; className: string }> = {
	dementia: { label: 'Dementia', className: 'bg-violet-50 text-violet-700' },
	parkinsons: { label: "Parkinson's", className: 'bg-teal-50 text-teal-700' },
	parkinson: { label: "Parkinson's", className: 'bg-teal-50 text-teal-700' },
	post_stroke: { label: 'Post-Stroke', className: 'bg-sky-50 text-sky-700' },
	general_geriatric: { label: 'General Geriatric', className: 'bg-slate-100 text-slate-600' },
};

// null = the backend has no active diagnosis / open acuity tier for the patient.
export function diagnosisStyle(value: string | null) {
	if (!value) return { label: 'Not recorded', className: 'bg-slate-100 text-slate-500' };
	return diagnoses[normalizeCode(value)] || { label: value.replaceAll('_', ' '), className: 'bg-slate-100 text-slate-600' };
}

export function acuityCode(value: string | null) {
	if (!value) return 'unrecorded';
	const code = normalizeCode(value);
	return ({ red: 'high', amber: 'medium', yellow: 'medium', green: 'low' } as Record<string, string>)[code] || code;
}

export const acuityStrips: Record<string, string> = { high: 'bg-rose-500', medium: 'bg-amber-400', low: 'bg-teal-500' };

export function caregiverStyle(value: string) {
	return ({ available: { label: 'Available', dot: 'bg-teal-500' }, en_route: { label: 'En-route', dot: 'bg-amber-500' }, in_service: { label: 'In-service', dot: 'bg-sky-500' }, emergency: { label: 'Emergency', dot: 'bg-rose-500' }, off_shift: { label: 'Off shift', dot: 'bg-slate-400' } } as Record<string, { label: string; dot: string }>)[normalizeCode(value)] || { label: 'Unknown', dot: 'bg-slate-300' };
}

export function appointmentStyle(value: string) {
	return ({ scheduled: { label: 'Scheduled', chip: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' }, in_progress: { label: 'In-Service', chip: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' }, in_service: { label: 'In-Service', chip: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' }, completed: { label: 'Completed', chip: 'bg-teal-50 text-teal-700', dot: 'bg-teal-500' }, missed: { label: 'Missed', chip: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' }, cancelled: { label: 'Cancelled', chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' } } as Record<string, { label: string; chip: string; dot: string }>)[normalizeCode(value)] || { label: 'Unknown', chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-300' };
}

export function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase(); }

export function patientAge(birth: string, now: Date | null) {
	if (!now || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return '-';
	const date = new Date(`${birth}T00:00:00`);
	if (!Number.isFinite(date.getTime()) || date > now) return '-';
	const birthdayPassed = now.getMonth() > date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
	return String(now.getFullYear() - date.getFullYear() - (birthdayPassed ? 0 : 1));
}

export function appointmentTime(value: string) {
	return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

// --- DashboardSummaryStrip ---
export function DashboardSummaryStrip({ dashboard: state }: { dashboard: ReturnType<typeof useAdminDashboard> }) {
	const patientCount = state.dashboard?.patients === null || !state.dashboard ? null : state.patients.length;
	const appointmentCount = state.dashboard?.sessions === null || !state.dashboard ? null : state.sessions.length;
	return <section aria-label="Daily overview" className="border-b border-coral-soft bg-white px-5 sm:px-8"><div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-8 gap-y-3 py-4 text-sm">
		<p className="flex items-center gap-2 text-[#475569]"><UsersRound aria-hidden="true" className="size-4 text-[#64748b]" /><strong className="font-semibold text-ink">{patientCount ?? (state.loading ? 'Loading' : 'Unavailable')}</strong>total patients</p>
		<p className="flex items-center gap-2 text-[#475569]"><CalendarDays aria-hidden="true" className="size-4 text-[#64748b]" /><strong className="font-semibold text-ink">{appointmentCount ?? (state.loading ? 'Loading' : 'Unavailable')}</strong>appointments today</p>
		<p className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${state.flagCount === null ? 'bg-slate-100 text-slate-600' : state.flagCount > 0 ? 'bg-amber-50 text-amber-800' : 'bg-teal-50 text-teal-700'}`}><Flag aria-hidden="true" className="size-3.5" />{state.flagCount === null ? state.loading ? 'Checking AI flags' : 'AI flags unavailable' : `${state.flagCount} ${state.flagCount === 1 ? 'patient' : 'patients'} with unresolved AI flags`}</p>
		<span className="ml-auto text-xs text-[#64748b]">{state.now ? new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(state.now) : 'Today'}</span>
	</div></section>;
}

// --- DashboardToolbar ---
export function DashboardToolbar({ dashboard: state }: { dashboard: ReturnType<typeof useAdminDashboard> }) {
	return <header className="border-b border-coral-soft bg-cream px-5 py-5 sm:px-8">
		<div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-5">
			<div><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#475569]">Daily Operations</p><h1 className="text-2xl leading-8 font-semibold text-ink">Patients &amp; Appointments</h1></div>
			<div className="flex w-full flex-wrap items-center gap-3 xl:w-auto">
				<div className="relative min-w-0 flex-1 xl:w-64"><Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#64748b]" /><input aria-label="Search patients or caregivers" type="search" value={state.query} onChange={event => state.setQuery(event.target.value)} placeholder="Search patients or caregivers" className="min-h-11 w-full rounded-lg border border-coral-soft bg-white py-2 pr-3 pl-10 text-sm text-ink outline-none placeholder:text-[#475569] focus:border-[#475569] focus:ring-2 focus:ring-[#475569]/15" /></div>
				<div className="flex min-w-0 flex-wrap items-center gap-3"><SlidersHorizontal aria-hidden="true" className="hidden size-4 text-[#64748b] sm:block" /><select aria-label="Filter diagnosis category" value={state.diagnosis} onChange={event => state.setDiagnosis(event.target.value)} className="min-h-11 max-w-full rounded-lg border border-coral-soft bg-white px-3 text-xs text-[#334155] focus:outline-2 focus:outline-[#475569]"><option value="all">All diagnoses</option>{state.diagnosisOptions.map(diagnosis => <option key={diagnosis} value={diagnosis}>{diagnosis}</option>)}</select><select aria-label="Filter acuity tier" value={state.acuity} onChange={event => state.setAcuity(event.target.value)} className="min-h-11 rounded-lg border border-coral-soft bg-white px-3 text-xs text-[#334155] focus:outline-2 focus:outline-[#475569]"><option value="all">All acuity tiers</option><option value="high">High acuity</option><option value="medium">Medium acuity</option><option value="low">Low acuity</option></select><button type="button" onClick={state.refreshDashboard} disabled={state.loading || !state.isOnline} aria-label="Refresh dashboard" title="Refresh dashboard" className="flex size-11 items-center justify-center rounded-2xl border border-coral-soft bg-white text-[#334155] hover:bg-[#ffffff] focus-visible:outline-2 focus-visible:outline-[#475569] disabled:opacity-50 shadow-sm"><RefreshCw aria-hidden="true" className={`size-4 ${state.loading ? 'animate-spin motion-reduce:animate-none' : ''}`} /></button></div>
			</div>
		</div>
	</header>;
}

// --- AppointmentsAgenda ---
export function AppointmentsAgenda({ dashboard: state }: { dashboard: ReturnType<typeof useAdminDashboard> }) {
	const names = new Map(state.patients.map(patient => [patient.id, patient.full_name]));
	return <section id="dashboard-appointments" aria-label="Today's appointments" className="flex min-h-0 min-w-0 scroll-mt-32 flex-col border-t border-coral-soft bg-white lg:border-t-0 lg:border-l">
		<div className="flex min-h-19 items-center justify-between gap-3 border-b border-cream px-5 py-4 sm:px-6"><div className="min-w-0"><h2 className="text-base font-semibold">Today&apos;s Appointments</h2><p role="status" className="mt-1 text-xs leading-5 wrap-anywhere text-[#64748b]">{state.selectedPatient ? `${state.selectedPatient.full_name} / ${state.visibleSessions.length} appointments` : `${state.visibleSessions.length} appointments shown`}</p></div><button type="button" onClick={state.clearSelection} disabled={!state.selectedPatient} className="min-h-10 shrink-0 rounded px-2 text-xs font-semibold text-teal underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-teal disabled:text-[#64748b]">View All</button></div>
		<div ref={state.agendaRef} className="min-h-0 overflow-y-auto px-5 py-5 lg:flex-1 sm:px-6">
			{state.loading && !state.dashboard ? <p role="status" className="py-8 text-sm text-[#475569]">Loading appointments...</p> : state.dashboard?.sessions == null ? <p role="status" className="py-8 text-sm leading-6 text-[#475569]">Today&apos;s appointments are unavailable. Refresh when connected.</p> : state.visibleSessions.length ? <ol aria-label="Daily appointment timeline" className="space-y-5">
				{state.visibleSessions.map(session => {
					const status = appointmentStyle(session.status);
					const code = normalizeCode(session.status);
					const caregiver = state.caregivers.get(session.caregiver_id);
					const patientName = names.get(session.client_id) || 'Patient details unavailable';
					return <li key={session.id} className="relative grid grid-cols-[12px_minmax(0,1fr)] gap-3"><span aria-hidden="true" className="absolute top-5 bottom-[-20px] left-[5px] w-px bg-teal-soft" /><span aria-hidden="true" className={`relative z-10 mt-5 size-2.5 rounded-full ring-4 ring-white ${status.dot}`} /><article aria-label={`${patientName}, ${status.label}`} className={`min-w-0 rounded-2xl border bg-white px-4 py-4 shadow-sm ${['in_progress', 'in_service'].includes(code) ? 'border-teal-soft border-l-4 border-l-teal shadow-[0_3px_12px_rgba(34,166,153,0.05)]' : code === 'missed' ? 'border-[#fecdd3] bg-[#fff1f2]' : 'border-[#f6e8dd]'}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-xs font-semibold text-[#334155]"><Clock3 aria-hidden="true" className="size-3.5 shrink-0" /><time dateTime={session.scheduled_start}>{appointmentTime(session.scheduled_start)}</time><span>-</span><time dateTime={session.scheduled_end}>{appointmentTime(session.scheduled_end)}</time></p><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${status.chip}`}>{status.label}</span></div><h3 className="mt-3 text-sm leading-6 font-semibold wrap-anywhere text-ink">{patientName}</h3><p className="mt-2 flex items-center gap-2 text-xs leading-5 text-[#475569]"><span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-soft text-[9px] font-semibold text-[#475569]">{caregiver?.full_name ? initials(caregiver.full_name) : <UserRound className="size-3" />}</span><span className="wrap-anywhere">{caregiver?.full_name || 'Caregiver details unavailable'}</span></p></article></li>;
				})}
			</ol> : <div role="status" className="py-12 text-center"><CalendarDays aria-hidden="true" className="mx-auto mb-3 size-8 text-[#94a3b8]" strokeWidth={1.5} /><p className="text-sm leading-6 text-[#475569]">{state.selectedPatient ? 'No appointments for this patient today.' : 'No appointments match this view.'}</p></div>}
		</div>
	</section>;
}

// --- PatientsRoster ---
export function PatientsRoster({ dashboard: state }: { dashboard: ReturnType<typeof useAdminDashboard> }) {
	return <section aria-label="Patients roster" className="flex min-h-0 min-w-0 flex-col bg-white">
		<div className="flex min-h-19 flex-wrap items-center justify-between gap-2 border-b border-cream px-5 py-4 sm:px-6"><div><h2 className="text-base font-semibold">Patients</h2><p className="mt-1 text-xs text-[#64748b]">{state.filteredPatients.length} shown{state.dashboard?.patients ? ` of ${state.patients.length}` : ''}</p></div><span className="text-xs text-[#64748b]">Assignments for today</span></div>
		<div className="min-h-0 overflow-auto lg:flex-1">
			{state.loading && !state.dashboard ? <p role="status" className="px-6 py-12 text-sm text-[#475569]">Loading patients...</p> : state.dashboard?.patients == null ? <p role="status" className="px-6 py-12 text-sm leading-6 text-[#475569]">Patient roster unavailable. Refresh when connected.</p> : <>
				<table className="w-full min-w-[700px] border-collapse text-left"><caption className="sr-only">Patient roster; select a patient to view their appointments today.</caption><thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_#f6e8dd]"><tr className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]"><th scope="col" className="w-1.5 p-0"><span className="sr-only">Acuity</span></th><th scope="col" className="px-4 py-3">Patient Name</th><th scope="col" className="px-3 py-3">Diagnosis Category</th><th scope="col" className="px-3 py-3">Age</th><th scope="col" className="px-3 py-3">Assigned Caregiver</th><th scope="col" className="px-3 py-3">Caregiver Status</th></tr></thead><tbody>
					{state.filteredPatients.map(patient => {
						const selected = state.selectedPatient?.id === patient.id;
						const session = state.representative.get(patient.id);
						const caregiver = state.caregivers.get(session?.caregiver_id || '');
						const status = caregiverStyle(caregiver?.status || 'unknown');
						const diagnosis = diagnosisStyle(patient.diagnosis_category);
						const acuity = acuityCode(patient.acuity_tier);
						return <tr key={patient.id} onClick={() => state.selectPatient(patient.id)} className={`cursor-pointer transition-colors ${selected ? 'bg-teal-soft [&>td]:border-teal-soft' : 'even:bg-cream/60 hover:bg-[#f2fbf9]'}`}>
							<td className="relative w-1.5 p-0"><span title={`${acuity} acuity`} aria-label={`${acuity} acuity`} className={`absolute inset-0 ${acuityStrips[acuity] || 'bg-slate-300'}`} /></td>
							<td className="border-b border-cream px-4 py-5"><button type="button" aria-pressed={selected} aria-controls="dashboard-appointments" onClick={event => { event.stopPropagation(); state.selectPatient(patient.id); }} className="min-h-10 text-left text-sm leading-5 font-semibold text-ink focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">{patient.full_name}</button>{state.flaggedIds.has(patient.id) && <span title="Unresolved AI risk flag" className="ml-2 inline-flex align-middle text-amber-700"><Flag aria-label="Unresolved AI risk flag" className="size-3.5" /></span>}</td>
							<td className="border-b border-cream px-3 py-5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] leading-4 font-medium ${diagnosis.className}`}>{diagnosis.label}</span></td>
							<td className="border-b border-cream px-3 py-5 text-xs text-[#475569]">{patientAge(patient.date_of_birth, state.now)}</td>
							<td className="border-b border-cream px-3 py-5"><div className="flex items-center gap-2"><span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-soft text-[10px] font-semibold text-[#334155]">{initials(caregiver?.full_name || '') || '?'}</span><span className="text-xs leading-5 text-[#334155]">{caregiver?.full_name || (session ? 'Caregiver unavailable' : state.dashboard?.sessions === null ? 'Assignment unavailable' : 'No visit today')}</span></div></td>
							<td className="border-b border-cream px-3 py-5"><span className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] text-[#475569]"><span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${status.dot}`} />{session ? status.label : '-'}</span></td>
						</tr>;
					})}
				</tbody></table>
				{!state.filteredPatients.length && <p role="status" className="px-6 py-12 text-center text-sm text-[#475569]">No patients match the current filters.</p>}
			</>}
		</div>
		{state.dashboard?.caregivers === null && <p role="status" className="border-t border-cream px-5 py-3 text-xs text-[#64748b]">Caregiver details are unavailable. Appointments remain visible.</p>}
	</section>;
}
