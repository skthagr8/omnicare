'use client';

import {
	Plus,
	RefreshCw,
	CheckCircle2,
	ClipboardList,
	Clock3,
	MoreVertical,
	Pencil,
	SkipForward,
	Trash2,
	LoaderCircle,
	X,
	ArrowLeft,
	WifiOff,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type TaskFilter, type TaskSort, useVisitTasks, type TaskAction } from '../../hooks/useCareRecords';
import type { VisitTask } from '../../services/records';

// --- TaskListToolbar ---
export function TaskListToolbar({ list }: { list: ReturnType<typeof useVisitTasks> }) {
	return <header className="mb-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Visit Tasks</h1><p className="mt-2 text-sm text-[#475569]">{list.data?.visit.clientName || 'Visit workspace'} / {list.data?.tasks.length ?? 0} tasks</p></div><button type="button" onClick={() => list.openAction({ kind: 'add' })} disabled={!list.canWrite} className="flex min-h-12 items-center gap-2 rounded-xl bg-teal px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-60 shadow-sm"><Plus aria-hidden="true" className="size-4" />Add Task</button></div>
		<div className="flex flex-wrap items-center justify-between gap-4 border-y border-coral-soft py-4"><div role="group" aria-label="Filter task status" className="grid w-full grid-cols-4 gap-1 rounded-lg bg-cream p-1 sm:w-auto">{([{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'skipped', label: 'Skipped' }, { value: 'completed', label: 'Complete' }] as { value: TaskFilter; label: string }[]).map(option => <button key={option.value} type="button" aria-pressed={list.filter === option.value} onClick={() => list.setFilter(option.value)} className={`min-h-10 rounded px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-teal sm:px-4 ${list.filter === option.value ? 'bg-white text-teal shadow-sm' : 'text-[#334155]'}`}>{option.label}</button>)}</div><div className="flex items-center gap-2"><label htmlFor="task-sort" className="text-xs text-[#475569]">Sort by:</label><select id="task-sort" value={list.sort} onChange={event => list.setSort(event.target.value as TaskSort)} className="min-h-11 rounded-lg border border-coral-soft bg-white px-3 text-xs text-[#334155]"><option value="time">Time</option><option value="priority">Priority</option><option value="status">Status</option></select><button type="button" aria-label="Refresh task list" title="Refresh task list" disabled={list.loading || list.saving || !list.isOnline} onClick={list.refreshList} className="flex size-11 items-center justify-center rounded-lg text-[#334155] disabled:opacity-50"><RefreshCw aria-hidden="true" className="size-4" /></button></div></div>
	</header>;
}

// --- VisitTaskCard ---
export function VisitTaskCard({ task, disabled, onAction }: { task: VisitTask; disabled: boolean; onAction: (action: TaskAction) => void }) {
	return <article aria-label={task.title} className="rounded-2xl border border-coral-soft bg-cream p-5 sm:p-6 shadow-sm">
		<div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal"><ClipboardList className="size-5" /></span><div className="min-w-0"><h2 className="text-base leading-6 font-semibold wrap-anywhere">{task.title}</h2><div className="mt-2 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${task.priority === 'high' ? 'bg-[#ffe4e6] text-[#be123c]' : task.priority === 'normal' ? 'bg-cream text-[#334155]' : 'bg-teal-soft text-[#334155]'}`}>{task.priority} priority</span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${task.status === 'completed' ? 'bg-teal-soft text-[#334155]' : task.status === 'skipped' ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-[#f6e8dd] text-[#334155]'}`}>{task.status}</span></div></div></div>
			<details className="relative shrink-0"><summary aria-label={`${task.title} more actions`} title={`${task.title} more actions`} className="flex size-10 cursor-pointer list-none items-center justify-center rounded-lg text-[#334155] hover:bg-cream focus-visible:outline-2 focus-visible:outline-teal [&::-webkit-details-marker]:hidden"><MoreVertical aria-hidden="true" className="size-5" /></summary><div className="absolute top-11 right-0 z-20 w-48 rounded-2xl border border-coral-soft bg-white p-1 shadow-lg"><button type="button" disabled={disabled} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); onAction({ kind: 'delete', task }); }} className="flex min-h-11 w-full items-center gap-2 rounded px-3 text-left text-xs font-semibold text-[#be123c] hover:bg-[#fff1f2] focus-visible:outline-2 focus-visible:outline-[#be123c] disabled:opacity-50"><Trash2 aria-hidden="true" className="size-4" />Delete entry</button></div></details>
		</div>
		{task.details && <p className="mt-4 text-sm leading-6 whitespace-pre-wrap wrap-anywhere text-[#334155]">{task.details}</p>}
		<p className="mt-4 flex items-center gap-2 text-xs leading-5 text-[#475569]"><Clock3 aria-hidden="true" className="size-3.5 shrink-0" />{task.due_at ? `Due ${new Date(task.due_at).toLocaleString()}` : 'Time not specified'}</p>
		{task.skip_reason && <p className="mt-3 text-sm leading-6 whitespace-pre-wrap wrap-anywhere text-[#b45309]"><span className="font-semibold">Skip reason: </span>{task.skip_reason}</p>}
		{task.completed_at && <p className="mt-3 text-xs text-[#334155]">Completed {new Date(task.completed_at).toLocaleString()}</p>}
		<div role="group" aria-label={`${task.title} task actions`} className="mt-5 grid grid-cols-3 gap-2 border-t border-coral-soft pt-4 sm:ml-auto sm:w-96">
			<button type="button" disabled={disabled || task.status !== 'pending'} onClick={() => onAction({ kind: 'complete', task })} className="flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-[#475569] bg-[#475569] px-1 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#475569] disabled:opacity-60"><CheckCircle2 aria-hidden="true" className="hidden size-3.5 sm:block" />Complete</button>
			<button type="button" disabled={disabled || task.status !== 'pending'} onClick={() => onAction({ kind: 'skip', task })} className="flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-[#f59e0b] bg-[#fffbeb] px-1 text-xs font-semibold text-[#b45309] focus-visible:outline-2 focus-visible:outline-[#b45309] disabled:opacity-60"><SkipForward aria-hidden="true" className="hidden size-3.5 sm:block" />Skip</button>
			<button type="button" disabled={disabled} onClick={() => onAction({ kind: 'edit', task })} className="flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-coral-soft bg-cream px-1 text-xs font-semibold text-[#475569] focus-visible:outline-2 focus-visible:outline-[#475569] disabled:opacity-60"><Pencil aria-hidden="true" className="hidden size-3.5 sm:block" />Edit</button>
		</div>
	</article>;
}

// --- TaskActionDialog ---
const field = 'mt-2 min-h-12 w-full rounded-lg border border-[#f0d9c8] bg-white px-3 py-3 text-base outline-none focus:ring-2 focus:ring-[#5cc4b8]';
function localTime(value: string | null) { if (!value) return ''; const date = new Date(value); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); }

export function TaskActionDialog({ list }: { list: ReturnType<typeof useVisitTasks> }) {
	const dialog = useRef<HTMLDialogElement>(null);
	const action = list.action;
	useEffect(() => { if (action && !dialog.current?.open) dialog.current?.showModal(); if (!action && dialog.current?.open) dialog.current.close(); }, [action]);
	const title = action?.kind === 'add' ? 'Add Task' : action?.kind === 'edit' ? 'Edit task' : action?.kind === 'complete' ? 'Complete task' : action?.kind === 'skip' ? 'Skip task' : 'Delete task entry?';
	const task = action && action.kind !== 'add' ? action.task : null;
	return <dialog ref={dialog} aria-labelledby="task-dialog-title" onCancel={event => { event.preventDefault(); if (!list.saving) list.closeAction(); }} className="caregiver-login fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-2xl border border-coral-soft bg-cream p-6 text-ink backdrop:bg-black/25 shadow-sm">
		{action && <form key={`${action.kind}-${task?.id || 'new'}`} onSubmit={event => {
			event.preventDefault();
			const values = new FormData(event.currentTarget);
			if (action.kind === 'add' || action.kind === 'edit') {
				const titleValue = String(values.get('title') || '').trim(); if (!titleValue) return;
				const due = String(values.get('due') || '');
				void list.save({ fields: { title: titleValue, details: String(values.get('details') || '').trim() || null, priority: String(values.get('priority')) as VisitTask['priority'], due_at: due ? new Date(due).toISOString() : null } });
			} else {
				const reason = String(values.get('reason') || '').trim();
				if ((action.kind === 'skip' || action.kind === 'delete') && !reason) return;
				void list.save({ reason, confirmed: values.get('confirmed') === 'on' });
			}
		}}>
			<div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="task-dialog-title" className="text-xl leading-7 font-semibold">{title}</h2>{task && <p className="mt-2 text-sm leading-6 font-medium wrap-anywhere text-[#334155]">{task.title}</p>}</div><button type="button" onClick={list.closeAction} disabled={list.saving} aria-label="Close task dialog" className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[#334155]"><X aria-hidden="true" className="size-5" /></button></div>
			<fieldset disabled={list.saving} className="min-w-0 space-y-4">{action.kind === 'add' || action.kind === 'edit' ? <>
				<div><label htmlFor="task-title" className="text-sm font-semibold">Task name</label><input id="task-title" name="title" required maxLength={150} defaultValue={task?.title || ''} className={field} /></div>
				<div><label htmlFor="task-details" className="text-sm font-semibold">Details (optional)</label><textarea id="task-details" name="details" rows={3} maxLength={2000} defaultValue={task?.details || ''} className={field} /></div>
				<div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="task-priority" className="text-sm font-semibold">Priority</label><select id="task-priority" name="priority" defaultValue={task?.priority || 'normal'} className={field}><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></div><div><label htmlFor="task-due" className="text-sm font-semibold">Due time (optional)</label><input id="task-due" name="due" type="datetime-local" defaultValue={localTime(task?.due_at || null)} className={field} /></div></div>
				{action.kind === 'edit' && <p className="text-xs leading-6 text-[#475569]">Editing the description does not change its recorded completion or skip state.</p>}
			</> : action.kind === 'complete' ? <label className="flex min-h-12 items-start gap-3 text-sm leading-6"><input type="checkbox" name="confirmed" required className="mt-1 size-5 shrink-0 accent-[#475569]" /><span>I confirm this task was completed during the visit.</span></label> : <>
				{action.kind === 'delete' && <p className="text-sm leading-7 text-[#b45309]">Remove this duplicate or mistaken entry from the visit? This request must preserve the clinical audit trail.</p>}
				<div><label htmlFor="task-reason" className="text-sm font-semibold">{action.kind === 'delete' ? 'Reason for removal' : 'Reason for skipping'}</label><textarea id="task-reason" name="reason" required maxLength={1000} rows={3} className={field} /></div>
				{action.kind === 'delete' && <label className="flex min-h-12 items-start gap-3 text-sm leading-6"><input type="checkbox" name="confirmed" required className="mt-1 size-5 shrink-0 accent-[#be123c]" /><span>I confirm this entry is a duplicate or was recorded in error.</span></label>}
			</>}</fieldset>
			<div className="mt-6 flex gap-3"><button type="button" onClick={list.closeAction} disabled={list.saving} className="min-h-12 flex-1 rounded-lg border border-coral-soft text-sm font-semibold text-[#334155]">{action.kind === 'delete' ? 'Keep task' : 'Cancel'}</button><button type="submit" disabled={list.saving || !list.canWrite} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold ${action.kind === 'delete' ? 'bg-[#be123c] text-white' : action.kind === 'skip' ? 'border border-[#f59e0b] bg-[#fef3c7] text-[#b45309]' : 'bg-[#475569] text-white'}`}>{list.saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}{list.saving ? 'Saving...' : action.kind === 'delete' ? 'Confirm deletion' : action.kind === 'add' ? 'Add to visit' : action.kind === 'edit' ? 'Save changes' : action.kind === 'skip' ? 'Record skip' : 'Record complete'}</button></div>
		</form>}
	</dialog>;
}

// --- VisitTaskList ---
export function VisitTaskList({ sessionId }: { sessionId: string }) {
	const list = useVisitTasks(sessionId);
	return <main className="caregiver-login min-h-svh bg-cream px-5 py-6 text-ink sm:px-8"><div className="mx-auto max-w-4xl">
		<Link href={`/visits/${encodeURIComponent(sessionId)}`} className="mb-5 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-teal"><ArrowLeft aria-hidden="true" className="size-4" />Back to patient care</Link>
		<TaskListToolbar list={list} />
		<div role="status" className="mb-3 min-h-6 text-xs text-[#475569]">{!list.isOnline && <span className="flex items-center gap-2"><WifiOff aria-hidden="true" className="size-3.5" />Offline / Connect to save task changes</span>}</div>
		{list.loading && <p role="status" className="mb-5 text-sm text-[#475569]">Loading visit tasks...</p>}
		{list.error && <p role="alert" className="mb-5 text-sm leading-6 text-[#b45309]">{list.error}</p>}
		{list.data && !list.data.tasksAvailable && <p role="status" className="mb-5 text-sm leading-6 text-[#475569]">The task service is unavailable. No task records or changes can be verified.</p>}
		{list.data && list.data.visit.status !== 'in_progress' && <p className="mb-5 text-sm text-[#334155]">This visit is not in progress. Task records are read-only.</p>}
		{list.saveError && <p role="alert" className="mb-5 text-sm leading-6 text-[#b45309]">{list.saveError}</p>}
		<p role="status" aria-live="polite" className="mb-3 text-sm text-[#334155]">{list.announcement}</p>
		<div className="space-y-5">{list.tasks.map(task => <VisitTaskCard key={task.id} task={task} disabled={!list.canWrite} onAction={list.openAction} />)}</div>
		{!list.loading && !list.error && list.data?.tasksAvailable && !list.tasks.length && <p role="status" className="py-12 text-center text-sm text-[#475569]">{list.data.tasks.length ? 'No tasks match this view.' : 'No tasks recorded for this visit.'}</p>}
		<TaskActionDialog list={list} />
	</div></main>;
}

// --- route wrappers ---
export function VisitTasksRoute() {
	const { sessionID } = useParams<{ sessionID: string }>();
	return <VisitTaskList key={sessionID} sessionId={sessionID} />;
}
