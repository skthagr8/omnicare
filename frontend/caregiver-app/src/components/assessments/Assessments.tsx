'use client';

import {
	ArrowDownWideNarrow,
	Plus,
	RefreshCw,
	History,
	MoreVertical,
	Pencil,
	LoaderCircle,
	X,
	ArrowLeft,
	Stethoscope,
	WifiOff,
	ChartNoAxesCombined,
	MessageCircle,
	UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
	type AssessmentFilter,
	type AssessmentSort,
	useAssessmentList,
	type ListDialog,
	useInstrumentHistory,
} from '../../hooks/useCareRecords';
import { itemEntries, type EntryValues, type HistoryRecord } from '../../services/records';
import type { AssessmentState } from '../../services/visits';
import { InstrumentCard } from '../../components/point-of-care/PointOfCare';

// --- AssessmentListToolbar ---
export function AssessmentListToolbar({ list }: { list: ReturnType<typeof useAssessmentList> }) {
	return <header className="mb-6">
		<div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Assessments</h1><p className="mt-2 text-sm text-[#475569]">{list.data?.visit.clientName || 'Visit workspace'} / {list.items.length} instruments</p></div><button type="button" onClick={() => list.openPicker()} disabled={!list.canWrite} className="flex min-h-12 items-center gap-2 rounded-xl bg-teal px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-60 shadow-sm"><Plus aria-hidden="true" className="size-4" />Add Assessment</button></div>
		<div className="flex flex-wrap items-center justify-between gap-4 border-y border-coral-soft py-4"><div role="group" aria-label="Filter assessment status" className="grid w-full grid-cols-4 gap-1 rounded-lg bg-cream p-1 sm:w-auto">{([{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'refused', label: 'Refused' }, { value: 'completed', label: 'Complete' }] as { value: AssessmentFilter; label: string }[]).map(option => <button key={option.value} type="button" aria-pressed={list.filter === option.value} onClick={() => list.setFilter(option.value)} className={`min-h-10 rounded px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-teal sm:px-4 ${list.filter === option.value ? 'bg-white text-teal shadow-sm' : 'text-[#334155]'}`}>{option.label}</button>)}</div><div className="flex items-center gap-2"><label htmlFor="assessment-sort" className="text-xs text-[#475569]">Sort by:</label><div className="relative"><ArrowDownWideNarrow aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#334155]" /><select id="assessment-sort" value={list.sort} onChange={event => list.setSort(event.target.value as AssessmentSort)} className="min-h-11 rounded-lg border border-coral-soft bg-white py-2 pr-6 pl-9 text-xs text-[#334155]"><option value="due">Due soonest</option><option value="recorded">Last recorded</option><option value="name">Instrument name</option></select></div><button type="button" onClick={list.refreshList} disabled={list.loading || list.saving || !list.isOnline} aria-label="Refresh assessment list" title="Refresh assessment list" className="flex size-11 items-center justify-center rounded-lg text-[#334155] disabled:opacity-50"><RefreshCw aria-hidden="true" className="size-4" /></button></div></div>
	</header>;
}

// --- AssessmentOverflowMenu ---
type AssessmentOverflowMenuProps = { name: string; canWrite: boolean; canEdit: boolean; onAdd: () => void; onEdit: () => void; onHistory: () => void };

export function AssessmentOverflowMenu({ name, canWrite, canEdit, onAdd, onEdit, onHistory }: AssessmentOverflowMenuProps) {
	const [open, setOpen] = useState(false);
	const root = useRef<HTMLDivElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		if (!open) return;
		root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
		const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
		document.addEventListener('pointerdown', dismiss);
		return () => document.removeEventListener('pointerdown', dismiss);
	}, [open]);
	return <div ref={root} className="relative" onKeyDown={event => {
		if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
		if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
			event.preventDefault();
			const buttons = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') || [])];
			const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
			const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
			buttons[next]?.focus();
		}
	}}><button ref={trigger} type="button" aria-label={`${name} more actions`} aria-haspopup="menu" aria-expanded={open} title={`${name} more actions`} onClick={() => setOpen(!open)} className="flex size-10 items-center justify-center rounded-lg text-[#334155] hover:bg-cream focus-visible:outline-2 focus-visible:outline-teal"><MoreVertical aria-hidden="true" className="size-5" /></button>{open && <div role="menu" aria-label={`${name} secondary actions`} className="absolute top-11 right-0 z-20 w-56 max-w-[75vw] rounded-2xl border border-coral-soft bg-white p-1 shadow-lg">{[{ label: 'Add ad-hoc assessment', icon: Plus, disabled: !canWrite, action: onAdd }, { label: 'Edit last entry', icon: Pencil, disabled: !canEdit, action: onEdit }, { label: 'View history', icon: History, disabled: false, action: onHistory }].map(item => <button key={item.label} type="button" role="menuitem" disabled={item.disabled} onClick={() => { setOpen(false); item.action(); }} className="flex min-h-11 w-full items-center gap-2 rounded px-3 text-left text-xs text-[#334155] hover:bg-teal-soft focus:bg-teal-soft focus:outline-none disabled:opacity-50"><item.icon aria-hidden="true" className="size-4 shrink-0" />{item.label}</button>)}</div>}</div>;
}

// --- AssessmentListDialog ---
const field = 'mt-2 min-h-12 w-full rounded-lg border border-[#f0d9c8] bg-white px-3 py-3 text-base outline-none focus:ring-2 focus:ring-[#5cc4b8]';

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
		{state === 'pending' ? <p className="text-sm leading-6 text-[#334155]">Record this assessment as pending for this visit.</p> : state === 'refused' ? <div><label htmlFor="list-refusal" className="text-sm font-semibold">Reason for refusal</label><textarea id="list-refusal" name="reason" required maxLength={1000} defaultValue={previous?.refused_reason || ''} rows={3} className={field} /></div> : type ? <>
			<div><label htmlFor="list-score" className="text-sm font-semibold">{type === 'tug' ? 'Completion time (seconds)' : 'Total assessed score'}</label><input id="list-score" name="score" type="number" required defaultValue={previousScore ?? undefined} min={type === 'tug' ? .01 : type === 'cmai' ? 29 : 6} max={type === 'tug' ? undefined : type === 'cmai' ? 203 : 23} step={type === 'tug' ? .01 : 1} className={field} /></div>
			{type === 'tug' && <><label className="flex min-h-11 items-center gap-3 text-sm"><input name="hesitation" type="checkbox" defaultChecked={previous?.tug?.hesitation_flag} className="size-5 accent-[#475569]" />Hesitation observed</label><label className="flex min-h-11 items-center gap-3 text-sm"><input name="freezing" type="checkbox" defaultChecked={previous?.tug?.freezing_flag} className="size-5 accent-[#475569]" />Freezing observed</label></>}
			{type === 'braden' && <div><label htmlFor="list-skin-notes" className="text-sm font-semibold">Skin observations (optional)</label><textarea id="list-skin-notes" name="notes" rows={3} maxLength={1000} defaultValue={previous?.braden?.skin_inspection_notes || ''} className={field} /></div>}
		</> : <div><label htmlFor="list-result" className="text-sm font-semibold">Recorded result</label><textarea id="list-result" name="result" required maxLength={2000} defaultValue={previous?.result_note || ''} rows={4} className={field} /></div>}
	</fieldset><div className="mt-6 flex gap-3"><button type="button" disabled={list.saving} onClick={list.closeDialog} className="min-h-12 flex-1 rounded-lg border border-coral-soft text-sm text-[#334155]">Cancel</button><button type="submit" disabled={list.saving || !list.canWrite} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold ${state === 'refused' ? 'border-[#f59e0b] bg-[#fef3c7] text-[#b45309]' : 'border-[#475569] bg-[#475569] text-white'}`}>{list.saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}{list.saving ? 'Saving...' : previous ? 'Save changes' : state === 'refused' ? 'Save refusal' : 'Save entry'}</button></div></form>;
}

function PickerForm({ list, selection }: { list: ReturnType<typeof useAssessmentList>; selection: Extract<ListDialog, { kind: 'picker' }> }) {
	const options = list.relevantInstruments;
	const [instrumentId, setInstrumentId] = useState(options.some(instrument => instrument.id === selection.instrumentId) ? selection.instrumentId! : options[0]?.id || 'other');
	return <form onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); const rationale = String(values.get('rationale') || '').trim(); const name = String(values.get('name') || '').trim(); if (!rationale || (instrumentId === 'other' && !name)) return; void list.addItem(instrumentId === 'other' ? { custom_name: name, rationale } : { instrument_id: instrumentId, rationale }); }}><fieldset disabled={list.saving} className="min-w-0 space-y-4">
		<p className="text-xs leading-6 text-[#475569]">{list.data?.catalogAvailable ? `Instruments relevant to ${list.data.diagnosis.replaceAll('_', ' ')}.` : 'The clinical instrument catalog is unavailable. Other lets you request a non-templated assessment.'}</p>
		<div><label htmlFor="instrument-picker" className="text-sm font-semibold">Instrument</label><select id="instrument-picker" value={instrumentId} onChange={event => setInstrumentId(event.target.value)} className={field}>{options.map(instrument => <option key={instrument.id} value={instrument.id}>{instrument.name} / {instrument.full_name}</option>)}<option value="other">Other / not templated</option></select></div>
		{instrumentId === 'other' && <div><label htmlFor="custom-instrument" className="text-sm font-semibold">Assessment name</label><input id="custom-instrument" name="name" required maxLength={150} className={field} /></div>}
		<div><label htmlFor="assessment-rationale" className="text-sm font-semibold">Clinical reason for adding</label><textarea id="assessment-rationale" name="rationale" required maxLength={1000} rows={3} className={field} /></div>
	</fieldset><button type="submit" disabled={list.saving || !list.canWrite} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 text-sm font-semibold text-white shadow-sm">{list.saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}{list.saving ? 'Adding...' : 'Add to this visit'}</button></form>;
}

export function AssessmentListDialog({ list }: { list: ReturnType<typeof useAssessmentList> }) {
	const modal = useRef<HTMLDialogElement>(null);
	const selection = list.dialog;
	useEffect(() => { if (selection && !modal.current?.open) modal.current?.showModal(); if (!selection && modal.current?.open) modal.current.close(); }, [selection]);
	const title = selection?.kind === 'picker' ? 'Add Assessment' : selection?.kind === 'history' ? `${selection.item.instrument.name} history` : selection?.edit ? `Edit ${selection.item.instrument.name} entry` : selection ? `${selection.item.instrument.name} / ${selection.state === 'completed' ? 'Complete' : selection.state === 'refused' ? 'Refused' : 'Pending'}` : '';
	return <dialog ref={modal} aria-labelledby="list-dialog-title" onCancel={event => { event.preventDefault(); if (!list.saving) list.closeDialog(); }} className="caregiver-login fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-2xl border border-coral-soft bg-cream p-6 text-ink shadow-xl backdrop:bg-black/25">{selection && <><div className="mb-5 flex items-start justify-between gap-4"><h2 id="list-dialog-title" className="text-xl leading-7 font-semibold">{title}</h2><button type="button" disabled={list.saving} onClick={list.closeDialog} aria-label="Close assessment details" className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[#334155]"><X aria-hidden="true" className="size-5" /></button></div>
		{selection.kind === 'picker' ? <PickerForm key={selection.instrumentId || 'picker'} selection={selection} list={list} /> : selection.kind === 'entry' ? <EntryForm key={`${selection.item.id}-${selection.edit?.id || selection.state}`} selection={selection} list={list} /> : <div><p className="mb-5 text-xs text-[#475569]">Read-only entry history for this visit.</p>{itemEntries(selection.item).length ? <ol className="space-y-5">{itemEntries(selection.item).map(record => <li key={record.id} className="border-l-2 border-teal-soft pl-4"><p className="text-sm font-semibold capitalize">{record.state === 'completed' ? 'Complete' : record.state}</p><p className="mt-1 text-xs text-[#475569]">{Number.isFinite(Date.parse(record.created_at)) ? new Date(record.created_at).toLocaleString() : 'Date unavailable'}</p>{record.refused_reason && <p className="mt-2 text-sm leading-6">{record.refused_reason}</p>}{record.result_note && <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{record.result_note}</p>}{record.tug?.completion_time_sec != null && <p className="mt-2 text-sm">{record.tug.completion_time_sec} seconds</p>}{record.cmai?.total_score != null && <p className="mt-2 text-sm">Score: {record.cmai.total_score}</p>}{record.braden?.total_score != null && <p className="mt-2 text-sm">Score: {record.braden.total_score}</p>}</li>)}</ol> : <p className="text-sm text-[#475569]">No entries recorded for this visit.</p>}</div>}
	</>}</dialog>;
}

// --- VisitAssessmentList ---
export function VisitAssessmentList({ sessionId }: { sessionId: string }) {
	const router = useRouter();
	const list = useAssessmentList(sessionId);
	return <main className="caregiver-login min-h-svh bg-cream px-5 py-6 text-ink sm:px-8"><div className="mx-auto max-w-4xl">
		<Link href={`/visits/${encodeURIComponent(sessionId)}`} className="mb-5 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-teal"><ArrowLeft aria-hidden="true" className="size-4" />Back to patient care</Link>
		<AssessmentListToolbar list={list} />
		<div role="status" className="mb-3 min-h-6 text-xs text-[#475569]">{!list.isOnline && <span className="flex items-center gap-2"><WifiOff aria-hidden="true" className="size-3.5" />Offline / Connect to save assessment changes</span>}</div>
		{list.loading && <p role="status" className="mb-5 text-sm text-[#475569]">Loading assessments...</p>}
		{list.error && <p role="alert" className="mb-5 text-sm text-[#b45309]">{list.error}</p>}
		{list.data?.recordsError && <p role="alert" className="mb-5 text-sm text-[#b45309]">{list.data.recordsError}</p>}
		{list.data && !list.data.managedItemsAvailable && <p className="mb-5 text-xs leading-6 text-[#475569]">Template assessments shown. Due times and ad-hoc items are unavailable until the visit assessment service is connected.</p>}
		{list.data?.visit.status !== 'in_progress' && list.data && <p className="mb-5 text-sm text-[#334155]">This visit is not in progress. Assessments are read-only.</p>}
		{list.saveError && <p role="alert" className="mb-5 text-sm leading-6 text-[#b45309]">{list.saveError}</p>}
		<p role="status" aria-live="polite" className="mb-3 text-sm text-[#334155]">{list.announcement}</p>
		<div className="space-y-5">{list.visibleItems.map(item => {
			const current = itemEntries(item)[0];
			return <div key={item.id}><InstrumentCard instrument={{ id: item.id, name: item.instrument.name, fullName: item.instrument.full_name, description: item.instrument.description, icon: Stethoscope }} current={current} lastRecorded={current} available={!list.loading && !list.error && !list.data?.recordsError} disabled={!list.canWrite} onAction={(_, state) => list.openEntry(item, state)} secondaryActions={<AssessmentOverflowMenu name={item.instrument.name} canWrite={list.canWrite} canEdit={list.canWrite && Boolean(current)} onAdd={() => list.openPicker(item.instrument.id)} onEdit={() => { if (current) list.openEntry(item, current.state, current); }} onHistory={() => router.push(`/visits/${encodeURIComponent(sessionId)}/assessments/assessmentType/History?instrument=${encodeURIComponent(item.instrument.backend_type || item.instrument.id)}`)} />} /><p className="mt-2 px-2 text-xs text-[#475569]">Due: {item.due_at ? new Date(item.due_at).toLocaleString() : 'Not specified'}</p></div>;
		})}</div>
		{!list.loading && !list.error && !list.visibleItems.length && <p role="status" className="py-12 text-center text-sm text-[#475569]">No assessments match this view.</p>}
		<AssessmentListDialog list={list} />
	</div></main>;
}

// --- InstrumentTrend ---
type InstrumentTrendProps = { entries: HistoryRecord[]; name: string; metric: string; unit: string };

export function InstrumentTrend({ entries, name, metric, unit }: InstrumentTrendProps) {
	const scores = entries.flatMap(entry => entry.numericScore === null ? [] : [entry.numericScore]);
	const min = scores.length ? Math.min(...scores) : 0;
	const max = scores.length ? Math.max(...scores) : 1;
	const padding = Math.max((max - min) * .2, max * .05, .5);
	const lower = Math.max(0, min - padding);
	const upper = max + padding;
	const x = (index: number) => entries.length > 1 ? 65 + index * (590 / (entries.length - 1)) : 360;
	const y = (value: number) => 210 - (value - lower) / (upper - lower) * 165;
	const segments: string[][] = [];
	let segment: string[] = [];
	for (const [index, entry] of entries.entries()) {
		if (entry.numericScore === null) { if (segment.length) segments.push(segment); segment = []; }
		else segment.push(`${x(index)},${y(entry.numericScore)}`);
	}
	if (segment.length) segments.push(segment);
	const latestScore = [...entries].reverse().find(entry => entry.numericScore !== null)?.numericScore;

	return <section aria-label={`${name} trend`} className="mb-9 border-b border-coral-soft pb-7">
		<div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{metric}</h2><p className="mt-1 text-xs leading-5 text-[#475569]">Last {entries.length} {entries.length === 1 ? 'recording' : 'recordings'}{unit ? ` / ${unit}` : ''}</p></div>{latestScore !== undefined && <div className="text-right"><p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide">Latest scored result</p><p className="mt-1 text-2xl font-semibold text-teal">{latestScore}<span className="ml-2 text-xs font-normal text-[#475569]">{unit}</span></p></div>}</div>
		{scores.length ? <div className="overflow-x-auto rounded-2xl border border-coral-soft bg-white px-2 py-4 shadow-sm"><svg viewBox="0 0 720 285" role="img" aria-label={`${name} trend: ${scores.length} scored results across ${entries.length} recordings. Refused and unscored entries have no numerical value.`} className="block w-full min-w-[560px]">
			<title>{name} recorded {metric.toLowerCase()}</title><desc>Scores appear in chronological order. Gaps indicate refused, pending, or unavailable scores; they are not zero values.</desc>
			{[0, 1, 2, 3].map(tick => { const value = lower + (upper - lower) * tick / 3; const position = y(value); return <g key={tick}><line x1="65" y1={position} x2="655" y2={position} stroke="#f6e8dd" /><text x="53" y={position + 4} textAnchor="end" fill="#475569" fontSize="11">{Number(value.toFixed(1))}</text></g>; })}
			{segments.filter(points => points.length > 1).map((points, index) => <polyline key={index} data-trend-segment fill="none" stroke="#22a699" strokeWidth="2.5" strokeLinejoin="round" points={points.join(' ')} />)}
			{entries.map((entry, index) => <g key={entry.id}>
				{entry.numericScore !== null ? <circle data-score={entry.numericScore} cx={x(index)} cy={y(entry.numericScore)} r="5" fill="#22a699" stroke="white" strokeWidth="2"><title>{new Date(entry.recordedAt).toLocaleDateString()}: {entry.numericScore} {unit}</title></circle> : <circle data-unscored={entry.state} cx={x(index)} cy="227" r="4.5" fill={entry.state === 'refused' ? '#f59e0b' : '#94a3b8'}><title>{new Date(entry.recordedAt).toLocaleDateString()}: {entry.state === 'refused' ? `Refused / ${entry.refused_reason || 'Reason not recorded'}` : 'No scored result'}</title></circle>}
				{(entries.length <= 6 || index % 2 === 0 || index === entries.length - 1) && <text x={x(index)} y="253" textAnchor="middle" fill="#475569" fontSize="11">{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(entry.recordedAt))}</text>}
			</g>)}
		</svg></div> : <div className="rounded-2xl border border-coral-soft bg-white px-5 py-10 text-center shadow-sm"><ChartNoAxesCombined aria-hidden="true" className="mx-auto mb-3 size-8 text-[#64748b]" /><p className="text-sm leading-6 text-[#334155]">No scored recordings available for this instrument.</p></div>}
		<div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#475569]"><span className="flex items-center gap-2"><span aria-hidden="true" className="size-2 rounded-full bg-teal" />Scored recording</span><span className="flex items-center gap-2"><span aria-hidden="true" className="size-2 rounded-full bg-[#f59e0b]" />Refused / not scored</span><span className="flex items-center gap-2"><span aria-hidden="true" className="size-2 rounded-full bg-[#94a3b8]" />Pending or score unavailable</span></div>
	</section>;
}

// --- InstrumentHistoryEntries ---
export function InstrumentHistoryEntries({ entries, unit }: { entries: HistoryRecord[]; unit: string }) {
	return <section aria-label="Past assessment entries"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Past Entries</h2><span className="text-xs text-[#475569]">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span></div>
		{entries.length ? <ol aria-label="Reverse-chronological assessment entries" className="space-y-4">{entries.map(entry => {
			const refused = entry.state === 'refused';
			const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.recordedAt));
			return <li key={entry.id}><article aria-label={`${date}, ${refused ? 'Refused' : entry.state}`} className={`rounded-lg border px-5 py-5 ${refused ? 'border-[#fde68a] bg-[#fffbeb]' : 'border-[#f6e8dd] bg-cream'}`}>
				<div className="flex flex-wrap items-start justify-between gap-3"><div><time dateTime={entry.recordedAt} className="text-sm font-semibold text-[#334155]">{date}</time><p className="mt-2 flex flex-wrap items-center gap-2 text-xs leading-5 text-[#475569]"><UserRound aria-hidden="true" className="size-3.5" /><span>{entry.recorderName ? `Recorded by ${entry.recorderName}` : entry.administered_by ? 'Recorder name unavailable' : 'Recorder not recorded'}</span></p></div>
				<span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${refused ? 'bg-[#fef3c7] text-[#b45309]' : entry.numericScore !== null ? 'bg-teal-soft text-[#334155]' : 'bg-[#f6e8dd] text-[#334155]'}`}>{refused && <MessageCircle aria-hidden="true" className="size-3.5" />}{refused ? 'Refused' : entry.state === 'pending' ? 'Pending' : entry.numericScore !== null ? `${entry.numericScore}${unit ? ` ${unit}` : ''}` : 'Score unavailable'}</span>
				</div>
				{refused && <p className="mt-4 text-sm leading-7 whitespace-pre-wrap wrap-anywhere text-[#b45309]"><span className="font-semibold">Reason: </span>{entry.refused_reason?.trim() || 'Reason not recorded.'}</p>}
				{entry.result_note && <p className="mt-3 text-sm leading-7 whitespace-pre-wrap wrap-anywhere text-[#334155]">{entry.result_note}</p>}
			</article></li>;
		})}</ol> : <p role="status" className="border-t border-coral-soft py-10 text-center text-sm text-[#475569]">No entries recorded for this instrument.</p>}
	</section>;
}

// --- InstrumentHistoryScreen ---
export function InstrumentHistoryScreen({ sessionId }: { sessionId: string }) {
	const history = useInstrumentHistory(sessionId);
	const { data } = history;
	return <main className="caregiver-login min-h-svh bg-cream px-5 py-6 text-ink sm:px-8"><div className="mx-auto max-w-4xl">
		<Link href={`/visits/${encodeURIComponent(sessionId)}/assessments`} className="mb-5 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-teal"><ArrowLeft aria-hidden="true" className="size-4" />Back to assessments</Link>
		<header className="mb-5 flex items-start justify-between gap-4"><div><p className="mb-2 text-xs text-[#475569]">{data?.visit.clientName || 'Patient assessment history'}</p><h1 className="text-2xl leading-8 font-semibold wrap-anywhere">{data ? `${data.metadata.name} History` : 'Instrument History'}</h1></div><button type="button" onClick={history.refreshHistory} disabled={history.loading || !history.isOnline} aria-label="Refresh instrument history" title="Refresh instrument history" className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-coral-soft bg-white text-[#334155] focus-visible:outline-2 focus-visible:outline-teal disabled:opacity-50 shadow-sm"><RefreshCw aria-hidden="true" className={`size-4 ${history.loading ? 'animate-spin motion-reduce:animate-none' : ''}`} /></button></header>
		<div role="status" className="mb-4 flex min-h-7 items-center gap-2 text-xs text-[#475569]">{!history.isOnline && <><WifiOff aria-hidden="true" className="size-3.5 shrink-0" />Offline / Showing last loaded history</>}</div>
		{history.loading && <p role="status" className="mb-5 text-sm text-[#475569]">Loading instrument history...</p>}
		{history.error && <p role="alert" className="mb-5 text-sm leading-6 text-[#b45309]">{history.error}</p>}
		{data?.recorderWarning && <p role="status" className="mb-5 text-xs leading-6 text-[#475569]">Some recorder names are unavailable. Recorded IDs are retained.</p>}
		{data && <><InstrumentTrend entries={data.trendEntries} name={data.metadata.name} metric={data.metadata.metric} unit={data.metadata.unit} /><InstrumentHistoryEntries entries={data.entries} unit={data.metadata.unit} /></>}
	</div></main>;
}

// --- route wrappers ---
export function VisitAssessmentsRoute() {
	const { sessionID } = useParams<{ sessionID: string }>();
	return <VisitAssessmentList key={sessionID} sessionId={sessionID} />;
}

function HistoryRoute() {
	const { sessionID } = useParams<{ sessionID: string }>();
	const searchParams = useSearchParams();
	return <InstrumentHistoryScreen key={`${sessionID}-${searchParams.toString()}`} sessionId={sessionID} />;
}

export function InstrumentHistoryRoute() {
	return <Suspense fallback={<p className="p-6 text-sm text-[#475569]">Loading instrument history...</p>}><HistoryRoute /></Suspense>;
}
