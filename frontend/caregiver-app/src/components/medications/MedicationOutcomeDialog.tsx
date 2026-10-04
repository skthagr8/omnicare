import { useEffect, useRef } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import type { useVisitMedications } from '@/hooks/useVisitMedications';

const field = 'mt-2 min-h-12 w-full rounded-lg border border-[#c5d4c9] bg-white px-3 py-3 text-base focus:outline-2 focus:outline-[#287b7c]';
function localNow() { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); }

export default function MedicationOutcomeDialog({ list }: { list: ReturnType<typeof useVisitMedications> }) {
	const dialog = useRef<HTMLDialogElement>(null);
	const action = list.action;
	useEffect(() => { if (action && !dialog.current?.open) dialog.current?.showModal(); if (!action && dialog.current?.open) dialog.current.close(); }, [action]);
	return <dialog ref={dialog} aria-labelledby="medication-outcome-title" onCancel={event => { event.preventDefault(); if (!list.saving) list.closeAction(); }} className="caregiver-login fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-lg border border-[#d5dfd7] bg-[#fffefa] p-6 text-[#303538] backdrop:bg-black/25">
		{action && <form key={`${action.medication.id}-${action.status}`} onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); const reason = String(values.get('reason') || '').trim(); if (action.status !== 'administered' && !reason) return; if (action.status === 'administered' && values.get('verified') !== 'on') return; const time = String(values.get('time') || ''); const glucose = values.get('glucose'); void list.save(action.status === 'administered' ? { administeredAt: new Date(time).toISOString(), ...(glucose ? { glucose: Number(glucose) } : {}) } : { reason }); }}>
			<div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[#287b7c]">{action.medication.name} / {action.medication.dosage}</p><h2 id="medication-outcome-title" className="mt-2 text-xl font-semibold">{action.status === 'administered' ? 'Record administration' : action.status === 'missed' ? 'Record missed dose' : 'Record refusal'}</h2></div><button type="button" disabled={list.saving} onClick={list.closeAction} aria-label="Close medication entry" className="flex size-10 shrink-0 items-center justify-center rounded-lg"><X aria-hidden="true" className="size-5" /></button></div>
			<fieldset disabled={list.saving} className="min-w-0 space-y-4">{action.status === 'administered' ? <>
				<p className="text-xs leading-6 text-[#737c77]">Record only an administration that has already occurred. A pill photo alone does not verify medication identity.</p>
				<label className="flex min-h-12 items-start gap-3 text-sm leading-6"><input name="verified" type="checkbox" required className="mt-1 size-5 shrink-0 accent-[#637862]" /><span>I checked the medication label, patient, dose, and care instructions.</span></label>
				<div><label htmlFor="medication-time" className="text-sm font-semibold">Actual administration time</label><input id="medication-time" name="time" type="datetime-local" required defaultValue={localNow()} max={localNow()} className={field} /></div>
				{action.medication.requires_glucose_check && <div><label htmlFor="glucose-value" className="text-sm font-semibold">Recorded glucose reading (care-plan units)</label><input id="glucose-value" name="glucose" type="number" required min={.01} step="any" className={field} /></div>}
			</> : <div><label htmlFor="medication-reason" className="text-sm font-semibold">{action.status === 'missed' ? 'Reason for missed dose' : 'Reason for refusal'}</label><textarea id="medication-reason" name="reason" required maxLength={1000} rows={4} className={field} /></div>}</fieldset>
			<div className="mt-6 flex gap-3"><button type="button" disabled={list.saving} onClick={list.closeAction} className="min-h-12 flex-1 rounded-lg border border-[#cdd3d0] text-sm text-[#64716b]">Cancel</button><button type="submit" disabled={list.saving || !list.canRecord} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold ${action.status === 'refused' ? 'border border-[#d4a34d] bg-[#fff2d6] text-[#94621b]' : 'bg-[#637862] text-white'}`}>{list.saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}{list.saving ? 'Saving...' : 'Save record'}</button></div>
		</form>}
	</dialog>;
}