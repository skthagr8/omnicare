'use client';

import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { createVisitTask, fetchVisitTasks, updateVisitTask, voidVisitTask, type TaskChange, type TaskFields, type VisitTask } from '@/services/visitTasks';

export type TaskFilter = 'all' | VisitTask['status'];
export type TaskSort = 'time' | 'priority' | 'status';
export type TaskAction = { kind: 'add' } | { kind: 'edit' | 'complete' | 'skip' | 'delete'; task: VisitTask };

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
	const canWrite = Boolean(data?.tasksAvailable && !data.isDemo && data.visit.status === 'in_progress' && isOnline && !loading && !error && !saving && !saveError);
	const priorityOrder = { high: 0, normal: 1, low: 2 };
	const statusOrder = { pending: 0, completed: 1, skipped: 2 };
	const tasks = (data?.tasks || []).filter(task => filter === 'all' || task.status === filter).sort((first, second) => {
		const due = (first.due_at ? Date.parse(first.due_at) : Infinity) - (second.due_at ? Date.parse(second.due_at) : Infinity);
		const rank = sort === 'priority' ? priorityOrder[first.priority] - priorityOrder[second.priority] : sort === 'status' ? statusOrder[first.status] - statusOrder[second.status] : 0;
		return rank || (Number.isNaN(due) ? 0 : due) || Date.parse(first.created_at) - Date.parse(second.created_at) || first.id.localeCompare(second.id);
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