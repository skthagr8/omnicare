'use client';

import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { addAssessmentItem, fetchAssessmentList, itemEntries, saveListEntry, type AssessmentItem, type EntryValues, type ListEntry } from '@/services/assessmentList';
import type { AssessmentState } from '@/services/pointOfCare';

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
	const canWrite = Boolean(!data?.isDemo && data?.visit.status === 'in_progress' && !loading && !error && !data.recordsError && !saving && !saveError && isOnline);

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