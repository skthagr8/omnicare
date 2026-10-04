import { useEffect, useRef } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import type { useVisitTasks } from '@/hooks/useVisitTasks';
import type { VisitTask } from '@/services/visitTasks';

const field = 'mt-2 min-h-12 w-full rounded-lg border border-[#c5d4c9] bg-white px-3 py-3 text-base outline-none focus:ring-2 focus:ring-[#63afaf]';
function localTime(value: string | null) { if (!value) return ''; const date = new Date(value); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); }

export default function TaskActionDialog({ list }: { list: ReturnType<typeof useVisitTasks> }) {
	const dialog = useRef<HTMLDialogElement>(null);
	const action = list.action;
	useEffect(() => { if (action && !dialog.current?.open) dialog.current?.showModal(); if (!action && dialog.current?.open) dialog.current.close(); }, [action]);
	const title = action?.kind === 'add' ? 'Add Task' : action?.kind === 'edit' ? 'Edit task' : action?.kind === 'complete' ? 'Complete task' : action?.kind === 'skip' ? 'Skip task' : 'Delete task entry?';
	const task = action && action.kind !== 'add' ? action.task : null;
	return <dialog ref={dialog} aria-labelledby="task-dialog-title" onCancel={event => { event.preventDefault(); if (!list.saving) list.closeAction(); }} className="caregiver-login fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-lg border border-[#d5dfd7] bg-[#fffefa] p-6 text-[#303538] backdrop:bg-black/25">
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
			<div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="task-dialog-title" className="text-xl leading-7 font-semibold">{title}</h2>{task && <p className="mt-2 text-sm leading-6 font-medium wrap-anywhere text-[#64716b]">{task.title}</p>}</div><button type="button" onClick={list.closeAction} disabled={list.saving} aria-label="Close task dialog" className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[#64716b]"><X aria-hidden="true" className="size-5" /></button></div>
			<fieldset disabled={list.saving} className="min-w-0 space-y-4">{action.kind === 'add' || action.kind === 'edit' ? <>
				<div><label htmlFor="task-title" className="text-sm font-semibold">Task name</label><input id="task-title" name="title" required maxLength={150} defaultValue={task?.title || ''} className={field} /></div>
				<div><label htmlFor="task-details" className="text-sm font-semibold">Details (optional)</label><textarea id="task-details" name="details" rows={3} maxLength={2000} defaultValue={task?.details || ''} className={field} /></div>
				<div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="task-priority" className="text-sm font-semibold">Priority</label><select id="task-priority" name="priority" defaultValue={task?.priority || 'normal'} className={field}><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></div><div><label htmlFor="task-due" className="text-sm font-semibold">Due time (optional)</label><input id="task-due" name="due" type="datetime-local" defaultValue={localTime(task?.due_at || null)} className={field} /></div></div>
				{action.kind === 'edit' && <p className="text-xs leading-6 text-[#737c77]">Editing the description does not change its recorded completion or skip state.</p>}
			</> : action.kind === 'complete' ? <label className="flex min-h-12 items-start gap-3 text-sm leading-6"><input type="checkbox" name="confirmed" required className="mt-1 size-5 shrink-0 accent-[#637862]" /><span>I confirm this task was completed during the visit.</span></label> : <>
				{action.kind === 'delete' && <p className="text-sm leading-7 text-[#79523e]">Remove this duplicate or mistaken entry from the visit? This request must preserve the clinical audit trail.</p>}
				<div><label htmlFor="task-reason" className="text-sm font-semibold">{action.kind === 'delete' ? 'Reason for removal' : 'Reason for skipping'}</label><textarea id="task-reason" name="reason" required maxLength={1000} rows={3} className={field} /></div>
				{action.kind === 'delete' && <label className="flex min-h-12 items-start gap-3 text-sm leading-6"><input type="checkbox" name="confirmed" required className="mt-1 size-5 shrink-0 accent-[#9b4238]" /><span>I confirm this entry is a duplicate or was recorded in error.</span></label>}
			</>}</fieldset>
			<div className="mt-6 flex gap-3"><button type="button" onClick={list.closeAction} disabled={list.saving} className="min-h-12 flex-1 rounded-lg border border-[#cdd3d0] text-sm font-semibold text-[#64716b]">{action.kind === 'delete' ? 'Keep task' : 'Cancel'}</button><button type="submit" disabled={list.saving || !list.canWrite} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold ${action.kind === 'delete' ? 'bg-[#9b4238] text-white' : action.kind === 'skip' ? 'border border-[#d4a34d] bg-[#fff2d6] text-[#94621b]' : 'bg-[#637862] text-white'}`}>{list.saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}{list.saving ? 'Saving...' : action.kind === 'delete' ? 'Confirm deletion' : action.kind === 'add' ? 'Add to visit' : action.kind === 'edit' ? 'Save changes' : action.kind === 'skip' ? 'Record skip' : 'Record complete'}</button></div>
		</form>}
	</dialog>;
}