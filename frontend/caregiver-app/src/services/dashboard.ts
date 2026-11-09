import { z } from 'zod';
import { apiClient } from './api';

// Caregiver shift dashboard data. Every schema below mirrors a backend response
// model in backend/app/modules; field names and enum values are the backend's.

const timestamp = z.string().refine(value => Number.isFinite(Date.parse(value)));

// --- scheduling: SessionResponse (GET /scheduling/visits/today) -----------------
const sessionSchema = z.object({
	id: z.string().min(1),
	client_id: z.string().min(1),
	caregiver_id: z.string().min(1),
	scheduled_start: timestamp,
	scheduled_end: timestamp,
	visit_date: z.string().nullable().optional(),
	status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']), // SessionStatus
	check_in_at: timestamp.nullable().optional(),
	check_out_at: timestamp.nullable().optional(),
});
export type ShiftSession = z.infer<typeof sessionSchema>;

// --- scheduling: ClientResponse (GET /scheduling/sessions/{id}/client) ---------
const sessionClientSchema = z.object({
	id: z.string().min(1),
	full_name: z.string().min(1),
	date_of_birth: z.string(),
	address_text: z.string(),
	gender: z.string().nullable().optional(),
});
export type ShiftClient = z.infer<typeof sessionClientSchema>;

// --- clients: ClientDiagnosisResponse / AcuityTierResponse ----------------------
const diagnosisSchema = z.object({ category: z.enum(['dementia', 'post_stroke', 'parkinsons', 'other']), is_active: z.boolean(), stage: z.string().nullable().optional(), affected_side: z.string().nullable().optional() });
const acuityTierSchema = z.object({ level: z.enum(['green', 'amber', 'red']), reason_notes: z.string().nullable().optional(), effective_to: timestamp.nullable().optional() });

// --- tasks: TaskCompletionResponse + TaskResponse --------------------------------
const taskCompletionSchema = z.object({
	id: z.string().min(1),
	task_id: z.string().min(1),
	session_id: z.string().min(1),
	completed_status: z.enum(['completed', 'not_completed', 'partially_completed', 'refused']), // CompletionStatus
	was_skipped: z.boolean(),
	title_override: z.string().nullable().optional(),
	details_override: z.string().nullable().optional(),
	priority_override: z.string().nullable().optional(),
	due_at: timestamp.nullable().optional(),
	completed_at: timestamp.nullable().optional(),
	skip_reason: z.string().nullable().optional(),
	void_reason: z.string().nullable().optional(),
});
const taskCatalogSchema = z.object({ id: z.string().min(1), name: z.string().min(1), description: z.string().nullable().optional(), priority: z.string() });

// --- assessments: SessionAssessmentItem (GET /scheduling/sessions/{id}/assessment-items)
const assessmentTypeSchema = z.enum(['tug', 'cmai', 'braden', 'delirium', 'iadl']); // AssessmentType
const sessionAssessmentSchema = z.object({
	assessment_type: assessmentTypeSchema,
	is_required: z.boolean(),
	frequency_days: z.number().int().nullable().optional(),
	instructions: z.string().nullable().optional(),
	completed: z.object({
		id: z.string().min(1),
		state: z.enum(['pending', 'completed', 'refused', 'skipped']), // AssessmentState
		refused_reason: z.string().nullable().optional(),
		administered_at: timestamp.nullable().optional(),
		created_at: timestamp,
	}).nullable().optional(),
});

// --- medications: SessionMedicationItem (GET /scheduling/sessions/{id}/medications)
const sessionMedicationSchema = z.object({
	medication: z.object({ id: z.string().min(1), name: z.string().min(1), dosage: z.string().min(1), instructions: z.string().nullable().optional(), window_start_local: z.string(), window_end_local: z.string(), is_active: z.boolean() }),
	is_required: z.boolean(),
	instructions: z.string().nullable().optional(),
	administration: z.object({ id: z.string().min(1), status: z.enum(['pending', 'administered', 'refused', 'missed', 'cancelled']), administered_at: timestamp.nullable().optional(), missed_reason: z.string().nullable().optional() }).nullable().optional(),
});

// --- assessments: ObservationResponse (POST /assessments/observations) ---------
export const observationReceiptSchema = z.object({ id: z.string().min(1), session_id: z.string().min(1), client_id: z.string().min(1), note: z.string().min(1), is_flagged: z.boolean(), flag_reason: z.string().nullable().optional(), created_at: timestamp });

export const ASSESSMENT_NAMES: Record<z.infer<typeof assessmentTypeSchema>, { name: string; full_name: string }> = {
	tug: { name: 'TUG', full_name: 'Timed Up and Go' },
	cmai: { name: 'CMAI', full_name: 'Cohen-Mansfield Agitation Inventory' },
	braden: { name: 'Braden', full_name: 'Braden Scale' },
	delirium: { name: 'Delirium', full_name: 'Delirium screen (CAM)' },
	iadl: { name: 'IADL', full_name: 'Instrumental Activities of Daily Living' },
};

export type ShiftTask = { id: string; title: string; details: string | null; priority: string; due_at: string | null; state: 'pending' | 'completed' | 'partially_completed' | 'refused' | 'skipped' };
export type ShiftAssessment = z.infer<typeof sessionAssessmentSchema>;
export type ShiftMedication = z.infer<typeof sessionMedicationSchema>;
export type ShiftProfile = { diagnosis: z.infer<typeof diagnosisSchema> | null; acuity: z.infer<typeof acuityTierSchema> | null };

// The visit the dashboard is about: in progress, else next scheduled, else last completed.
export async function fetchShiftSession(signal: AbortSignal): Promise<ShiftSession | null> {
	const { data } = await apiClient.get('/scheduling/visits/today', { signal });
	const sessions = z.array(sessionSchema).parse(data);
	return sessions.find(session => session.status === 'in_progress')
		|| sessions.find(session => session.status === 'scheduled')
		|| [...sessions].reverse().find(session => session.status === 'completed')
		|| null;
}

export async function fetchShiftClient(sessionId: string, signal: AbortSignal) {
	const { data } = await apiClient.get(`/scheduling/sessions/${encodeURIComponent(sessionId)}/client`, { signal });
	return sessionClientSchema.parse(data);
}

// Primary diagnosis = first active one (newest diagnosed_at first); acuity = the open tier.
export async function fetchShiftProfile(clientId: string, signal: AbortSignal): Promise<ShiftProfile> {
	const id = encodeURIComponent(clientId);
	const [diagnoses, tiers] = await Promise.all([
		apiClient.get(`/clients/${id}/diagnoses`, { signal }).then(response => z.array(diagnosisSchema).parse(response.data)),
		apiClient.get(`/clients/${id}/acuity-tiers`, { signal }).then(response => z.array(acuityTierSchema).parse(response.data)),
	]);
	return { diagnosis: diagnoses.find(diagnosis => diagnosis.is_active) || null, acuity: tiers.find(tier => !tier.effective_to) || null };
}

// Session task completions, named from the task catalogue (completions carry only task_id).
export async function fetchShiftTasks(sessionId: string, signal: AbortSignal): Promise<ShiftTask[]> {
	const [completions, catalogue] = await Promise.all([
		apiClient.get(`/scheduling/sessions/${encodeURIComponent(sessionId)}/tasks`, { signal }).then(response => z.array(taskCompletionSchema).parse(response.data)),
		apiClient.get('/tasks', { signal, params: { active_only: false, limit: 500 } }).then(response => z.array(taskCatalogSchema).parse(response.data)),
	]);
	const tasks = new Map(catalogue.map(task => [task.id, task]));
	return completions.filter(completion => !completion.void_reason).map(completion => {
		const task = tasks.get(completion.task_id);
		return {
			id: completion.id,
			title: completion.title_override || task?.name || 'Care task',
			details: completion.details_override ?? task?.description ?? null,
			priority: completion.priority_override || task?.priority || 'medium',
			due_at: completion.due_at ?? null,
			state: completion.was_skipped ? 'skipped' : completion.completed_status === 'not_completed' ? 'pending' : completion.completed_status,
		};
	});
}

export async function fetchShiftAssessments(sessionId: string, signal: AbortSignal) {
	const { data } = await apiClient.get(`/scheduling/sessions/${encodeURIComponent(sessionId)}/assessment-items`, { signal });
	return z.array(sessionAssessmentSchema).parse(data);
}

export async function fetchShiftMedications(sessionId: string, signal: AbortSignal) {
	const { data } = await apiClient.get(`/scheduling/sessions/${encodeURIComponent(sessionId)}/medications`, { signal });
	return z.array(sessionMedicationSchema).parse(data).filter(item => item.medication.is_active);
}

export async function saveShiftObservation(session: ShiftSession, note: string, flagReason: string | null) {
	const { data } = await apiClient.post('/assessments/observations', { session_id: session.id, client_id: session.client_id, note, is_flagged: Boolean(flagReason), flag_reason: flagReason });
	const receipt = observationReceiptSchema.parse(data);
	if (receipt.session_id !== session.id || receipt.client_id !== session.client_id || receipt.note !== note) throw new Error('Observation could not be verified');
	return receipt;
}
