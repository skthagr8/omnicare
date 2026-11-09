'use client';

import { useEffect, useRef, useState } from 'react';
import {
	LoaderCircle,
	X,
	Check,
	Clock3,
	MessageCircle,
	Pill,
	ArrowLeft,
	RefreshCw,
	WifiOff,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
	useVisitMedications,
	type MedicationFilter,
	type MedicationSort,
	useWeeklyMedications,
} from '../../hooks/useCareRecords';
import { type MedicationAdministration, type MedicationOutcome, type VisitMedication, shiftWeek } from '../../services/records';

// --- MedicationOutcomeDialog ---
const field = 'mt-2 min-h-12 w-full rounded-lg border border-[#f0d9c8] bg-white px-3 py-3 text-base focus:outline-2 focus:outline-teal';
function localNow() { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); }

export function MedicationOutcomeDialog({ list }: { list: ReturnType<typeof useVisitMedications> }) {
	const dialog = useRef<HTMLDialogElement>(null);
	const action = list.action;
	useEffect(() => { if (action && !dialog.current?.open) dialog.current?.showModal(); if (!action && dialog.current?.open) dialog.current.close(); }, [action]);
	return <dialog ref={dialog} aria-labelledby="medication-outcome-title" onCancel={event => { event.preventDefault(); if (!list.saving) list.closeAction(); }} className="caregiver-login fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-2xl border border-coral-soft bg-cream p-6 text-ink backdrop:bg-black/25 shadow-sm">
		{action && <form key={`${action.medication.id}-${action.status}`} onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); const reason = String(values.get('reason') || '').trim(); if (action.status !== 'administered' && !reason) return; if (action.status === 'administered' && values.get('verified') !== 'on') return; const time = String(values.get('time') || ''); const glucose = values.get('glucose'); void list.save(action.status === 'administered' ? { administeredAt: new Date(time).toISOString(), ...(glucose ? { glucose: Number(glucose) } : {}) } : { reason }); }}>
			<div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-teal">{action.medication.name} / {action.medication.dosage}</p><h2 id="medication-outcome-title" className="mt-2 text-xl font-semibold">{action.status === 'administered' ? 'Record administration' : action.status === 'missed' ? 'Record missed dose' : 'Record refusal'}</h2></div><button type="button" disabled={list.saving} onClick={list.closeAction} aria-label="Close medication entry" className="flex size-10 shrink-0 items-center justify-center rounded-lg"><X aria-hidden="true" className="size-5" /></button></div>
			<fieldset disabled={list.saving} className="min-w-0 space-y-4">{action.status === 'administered' ? <>
				<p className="text-xs leading-6 text-[#475569]">Record only an administration that has already occurred. A pill photo alone does not verify medication identity.</p>
				<label className="flex min-h-12 items-start gap-3 text-sm leading-6"><input name="verified" type="checkbox" required className="mt-1 size-5 shrink-0 accent-[#475569]" /><span>I checked the medication label, patient, dose, and care instructions.</span></label>
				<div><label htmlFor="medication-time" className="text-sm font-semibold">Actual administration time</label><input id="medication-time" name="time" type="datetime-local" required defaultValue={localNow()} max={localNow()} className={field} /></div>
				{action.medication.requires_glucose_check && <div><label htmlFor="glucose-value" className="text-sm font-semibold">Recorded glucose reading (care-plan units)</label><input id="glucose-value" name="glucose" type="number" required min={.01} step="any" className={field} /></div>}
			</> : <div><label htmlFor="medication-reason" className="text-sm font-semibold">{action.status === 'missed' ? 'Reason for missed dose' : 'Reason for refusal'}</label><textarea id="medication-reason" name="reason" required maxLength={1000} rows={4} className={field} /></div>}</fieldset>
			<div className="mt-6 flex gap-3"><button type="button" disabled={list.saving} onClick={list.closeAction} className="min-h-12 flex-1 rounded-lg border border-coral-soft text-sm text-[#334155]">Cancel</button><button type="submit" disabled={list.saving || !list.canRecord} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold ${action.status === 'refused' ? 'border border-[#f59e0b] bg-[#fef3c7] text-[#b45309]' : 'bg-[#475569] text-white'}`}>{list.saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}{list.saving ? 'Saving...' : 'Save record'}</button></div>
		</form>}
	</dialog>;
}

// --- MedicationRow ---
export function MedicationRow({ medication, record, recordsAvailable, disabled, onAction }: { medication: VisitMedication; record?: MedicationAdministration; recordsAvailable: boolean; disabled: boolean; onAction: (status: MedicationOutcome) => void }) {
	const [failedImage, setFailedImage] = useState(false);
	const image = medication.pill_image_url && /^(https?:\/\/|\/(?!\/))/.test(medication.pill_image_url) && !failedImage ? medication.pill_image_url : null;
	return <article aria-label={medication.name} className="rounded-2xl border border-coral-soft bg-cream p-5 sm:p-6 shadow-sm">
		<div className="flex items-start gap-4"><div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-coral-soft bg-white shadow-sm">{image ? <img src={image} referrerPolicy="no-referrer" alt={`${medication.name} reference pill image`} onError={() => setFailedImage(true)} className="size-full object-contain p-2" /> : <Pill aria-hidden="true" className="size-7 text-[#64748b]" strokeWidth={1.5} />}</div><div className="min-w-0 flex-1"><h2 className="text-lg font-semibold wrap-anywhere">{medication.name}</h2><p className="mt-1 text-sm text-[#334155]">{medication.dosage}</p><p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs leading-5 text-teal"><Clock3 aria-hidden="true" className="size-3.5" />Scheduled window: {medication.window_start_local.slice(0, 5)} - {medication.window_end_local.slice(0, 5)}</p><p className="mt-2 text-xs leading-5 text-[#475569]">{image ? medication.pill_image_verified && medication.pill_image_source ? `Verified reference / ${medication.pill_image_source}` : 'Reference image / verification not provided' : 'Pill reference image unavailable'}</p></div></div>
		{medication.instructions && <p className="mt-4 text-sm leading-6 wrap-anywhere text-[#334155]">{medication.instructions}</p>}
		{medication.requires_glucose_check && <p className="mt-3 text-xs font-semibold text-[#b45309]">Glucose check required by recorded instructions</p>}
		<div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-coral-soft pt-4"><p className="text-xs leading-6 text-[#334155]">Visit status: <span className="font-semibold capitalize">{recordsAvailable ? record?.status || 'Pending' : 'Unavailable'}</span>{record?.administered_at && <span> / {new Date(record.administered_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}</p><div role="group" aria-label={`${medication.name} medication actions`} className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:grid-cols-[120px_120px_120px]">
			<button type="button" disabled={disabled} onClick={() => onAction('administered')} className="flex min-h-12 items-center justify-center gap-1 rounded-full border border-[#475569] bg-[#475569] px-1 text-[10px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#475569] disabled:opacity-60 sm:text-xs"><Check aria-hidden="true" className="hidden size-3.5 sm:block" />Administered</button>
			<button type="button" disabled={disabled} onClick={() => onAction('missed')} className="min-h-12 rounded-full border border-coral-soft bg-cream px-1 text-[10px] font-semibold text-[#334155] focus-visible:outline-2 focus-visible:outline-[#334155] disabled:opacity-60 sm:text-xs">Missed</button>
			<button type="button" disabled={disabled} onClick={() => onAction('refused')} className="flex min-h-12 items-center justify-center gap-1 rounded-full border border-[#f59e0b] bg-[#fffbeb] px-1 text-[10px] font-semibold text-[#b45309] focus-visible:outline-2 focus-visible:outline-[#b45309] disabled:opacity-60 sm:text-xs"><MessageCircle aria-hidden="true" className="hidden size-3.5 sm:block" />Refused</button>
		</div></div>
		{record?.missed_reason && <p className={`mt-3 text-sm leading-6 whitespace-pre-wrap wrap-anywhere ${record.status === 'refused' ? 'text-[#b45309]' : 'text-[#334155]'}`}><span className="font-semibold">Reason: </span>{record.missed_reason}</p>}
	</article>;
}

// --- VisitMedicationList ---
export function VisitMedicationList({ sessionId }: { sessionId: string }) {
	const list = useVisitMedications(sessionId);
	return <main className="caregiver-login min-h-svh bg-cream px-5 py-6 text-ink sm:px-8"><div className="mx-auto max-w-4xl">
		<Link href={`/visits/${encodeURIComponent(sessionId)}`} className="mb-5 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-teal"><ArrowLeft aria-hidden="true" className="size-4" />Back to patient care</Link>
		<div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Medication</h1><p className="mt-2 text-sm text-[#475569]">{list.data?.visit.clientName || 'Visit workspace'} / {list.data?.medications.length ?? 0} medications</p></div><button type="button" onClick={() => list.setCalendarOpen(true)} disabled={!list.data || list.loading || list.saving} className="min-h-11 text-xs font-semibold text-teal underline underline-offset-4 disabled:opacity-50">View full schedule</button></div>
		<div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-y border-coral-soft py-4"><div role="group" aria-label="Filter medication status" className="flex max-w-full flex-wrap gap-1 rounded-lg bg-cream p-1">{([{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'administered', label: 'Administered' }, { value: 'missed', label: 'Missed' }, { value: 'refused', label: 'Refused' }] as { value: MedicationFilter; label: string }[]).map(option => <button key={option.value} type="button" aria-pressed={list.filter === option.value} onClick={() => list.setFilter(option.value)} className={`min-h-10 rounded px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-teal ${list.filter === option.value ? 'bg-white text-teal shadow-sm' : 'text-[#334155]'}`}>{option.label}</button>)}</div><div className="flex items-center gap-2"><label htmlFor="medication-sort" className="text-xs text-[#475569]">Sort by:</label><select id="medication-sort" value={list.sort} onChange={event => list.setSort(event.target.value as MedicationSort)} className="min-h-11 rounded-lg border border-coral-soft bg-white px-3 text-xs text-[#334155]"><option value="window">Due soonest</option><option value="name">Drug name</option><option value="status">Status</option></select><button type="button" onClick={list.refreshList} disabled={list.loading || list.saving || !list.isOnline} aria-label="Refresh medication list" title="Refresh medication list" className="flex size-11 items-center justify-center rounded-lg text-[#334155] disabled:opacity-50"><RefreshCw aria-hidden="true" className="size-4" /></button></div></div>
		<div role="status" className="mb-3 min-h-6 text-xs text-[#475569]">{!list.isOnline && <span className="flex items-center gap-2"><WifiOff aria-hidden="true" className="size-3.5" />Offline / Connect to record medication care</span>}</div>
		{list.loading && <p role="status" className="mb-5 text-sm text-[#475569]">Loading medications...</p>}{list.error && <p role="alert" className="mb-5 text-sm leading-6 text-[#b45309]">{list.error}</p>}
		{list.data && !list.data.recordsAvailable && <p role="status" className="mb-5 text-sm leading-6 text-[#475569]">Administration history is unavailable. Recording is paused to avoid duplicate doses.</p>}
		{list.data && list.data.visit.status !== 'in_progress' && <p className="mb-5 text-sm text-[#334155]">This visit is not in progress. Medication records are read-only.</p>}
		{list.saveError && <p role="alert" className="mb-5 text-sm leading-6 text-[#b45309]">{list.saveError}</p>}<p role="status" aria-live="polite" className="mb-3 text-sm text-[#334155]">{list.announcement}</p>
		<div className="space-y-5">{list.medications.map(medication => <MedicationRow key={medication.id} medication={medication} record={list.latest.get(medication.id)} recordsAvailable={Boolean(list.data?.recordsAvailable)} disabled={!list.canRecord || list.latest.has(medication.id)} onAction={status => list.openAction(medication, status)} />)}</div>
		{!list.loading && !list.error && !list.medications.length && <p role="status" className="py-12 text-center text-sm text-[#475569]">No medications match this view.</p>}
		<MedicationOutcomeDialog list={list} />
		{list.calendarOpen && list.data && <WeeklyMedicationCalendar clientId={list.data.visit.client_id} patientName={list.data.visit.clientName} onClose={() => list.setCalendarOpen(false)} isOnline={list.isOnline} />}
	</div></main>;
}

// --- WeeklyMedicationCalendar ---
function dateKey(value: string, timezone: string) { const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value)); return `${parts.find(part => part.type === 'year')?.value}-${parts.find(part => part.type === 'month')?.value}-${parts.find(part => part.type === 'day')?.value}`; }

export function WeeklyMedicationCalendar({ clientId, patientName, onClose, isOnline }: { clientId: string; patientName: string; onClose: () => void; isOnline: boolean }) {
	const dialog = useRef<HTMLDialogElement>(null);
	const week = useWeeklyMedications(clientId);
	useEffect(() => { dialog.current?.showModal(); }, []);
	const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(`${week.weekStart}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + index); return date.toISOString().slice(0, 10); });
	const formatter = new Intl.DateTimeFormat(undefined, { timeZone: week.data?.timezone || 'UTC', hour: 'numeric', minute: '2-digit' });
	return <dialog ref={dialog} aria-labelledby="weekly-medication-title" onCancel={event => { event.preventDefault(); onClose(); }} className="caregiver-login fixed inset-0 m-auto max-h-[92svh] w-[calc(100%-1rem)] max-w-7xl overflow-y-auto rounded-2xl border border-coral-soft bg-cream p-4 text-ink backdrop:bg-black/25 sm:p-6 shadow-sm">
		<div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="weekly-medication-title" className="text-xl font-semibold">Weekly Medication Schedule</h2><p className="mt-2 text-xs text-[#475569]">{patientName} / Read-only{week.data ? ` / ${week.data.timezone}` : ''}</p></div><button type="button" onClick={onClose} aria-label="Close weekly schedule" className="flex size-10 shrink-0 items-center justify-center rounded-lg"><X aria-hidden="true" className="size-5" /></button></div>
		<div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold">{week.weekStart} - {days[6]}</p><div className="flex gap-2"><button type="button" aria-label="Previous week" title="Previous week" disabled={!isOnline} onClick={week.previousWeek} className="flex size-11 items-center justify-center rounded-lg border border-coral-soft disabled:opacity-50"><ChevronLeft aria-hidden="true" className="size-4" /></button><button type="button" aria-label="Next week" title="Next week" disabled={!isOnline} onClick={week.nextWeek} className="flex size-11 items-center justify-center rounded-lg border border-coral-soft disabled:opacity-50"><ChevronRight aria-hidden="true" className="size-4" /></button><button type="button" aria-label="Refresh weekly schedule" title="Refresh weekly schedule" disabled={!isOnline || week.loading} onClick={week.refresh} className="flex size-11 items-center justify-center rounded-lg disabled:opacity-50"><RefreshCw aria-hidden="true" className="size-4" /></button></div></div>
		{week.loading ? <p role="status" className="py-8 text-sm text-[#475569]">Loading weekly dose records...</p> : week.error ? <p role="alert" className="py-8 text-sm leading-6 text-[#b45309]">{week.error}</p> : week.data && <div className="overflow-x-auto"><div role="region" aria-label="Read-only weekly medication calendar" className="grid min-w-280 grid-cols-7 gap-3">{days.map(day => <section key={day} aria-label={day} className="min-w-0 rounded-2xl border border-coral-soft bg-white p-3 shadow-sm"><h3 className="mb-4 border-b border-cream pb-3 text-xs font-semibold">{new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${day}T12:00:00Z`))}</h3><div className="space-y-3">{week.data!.doses.filter(dose => dateKey(dose.scheduled_at, week.data!.timezone) === day).sort((first, second) => Date.parse(first.scheduled_at) - Date.parse(second.scheduled_at)).map(dose => {
			const hasAdministration = dose.status === 'administered' && Boolean(dose.administered_at);
			const actual = dose.administered_at ? Date.parse(dose.administered_at) : null;
			const timing = hasAdministration && actual !== null ? actual < Date.parse(dose.window_start) ? 'Before window' : actual > Date.parse(dose.window_end) ? 'After window' : 'Within window' : dose.status === 'administered' ? 'Time unavailable' : null;
			const style = dose.status === 'refused' ? 'bg-[#fef3c7] text-[#b45309]' : dose.status === 'missed' ? 'bg-[#ffe4e6] text-[#be123c]' : timing === 'Within window' ? 'bg-teal-soft text-[#334155]' : dose.status === 'administered' ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-cream text-[#475569]';
			return <article key={dose.id} className="rounded-lg border border-coral-soft p-3"><h4 className="flex items-start gap-1.5 text-xs font-semibold wrap-anywhere"><Pill aria-hidden="true" className="mt-0.5 size-3 shrink-0 text-teal" />{dose.medication_name}</h4><p className="mt-1 text-[11px] leading-5 wrap-anywhere text-[#475569]">{dose.dosage}</p><p className="mt-2 text-[11px] text-[#334155]">Due {formatter.format(new Date(dose.scheduled_at))}</p><p className="mt-1 text-[10px] text-[#475569]">Window {formatter.format(new Date(dose.window_start))} - {formatter.format(new Date(dose.window_end))}</p><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${style}`}>{dose.status === 'unrecorded' ? 'No record' : dose.status}</span>{timing && <p className="mt-2 text-[11px] font-semibold text-[#334155]">{timing}{dose.administered_at ? ` / ${formatter.format(new Date(dose.administered_at))}` : ''}</p>}{dose.reason && <p className="mt-2 text-[11px] leading-5 whitespace-pre-wrap wrap-anywhere text-[#475569]">Reason: {dose.reason}</p>}{dose.recorded_by_name && <p className="mt-2 text-[10px] text-[#475569]">{dose.recorded_by_name}</p>}</article>;
		})}{!week.data!.doses.some(dose => dateKey(dose.scheduled_at, week.data!.timezone) === day) && <p className="text-xs leading-6 text-[#475569]">No scheduled doses returned.</p>}</div></section>)}</div></div>}
	</dialog>;
}

// --- route wrappers ---
export function VisitMedicationsRoute() {
	const { sessionID } = useParams<{ sessionID: string }>();
	return <VisitMedicationList key={sessionID} sessionId={sessionID} />;
}
