import { z } from 'zod';
import { apiClient } from '@/services/api';
import { fetchCheckInVisit } from '@/services/checkIn';
import { makeDemoTasks, VISIT_DEMO_MODE } from '@/services/visitDemo';

const timestamp = z.string().refine(value => Number.isFinite(Date.parse(value)));
const taskSchema = z.object({
	id: z.string().min(1), session_id: z.string().min(1), client_id: z.string().min(1), title: z.string().trim().min(1).max(150),
	details: z.string().max(2000).nullable(), priority: z.enum(['high', 'normal', 'low']), due_at: timestamp.nullable(),
	status: z.enum(['pending', 'completed', 'skipped']), skip_reason: z.string().nullable(), completed_at: timestamp.nullable(),
	created_at: timestamp, updated_at: timestamp, revision: z.number().int().nonnegative(), is_voided: z.boolean(),
}).refine(task => task.status !== 'skipped' || Boolean(task.skip_reason?.trim()), 'Skipped task needs a reason')
.refine(task => task.status !== 'completed' || task.completed_at !== null, 'Completed task needs a timestamp');
export type VisitTask = z.infer<typeof taskSchema>;
export type TaskFields = Pick<VisitTask, 'title' | 'details' | 'priority' | 'due_at'>;
export type TaskChange = { kind: 'edit'; fields: TaskFields } | { kind: 'complete' } | { kind: 'skip'; reason: string };

export async function fetchVisitTasks(sessionId: string, signal: AbortSignal) {
	const visit = await fetchCheckInVisit(sessionId, signal, true);
	if (!visit || visit.id !== sessionId) throw new Error('Visit mismatch');
	if (visit.is_demo && VISIT_DEMO_MODE) return { visit, tasks: makeDemoTasks(sessionId) as VisitTask[], tasksAvailable: true, isDemo: true };
	let tasks: VisitTask[] = [];
	let tasksAvailable = false;
	try {
		const { data } = await apiClient.get(`/scheduling/sessions/${encodeURIComponent(sessionId)}/tasks`, { signal });
		const records = z.array(taskSchema).parse(data);
		if (records.some(task => task.session_id !== sessionId || task.client_id !== visit.client_id) || new Set(records.map(task => task.id)).size !== records.length) throw new Error('Task identity mismatch');
		tasks = records.filter(task => !task.is_voided);
		tasksAvailable = true;
	} catch { tasksAvailable = false; }
	return { visit, tasks, tasksAvailable, isDemo: false };
}

function confirmedTask(data: unknown, sessionId: string, clientId: string) {
	const task = taskSchema.parse(data);
	if (task.session_id !== sessionId || task.client_id !== clientId || task.is_voided) throw new Error('Task save not confirmed');
	return task;
}

export async function createVisitTask(sessionId: string, clientId: string, fields: TaskFields, signal: AbortSignal) {
	const { data } = await apiClient.post(`/scheduling/sessions/${encodeURIComponent(sessionId)}/tasks`, fields, { signal });
	const task = confirmedTask(data, sessionId, clientId);
	if (task.status !== 'pending' || task.title !== fields.title) throw new Error('Ad-hoc task not confirmed');
	return task;
}

export async function updateVisitTask(task: VisitTask, change: TaskChange, signal: AbortSignal) {
	const patch = change.kind === 'edit' ? change.fields : change.kind === 'complete' ? { status: 'completed' } : { status: 'skipped', skip_reason: change.reason.trim() };
	if (change.kind === 'skip' && !change.reason.trim()) throw new Error('Skip reason required');
	if (change.kind !== 'edit' && task.status !== 'pending') throw new Error('Task already resolved');
	const { data } = await apiClient.patch(`/scheduling/tasks/${encodeURIComponent(task.id)}`, { ...patch, expected_revision: task.revision }, { signal });
	const saved = confirmedTask(data, task.session_id, task.client_id);
	if (saved.id !== task.id || saved.revision <= task.revision || (change.kind === 'complete' && saved.status !== 'completed') || (change.kind === 'skip' && (saved.status !== 'skipped' || saved.skip_reason !== change.reason.trim())) || (change.kind === 'edit' && (saved.status !== task.status || saved.title !== change.fields.title))) throw new Error('Task update not confirmed');
	if (change.kind === 'edit' && (saved.completed_at !== task.completed_at || saved.skip_reason !== task.skip_reason || saved.details !== change.fields.details || saved.priority !== change.fields.priority || (saved.due_at ? Date.parse(saved.due_at) : null) !== (change.fields.due_at ? Date.parse(change.fields.due_at) : null))) throw new Error('Task correction changed recorded outcome');
	return saved;
}

export async function voidVisitTask(task: VisitTask, reason: string, signal: AbortSignal) {
	if (!reason.trim()) throw new Error('Removal reason required');
	const { data } = await apiClient.delete(`/scheduling/tasks/${encodeURIComponent(task.id)}`, { signal, data: { expected_revision: task.revision, reason: reason.trim() } });
	const receipt = z.object({ status: z.literal('voided'), task_id: z.string(), revision: z.number().int() }).parse(data);
	if (receipt.task_id !== task.id || receipt.revision <= task.revision) throw new Error('Task removal not confirmed');
	return receipt;
}