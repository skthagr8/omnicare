'use client';

import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from './useDevice';
import {
	addAssessmentItem,
	fetchAssessmentList,
	itemEntries,
	saveListEntry,
	type AssessmentItem,
	type EntryValues,
	type ListEntry,
	fetchInstrumentHistory,
	fetchVisitMedications,
	recordMedication,
	type MedicationOutcome,
	type VisitMedication,
	currentWeekStart,
	fetchWeeklyMedications,
	shiftWeek,
	type WeeklyMedicationSchedule,
	createVisitTask,
	fetchVisitTasks,
	updateVisitTask,
	voidVisitTask,
	type TaskChange,
	type TaskFields,
	type VisitTask,
} from '../services/records';
import type { AssessmentState } from '../services/visits';

// --- useAssessmentList ---
export type AssessmentFilter = 'all' | AssessmentState;
export type AssessmentSort = 'due' | 'recorded' | 'name';
export type ListDialog = { kind: 'picker'; instrumentId?: string } | { kind: 'entry'; item: AssessmentItem; state: AssessmentState; edit: ListEntry | null } | { kind: 'history'; item: AssessmentItem };

export function useAssessmentList(sessionId: string) {
	const isOnline = useOnlineStatus();
	const [data, setData] = useState<Awaited<ReturnType<typeof fetchAssessmentList>> | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [reload, setReload] = useState(0);
	const [filter, setFilter] = useState<AssessmentFilter>('all');
	const [sort, setSort] = useState<AssessmentSort>('due');
	const [dialog, setDialog] = useState<ListDialog | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState('');
	const [announcement, setAnnouncement] = useState('');
	const lock = useRef<AbortController | null>(null);
	const mounted = useRef(false);

	useEffect(() => { mounted.current = true; return () => { mounted.current = false; lock.current?.abort(); }; }, []);
	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		setLoading(true);
		setError('');
		fetchAssessmentList(sessionId, controller.signal).then(result => { if (!disposed) { setData(result); setSaveError(''); } }).catch(() => { if (!disposed) setError('The assessment list could not be loaded. Please refresh when connected.'); }).finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [sessionId, reload]);

	const items = data?.items || [];
	const visibleItems = items.filter(item => filter === 'all' || (itemEntries(item)[0]?.state || 'pending') === filter).sort((first, second) => {
		const rank = sort === 'due' ? (first.due_at ? Date.parse(first.due_at) : Infinity) - (second.due_at ? Date.parse(second.due_at) : Infinity) : sort === 'recorded' ? (Date.parse(itemEntries(second)[0]?.administered_at || itemEntries(second)[0]?.created_at || '') || 0) - (Date.parse(itemEntries(first)[0]?.administered_at || itemEntries(first)[0]?.created_at || '') || 0) : 0;
		return (Number.isNaN(rank) ? 0 : rank) || first.instrument.name.localeCompare(second.instrument.name) || first.id.localeCompare(second.id);
	});
	const diagnosis = data?.diagnosis?.toLowerCase();
	const relevantInstruments = (data?.catalog || []).filter(instrument => instrument.diagnosis_categories.length === 0 || instrument.diagnosis_categories.some(category => category.toLowerCase() === diagnosis || category === '*'));
	const canWrite = Boolean(data?.visit.status === 'in_progress' && !loading && !error && !data.recordsError && !saving && !saveError && isOnline);

	function openEntry(item: AssessmentItem, state: AssessmentState, edit: ListEntry | null = null) { if (canWrite) { setAnnouncement(''); setDialog({ kind: 'entry', item, state, edit }); } }
	function openPicker(instrumentId?: string) { if (canWrite) { setAnnouncement(''); setDialog({ kind: 'picker', instrumentId }); } }
	function openHistory(item: AssessmentItem) { if (!saving) setDialog({ kind: 'history', item }); }
	function closeDialog() { if (!lock.current) setDialog(null); }

	async function write(operation: (signal: AbortSignal) => Promise<void>) {
		if (!canWrite || lock.current) return;
		const controller = new AbortController();
		lock.current = controller;
		const timeout = setTimeout(() => controller.abort(), 20000);
		setSaving(true);
		setSaveError('');
		try { await operation(controller.signal); if (mounted.current) setDialog(null); }
		catch { if (mounted.current) { setDialog(null); setSaveError('This change could not be confirmed. Refresh the list before trying again.'); } }
		finally { clearTimeout(timeout); lock.current = null; if (mounted.current) setSaving(false); }
	}

	async function addItem(selection: { instrument_id?: string; custom_name?: string; rationale: string }) {
		if (!data) return;
		await write(async signal => {
			const item = await addAssessmentItem(sessionId, data.visit.client_id, selection, signal);
			if (mounted.current) { setData(previous => previous ? { ...previous, items: [...previous.items.filter(existing => existing.id !== item.id), item], managedItemsAvailable: true } : previous); setAnnouncement(`${item.instrument.name} added to this visit.`); }
		});
	}

	async function saveEntry(values: EntryValues) {
		if (!data || dialog?.kind !== 'entry') return;
		const { item, edit } = dialog;
		await write(async signal => {
			const record = await saveListEntry(item, values, data.managedItemsAvailable && !item.id.startsWith('template-'), edit, signal);
			if (mounted.current) { setData(previous => previous ? { ...previous, items: previous.items.map(existing => existing.id === item.id ? { ...existing, entries: [record, ...existing.entries.filter(entry => entry.id !== record.id)] } : existing), history: [record, ...previous.history.filter(entry => entry.id !== record.id)] } : previous); setAnnouncement(`${item.instrument.name} ${edit ? 'entry updated' : values.state === 'refused' ? 'refusal recorded' : values.state === 'completed' ? 'completed' : 'marked pending'}.`); }
		});
	}

	return { data, loading, error, isOnline, filter, setFilter, sort, setSort, items, visibleItems, relevantInstruments, canWrite, dialog, saving, saveError, announcement, openEntry, openPicker, openHistory, closeDialog, addItem, saveEntry, refreshList: () => { if (!lock.current) setReload(value => value + 1); } };
}

// --- useInstrumentHistory ---
export function useInstrumentHistory(sessionId: string) {
	const isOnline = useOnlineStatus();
	const [data, setData] = useState<Awaited<ReturnType<typeof fetchInstrumentHistory>> | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [reload, setReload] = useState(0);
	const [instrument, setInstrument] = useState('');
	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		const values = new URLSearchParams(window.location.search).getAll('instrument');
		const selected = values.length === 0 ? 'tug' : values[0]?.trim().toLowerCase();
		setLoading(true);
		setError('');
		if (values.length > 1 || !selected || !/^[a-z0-9_-]{1,150}$/.test(selected)) {
			setError('This instrument history link is incomplete. Please return to the assessment list.');
			setLoading(false);
			return;
		}
		setInstrument(selected);
		fetchInstrumentHistory(sessionId, selected, controller.signal).then(result => { if (!disposed) setData(result); }).catch(() => { if (!disposed) setError('Instrument history could not be loaded. Please check your connection and try again.'); }).finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [sessionId, reload]);
	return { data, loading, error, instrument, isOnline, refreshHistory: () => setReload(value => value + 1) };
}

// --- useVisitMedications ---
export type MedicationFilter = 'all' | 'pending' | MedicationOutcome;
export type MedicationSort = 'window' | 'name' | 'status';

export function useVisitMedications(sessionId: string) {
	const isOnline = useOnlineStatus();
	const [data, setData] = useState<Awaited<ReturnType<typeof fetchVisitMedications>> | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [reload, setReload] = useState(0);
	const [filter, setFilter] = useState<MedicationFilter>('all');
	const [sort, setSort] = useState<MedicationSort>('window');
	const [action, setAction] = useState<{ medication: VisitMedication; status: MedicationOutcome } | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState('');
	const [announcement, setAnnouncement] = useState('');
	const [calendarOpen, setCalendarOpen] = useState(false);
	const lock = useRef<AbortController | null>(null);
	const active = useRef(false);
	useEffect(() => { active.current = true; return () => { active.current = false; lock.current?.abort(); }; }, []);
	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		setLoading(true); setError('');
		fetchVisitMedications(sessionId, controller.signal).then(result => { if (!disposed) { setData(result); setSaveError(''); } }).catch(() => { if (!disposed) setError('The medication list could not be loaded. Please refresh when connected.'); }).finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [sessionId, reload]);
	const latest = new Map<string, NonNullable<typeof data>['records'][number]>();
	for (const record of data?.records || []) if (!latest.has(record.medication_id)) latest.set(record.medication_id, record);
	const order = { pending: 0, administered: 1, missed: 2, refused: 3 };
	const medications = (data?.medications || []).filter(medication => filter === 'all' || (data?.recordsAvailable && (latest.get(medication.id)?.status || 'pending') === filter)).sort((first, second) => {
		const difference = sort === 'window' ? first.window_start_local.localeCompare(second.window_start_local) : sort === 'status' ? order[latest.get(first.id)?.status || 'pending'] - order[latest.get(second.id)?.status || 'pending'] : 0;
		return difference || first.name.localeCompare(second.name) || first.id.localeCompare(second.id);
	});
	const canRecord = Boolean(data?.visit.status === 'in_progress' && data.recordsAvailable && !loading && !error && !saving && !saveError && isOnline);
	async function save(values: { reason?: string; glucose?: number; administeredAt?: string }) {
		if (!canRecord || !action || !data || lock.current || latest.has(action.medication.id)) return;
		const controller = new AbortController(); lock.current = controller;
		const timeout = setTimeout(() => controller.abort(), 20000);
		setSaving(true); setSaveError('');
		try {
			const record = await recordMedication(sessionId, action.medication, action.status, values, controller.signal);
			if (active.current) { setData(previous => previous ? { ...previous, records: [record, ...previous.records] } : previous); setAnnouncement(`${action.medication.name}: ${action.status} recorded.`); setAction(null); }
		} catch { if (active.current) { setAction(null); setSaveError('This medication record could not be confirmed. Refresh the visit before recording again.'); } }
		finally { clearTimeout(timeout); lock.current = null; if (active.current) setSaving(false); }
	}
	return { data, medications, latest, loading, error, isOnline, filter, setFilter, sort, setSort, action, saving, saveError, announcement, canRecord, calendarOpen, setCalendarOpen,
		openAction: (medication: VisitMedication, status: MedicationOutcome) => { if (canRecord && !latest.has(medication.id)) setAction({ medication, status }); },
		closeAction: () => { if (!lock.current) setAction(null); }, save,
		refreshList: () => { if (!lock.current) setReload(value => value + 1); } };
}

// --- useWeeklyMedications ---
	
export function useWeeklyMedications(clientId: string) {
	const [weekStart, setWeekStart] = useState(currentWeekStart);
	const [data, setData] = useState<WeeklyMedicationSchedule | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [reload, setReload] = useState(0);
	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		setLoading(true); setError(''); setData(null);
		fetchWeeklyMedications(clientId, weekStart, controller.signal).then(result => { if (!disposed) setData(result); }).catch(() => { if (!disposed) setError('The weekly medication schedule and administration history are unavailable. No adherence conclusion can be made.'); }).finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [clientId, weekStart, reload]);
	return { weekStart, data, loading, error, previousWeek: () => setWeekStart(value => shiftWeek(value, -1)), nextWeek: () => setWeekStart(value => shiftWeek(value, 1)), refresh: () => setReload(value => value + 1) };
}

// --- useVisitTasks ---
export type TaskFilter = 'all' | VisitTask['status'];
export type TaskSort = 'time' | 'priority' | 'status';
export type TaskAction = { kind: 'add' } | { kind: 'edit' | 'complete' | 'skip' | 'delete'; task: VisitTask };

// Start of a task's time slot, in minutes after midnight (local time).
// Uses due_at when set; otherwise the leading "HH:MM" of the details or title,
// e.g. "10:00-11:30 (Mid-Morning Activity): ..." -> 600. Null when untimed.
function taskStartMinutes(task: VisitTask): number | null {
	if (task.due_at) {
		const due = new Date(task.due_at);
		if (!Number.isNaN(due.getTime())) return due.getHours() * 60 + due.getMinutes();
	}
	for (const text of [task.details, task.title]) {
		const match = text?.match(/^\s*([01]?\d|2[0-3]):([0-5]\d)/);
		if (match) return Number(match[1]) * 60 + Number(match[2]);
	}
	return null;
}

export function useVisitTasks(sessionId: string) {
	const isOnline = useOnlineStatus();
	const [data, setData] = useState<Awaited<ReturnType<typeof fetchVisitTasks>> | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [reload, setReload] = useState(0);
	const [filter, setFilter] = useState<TaskFilter>('all');
	const [sort, setSort] = useState<TaskSort>('time');
	const [action, setAction] = useState<TaskAction | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState('');
	const [announcement, setAnnouncement] = useState('');
	const lock = useRef<AbortController | null>(null);
	const mounted = useRef(false);
	useEffect(() => { mounted.current = true; return () => { mounted.current = false; lock.current?.abort(); }; }, []);
	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		setLoading(true); setError('');
		fetchVisitTasks(sessionId, controller.signal).then(result => { if (!disposed) { setData(result); setSaveError(''); } }).catch(() => { if (!disposed) setError('This visit could not be loaded. Please refresh when connected.'); }).finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [sessionId, reload]);
	const canWrite = Boolean(data?.tasksAvailable && data.visit.status === 'in_progress' && isOnline && !loading && !error && !saving && !saveError);
	const priorityOrder = { high: 0, normal: 1, low: 2 };
	const statusOrder = { pending: 0, completed: 1, skipped: 2 };
	const tasks = (data?.tasks || []).filter(task => filter === 'all' || task.status === filter).sort((first, second) => {
		const firstStart = taskStartMinutes(first);
		const secondStart = taskStartMinutes(second);
		const due = firstStart === secondStart ? 0 : firstStart === null ? 1 : secondStart === null ? -1 : firstStart - secondStart;
		const rank = sort === 'priority' ? priorityOrder[first.priority] - priorityOrder[second.priority] : sort === 'status' ? statusOrder[first.status] - statusOrder[second.status] : 0;
		return rank || due || Date.parse(first.created_at) - Date.parse(second.created_at) || first.id.localeCompare(second.id);
	});
	async function save(values: { fields?: TaskFields; reason?: string; confirmed?: boolean }) {
		if (!canWrite || !action || !data || lock.current) return;
		if ((action.kind === 'skip' || action.kind === 'delete') && !values.reason?.trim()) return;
		if ((action.kind === 'delete' || action.kind === 'complete') && !values.confirmed) return;
		if ((action.kind === 'add' || action.kind === 'edit') && !values.fields) return;
		const controller = new AbortController(); lock.current = controller;
		const timeout = setTimeout(() => controller.abort(), 20000);
		setSaving(true); setSaveError('');
		try {
			if (action.kind === 'delete') {
				await voidVisitTask(action.task, values.reason!, controller.signal);
				if (mounted.current) { setData(previous => previous ? { ...previous, tasks: previous.tasks.filter(task => task.id !== action.task.id) } : previous); setAnnouncement('Task removed from this visit.'); }
			} else {
				const change: TaskChange | null = action.kind === 'add' ? null : action.kind === 'edit' ? { kind: 'edit', fields: values.fields! } : action.kind === 'skip' ? { kind: 'skip', reason: values.reason! } : { kind: 'complete' };
				const task = action.kind === 'add' ? await createVisitTask(sessionId, data.visit.client_id, values.fields!, controller.signal) : await updateVisitTask(action.task, change!, controller.signal);
				if (mounted.current) { setData(previous => previous ? { ...previous, tasks: [task, ...previous.tasks.filter(existing => existing.id !== task.id)] } : previous); setAnnouncement(action.kind === 'add' ? `${task.title} added.` : action.kind === 'edit' ? `${task.title} updated.` : `${task.title} ${task.status}.`); }
			}
			if (mounted.current) setAction(null);
		} catch { if (mounted.current) { setAction(null); setSaveError('This task change could not be confirmed. Refresh the list before trying again.'); } }
		finally { clearTimeout(timeout); lock.current = null; if (mounted.current) setSaving(false); }
	}
	return { data, tasks, loading, error, isOnline, filter, setFilter, sort, setSort, action, saving, saveError, announcement, canWrite, save,
		openAction: (selection: TaskAction) => { if (canWrite) { setAnnouncement(''); setAction(selection); } }, closeAction: () => { if (!lock.current) setAction(null); }, refreshList: () => { if (!lock.current) setReload(value => value + 1); } };
}
