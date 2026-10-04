import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import type { ListDialog, useAssessmentList } from '@/hooks/useAssessmentList';
import { itemEntries, type EntryValues } from '@/services/assessmentList';
import type { AssessmentState } from '@/services/pointOfCare';

const field = 'mt-2 min-h-12 w-full rounded-lg border border-[#c5d4c9] bg-white px-3 py-3 text-base outline-none focus:ring-2 focus:ring-[#63afaf]';

function EntryForm({ selection, list }: { selection: Extract<ListDialog, { kind: 'entry' }>; list: ReturnType<typeof useAssessmentList> }) {
	const [state, setState] = useState<AssessmentState>(selection.state);
	const previous = selection.edit;
	const type = selection.item.instrument.backend_type;
	const previousScore = type === 'tug' ? previous?.tug?.completion_time_sec : type === 'cmai' ? previous?.cmai?.total_score : previous?.braden?.total_score;
	return <form onSubmit={event => {
		event.preventDefault();
		const values = new FormData(event.currentTarget);
		const score = Number(values.get('score'));
		const entry: EntryValues = { state, ...(state === 'completed' ? { administered_at: previous?.administered_at || new Date().toISOString() } : {}) };
		if (state === 'refused') { entry.refused_reason = String(values.get('reason') || '').trim(); if (!entry.refused_reason) return; }
		if (state === 'completed') {
			if (!type) { entry.result_note = String(values.get('result') || '').trim(); if (!entry.result_note) return; }
			else { if (!Number.isFinite(score)) return; if (type === 'tug') entry.tug = { completion_time_sec: score, hesitation_flag: values.get('hesitation') === 'on', freezing_flag: values.get('freezing') === 'on' }; if (type === 'cmai') entry.cmai = { total_score: score }; if (type === 'braden') entry.braden = { total_score: score, skin_inspection_notes: String(values.get('notes') || '').trim() || undefined }; }
		}
		void list.saveEntry(entry);
	}}><fieldset disabled={list.saving} className="min-w-0 space-y-4">
		{previous && <div><label htmlFor="edit-state" className="text-sm font-semibold">Entry status</label><select id="edit-state" value={state} onChange={event => setState(event.target.value as AssessmentState)} className={field}><option value="pending">Pending</option><option value="refused">Refused</option><option value="completed">Complete</option></select></div>}
		{state === 'pending' ? <p className="text-sm leading-6 text-[#64716b]">Record this assessment as pending for this visit.</p> : state === 'refused' ? <div><label htmlFor="list-refusal" className="text-sm font-semibold">Reason for refusal</label><textarea id="list-refusal" name="reason" required maxLength={1000} defaultValue={previous?.refused_reason || ''} rows={3} className={field} /></div> : type ? <>
			<div><label htmlFor="list-score" className="text-sm font-semibold">{type === 'tug' ? 'Completion time (seconds)' : 'Total assessed score'}</label><input id="list-score" name="score" type="number" required defaultValue={previousScore ?? undefined} min={type === 'tug' ? .01 : type === 'cmai' ? 29 : 6} max={type === 'tug' ? undefined : type === 'cmai' ? 203 : 23} step={type === 'tug' ? .01 : 1} className={field} /></div>
			{type === 'tug' && <><label className="flex min-h-11 items-center gap-3 text-sm"><input name="hesitation" type="checkbox" defaultChecked={previous?.tug?.hesitation_flag} className="size-5 accent-[#637862]" />Hesitation observed</label><label className="flex min-h-11 items-center gap-3 text-sm"><input name="freezing" type="checkbox" defaultChecked={previous?.tug?.freezing_flag} className="size-5 accent-[#637862]" />Freezing observed</label></>}
			{type === 'braden' && <div><label htmlFor="list-skin-notes" className="text-sm font-semibold">Skin observations (optional)</label><textarea id="list-skin-notes" name="notes" rows={3} maxLength={1000} defaultValue={previous?.braden?.skin_inspection_notes || ''} className={field} /></div>}
		</> : <div><label htmlFor="list-result" className="text-sm font-semibold">Recorded result</label><textarea id="list-result" name="result" required maxLength={2000} defaultValue={previous?.result_note || ''} rows={4} className={field} /></div>}
	</fieldset><div className="mt-6 flex gap-3"><button type="button" disabled={list.saving} onClick={list.closeDialog} className="min-h-12 flex-1 rounded-lg border border-[#cdd3d0] text-sm text-[#64716b]">Cancel</button><button type="submit" disabled={list.saving || !list.canWrite} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold ${state === 'refused' ? 'border-[#d4a34d] bg-[#fff2d6] text-[#94621b]' : 'border-[#637862] bg-[#637862] text-white'}`}>{list.saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}{list.saving ? 'Saving...' : previous ? 'Save changes' : state === 'refused' ? 'Save refusal' : 'Save entry'}</button></div></form>;
}

function PickerForm({ list, selection }: { list: ReturnType<typeof useAssessmentList>; selection: Extract<ListDialog, { kind: 'picker' }> }) {
	const options = list.relevantInstruments;
	const [instrumentId, setInstrumentId] = useState(options.some(instrument => instrument.id === selection.instrumentId) ? selection.instrumentId! : options[0]?.id || 'other');
	return <form onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); const rationale = String(values.get('rationale') || '').trim(); const name = String(values.get('name') || '').trim(); if (!rationale || (instrumentId === 'other' && !name)) return; void list.addItem(instrumentId === 'other' ? { custom_name: name, rationale } : { instrument_id: instrumentId, rationale }); }}><fieldset disabled={list.saving} className="min-w-0 space-y-4">
		<p className="text-xs leading-6 text-[#737c77]">{list.data?.catalogAvailable ? `Instruments relevant to ${list.data.diagnosis.replaceAll('_', ' ')}.` : 'The clinical instrument catalog is unavailable. Other lets you request a non-templated assessment.'}</p>
		<div><label htmlFor="instrument-picker" className="text-sm font-semibold">Instrument</label><select id="instrument-picker" value={instrumentId} onChange={event => setInstrumentId(event.target.value)} className={field}>{options.map(instrument => <option key={instrument.id} value={instrument.id}>{instrument.name} / {instrument.full_name}</option>)}<option value="other">Other / not templated</option></select></div>
		{instrumentId === 'other' && <div><label htmlFor="custom-instrument" className="text-sm font-semibold">Assessment name</label><input id="custom-instrument" name="name" required maxLength={150} className={field} /></div>}
		<div><label htmlFor="assessment-rationale" className="text-sm font-semibold">Clinical reason for adding</label><textarea id="assessment-rationale" name="rationale" required maxLength={1000} rows={3} className={field} /></div>
	</fieldset><button type="submit" disabled={list.saving || !list.canWrite} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#287b7c] px-4 text-sm font-semibold text-white">{list.saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}{list.saving ? 'Adding...' : 'Add to this visit'}</button></form>;
}

export default function AssessmentListDialog({ list }: { list: ReturnType<typeof useAssessmentList> }) {
	const modal = useRef<HTMLDialogElement>(null);
	const selection = list.dialog;
	useEffect(() => { if (selection && !modal.current?.open) modal.current?.showModal(); if (!selection && modal.current?.open) modal.current.close(); }, [selection]);
	const title = selection?.kind === 'picker' ? 'Add Assessment' : selection?.kind === 'history' ? `${selection.item.instrument.name} history` : selection?.edit ? `Edit ${selection.item.instrument.name} entry` : selection ? `${selection.item.instrument.name} / ${selection.state === 'completed' ? 'Complete' : selection.state === 'refused' ? 'Refused' : 'Pending'}` : '';
	return <dialog ref={modal} aria-labelledby="list-dialog-title" onCancel={event => { event.preventDefault(); if (!list.saving) list.closeDialog(); }} className="caregiver-login fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-lg border border-[#d5dfd7] bg-[#fffefa] p-6 text-[#303538] shadow-xl backdrop:bg-black/25">{selection && <><div className="mb-5 flex items-start justify-between gap-4"><h2 id="list-dialog-title" className="text-xl leading-7 font-semibold">{title}</h2><button type="button" disabled={list.saving} onClick={list.closeDialog} aria-label="Close assessment details" className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[#64716b]"><X aria-hidden="true" className="size-5" /></button></div>
		{selection.kind === 'picker' ? <PickerForm key={selection.instrumentId || 'picker'} selection={selection} list={list} /> : selection.kind === 'entry' ? <EntryForm key={`${selection.item.id}-${selection.edit?.id || selection.state}`} selection={selection} list={list} /> : <div><p className="mb-5 text-xs text-[#737c77]">Read-only entry history for this visit.</p>{itemEntries(selection.item).length ? <ol className="space-y-5">{itemEntries(selection.item).map(record => <li key={record.id} className="border-l-2 border-[#dce9e5] pl-4"><p className="text-sm font-semibold capitalize">{record.state === 'completed' ? 'Complete' : record.state}</p><p className="mt-1 text-xs text-[#737c77]">{Number.isFinite(Date.parse(record.created_at)) ? new Date(record.created_at).toLocaleString() : 'Date unavailable'}</p>{record.refused_reason && <p className="mt-2 text-sm leading-6">{record.refused_reason}</p>}{record.result_note && <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{record.result_note}</p>}{record.tug?.completion_time_sec != null && <p className="mt-2 text-sm">{record.tug.completion_time_sec} seconds</p>}{record.cmai?.total_score != null && <p className="mt-2 text-sm">Score: {record.cmai.total_score}</p>}{record.braden?.total_score != null && <p className="mt-2 text-sm">Score: {record.braden.total_score}</p>}</li>)}</ol> : <p className="text-sm text-[#737c77]">No entries recorded for this visit.</p>}</div>}
	</>}</dialog>;
}