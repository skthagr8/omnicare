import { z } from 'zod';
import { apiClient } from './api';
import { fetchCareContext, type AssessmentEntry, type AssessmentState, fetchCheckInVisit } from './visits';

// --- assessmentList ---
const instrumentSchema = z.object({ id: z.string().min(1), name: z.string().min(1), full_name: z.string(), description: z.string(), diagnosis_categories: z.array(z.string()), backend_type: z.enum(['tug', 'cmai', 'braden']).nullable() });
const timestamp = z.string().refine(value => Number.isFinite(Date.parse(value)));
const recordedScore = z.union([z.number(), z.string().min(1)]).transform(Number).refine(Number.isFinite).nullable().optional();
const entrySchema = z.object({ id: z.string().min(1), session_id: z.string(), client_id: z.string(), assessment_type: z.string(), state: z.string().transform(value => value.toLowerCase()).pipe(z.enum(['pending', 'refused', 'completed'])), created_at: timestamp, administered_at: timestamp.nullable().optional(), refused_reason: z.string().nullable().optional(), result_note: z.string().nullable().optional(), tug: z.object({ completion_time_sec: recordedScore, hesitation_flag: z.boolean().optional(), freezing_flag: z.boolean().optional() }).nullable().optional(), cmai: z.object({ total_score: recordedScore }).nullable().optional(), braden: z.object({ total_score: recordedScore, skin_inspection_notes: z.string().nullable().optional() }).nullable().optional() });
const itemSchema = z.object({ id: z.string().min(1), session_id: z.string(), client_id: z.string(), instrument: instrumentSchema, due_at: z.string().refine(value => Number.isFinite(Date.parse(value))).nullable(), entries: z.array(entrySchema) });

export type ListInstrument = z.infer<typeof instrumentSchema>;
export type ListEntry = z.infer<typeof entrySchema>;
export type AssessmentItem = z.infer<typeof itemSchema>;
export type EntryValues = { state: AssessmentState; refused_reason?: string; result_note?: string; administered_at?: string; tug?: AssessmentEntry['tug']; cmai?: AssessmentEntry['cmai']; braden?: AssessmentEntry['braden'] };

const templates: ListInstrument[] = [
    { id: 'tug', name: 'TUG', full_name: 'Timed Up and Go', description: 'Record mobility and balance observations from the timed assessment.', diagnosis_categories: [], backend_type: 'tug' },
    { id: 'cmai', name: 'CMAI', full_name: 'Cohen-Mansfield Agitation Inventory', description: 'Record the assessed frequency of agitation-related behaviors.', diagnosis_categories: [], backend_type: 'cmai' },
    { id: 'braden', name: 'Braden', full_name: 'Braden Scale', description: 'Record the pressure-injury risk assessment and skin observations.', diagnosis_categories: [], backend_type: 'braden' },
];

export function itemEntries(item: AssessmentItem) {
    return [...item.entries].sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at));
}

export async function fetchAssessmentList(sessionId: string, signal: AbortSignal) {
    // 1. Fetch visit context from backend
    const care = await fetchCareContext(sessionId, signal);
    if (!care.visit || care.visit.id !== sessionId) throw new Error('Visit not found');

    // 2. Fetch real patient details and diagnosis category via /clients/{client_id}
    const { data: patient } = await apiClient.get<{ id: string; diagnosis_category: string }>(`/clients/${encodeURIComponent(care.visit.client_id)}`, { signal });
    if (patient.id !== care.visit.client_id) throw new Error('Patient mismatch');
    const diagnosis = patient.diagnosis_category;

    // 3. Concurrently fetch diagnosis-filtered catalog instruments and session assessment items
    const [catalogResponse, itemsResponse] = await Promise.allSettled([
        apiClient.get('/assessments/instruments', { signal, params: { diagnosis_category: diagnosis } }),
        apiClient.get(`/scheduling/sessions/${encodeURIComponent(sessionId)}/assessment-items`, { signal }),
    ]);

    let catalog: ListInstrument[] = [];
    let catalogAvailable = false;
    if (catalogResponse.status === 'fulfilled') {
        const parsed = z.array(instrumentSchema).safeParse(catalogResponse.value.data);
        if (parsed.success) { catalog = parsed.data; catalogAvailable = true; }
    }

    const fallbackEntries = z.array(entrySchema).safeParse(care.assessments);
    let items: AssessmentItem[] = templates.map(instrument => ({ 
        id: `template-${instrument.id}`, 
        session_id: sessionId, 
        client_id: care.visit!.client_id, 
        instrument, 
        due_at: null, 
        entries: fallbackEntries.success ? fallbackEntries.data.filter(record => record.session_id === sessionId && record.client_id === care.visit!.client_id && record.assessment_type.toLowerCase() === instrument.id) : [] 
    }));

    let managedItemsAvailable = false;
    if (itemsResponse.status === 'fulfilled') {
        const parsed = z.array(itemSchema).safeParse(itemsResponse.value.data);
        if (parsed.success && parsed.data.every(item => item.session_id === sessionId && item.client_id === care.visit!.client_id && item.entries.every(entry => entry.session_id === sessionId && entry.client_id === care.visit!.client_id))) { 
            items = parsed.data; 
            managedItemsAvailable = true; 
        }
    }

    return { 
        visit: care.visit, 
        diagnosis, 
        catalog, 
        catalogAvailable, 
        items, 
        managedItemsAvailable, 
        history: fallbackEntries.success ? fallbackEntries.data.filter(record => record.client_id === care.visit!.client_id) : [], 
        recordsError: care.assessmentError || (!fallbackEntries.success ? 'Assessment records could not be verified.' : '')
    };
}

export async function addAssessmentItem(sessionId: string, clientId: string, selection: { instrument_id?: string; custom_name?: string; rationale: string }, signal: AbortSignal) {
    const { data } = await apiClient.post(`/scheduling/sessions/${encodeURIComponent(sessionId)}/assessment-items`, selection, { signal });
    const item = itemSchema.parse(data);
    if (item.session_id !== sessionId || item.client_id !== clientId || item.entries.some(entry => entry.session_id !== sessionId || entry.client_id !== clientId)) throw new Error('Added item not confirmed');
    if (selection.instrument_id && item.instrument.id !== selection.instrument_id) throw new Error('Added instrument mismatch');
    return item;
}

export async function saveListEntry(item: AssessmentItem, values: EntryValues, managed: boolean, edit: ListEntry | null, signal: AbortSignal) {
    const payload = { ...values, session_id: item.session_id, client_id: item.client_id, assessment_type: item.instrument.backend_type || item.instrument.id };
    if (!managed && !item.instrument.backend_type) throw new Error('Untemplated recording unavailable');
    const url = edit ? `/assessments/${encodeURIComponent(edit.id)}` : managed ? `/scheduling/assessment-items/${encodeURIComponent(item.id)}/entries` : '/assessments';
    const response = edit ? await apiClient.patch(url, { ...payload, expected_created_at: edit.created_at }, { signal }) : await apiClient.post(url, payload, { signal });
    const record = entrySchema.parse(response.data);
    if (record.session_id !== item.session_id || record.client_id !== item.client_id || record.state !== values.state || record.assessment_type.toLowerCase() !== payload.assessment_type.toLowerCase() || (edit && record.id !== edit.id)) throw new Error('Saved entry not confirmed');
    if (record.state === 'refused' && !record.refused_reason?.trim()) throw new Error('Refusal reason not confirmed');
    if (record.state === 'completed' && !record.administered_at) throw new Error('Administration time not confirmed');
    return record;
}

// --- instrumentHistory ---
const score = z.union([z.number(), z.string().trim().min(1)]).transform(Number).refine(Number.isFinite).nullable().optional();
const historySchema = z.array(z.object({
	id: z.string().min(1), client_id: z.string(), session_id: z.string(), assessment_type: z.string(),
	state: z.string().transform(value => value.toLowerCase()).pipe(z.enum(['pending', 'refused', 'completed'])),
	created_at: timestamp, administered_at: timestamp.nullable().optional(),
	administered_by: z.string().nullable().optional(), administered_by_name: z.string().nullable().optional(),
	refused_reason: z.string().nullable().optional(), result_note: z.string().nullable().optional(), instrument_name: z.string().optional(),
	tug: z.object({ completion_time_sec: score }).nullable().optional(),
	cmai: z.object({ total_score: score }).nullable().optional(),
	braden: z.object({ total_score: score }).nullable().optional(),
}));
export type InstrumentHistoryEntry = z.infer<typeof historySchema>[number];
export type HistoryRecord = InstrumentHistoryEntry & { recordedAt: string; numericScore: number | null; recorderName: string | null };

export const historyInstruments: Record<string, { name: string; metric: string; unit: string }> = {
	tug: { name: 'TUG', metric: 'Completion time', unit: 'seconds' },
	cmai: { name: 'CMAI', metric: 'Total assessed score', unit: 'points' },
	braden: { name: 'Braden Scale', metric: 'Total assessed score', unit: 'points' },
};

export function historyNumericScore(entry: InstrumentHistoryEntry): number | null {
	if (entry.state !== 'completed') return null;
	const type = entry.assessment_type.toLowerCase();
	const value = type === 'tug' ? entry.tug?.completion_time_sec : type === 'cmai' ? entry.cmai?.total_score : type === 'braden' ? entry.braden?.total_score : null;
	if (value == null || !Number.isFinite(value)) return null;
	if (type === 'tug' && value <= 0) return null;
	if (type === 'cmai' && (!Number.isInteger(value) || value < 29 || value > 203)) return null;
	if (type === 'braden' && (!Number.isInteger(value) || value < 6 || value > 23)) return null;
	return value;
}

export async function fetchInstrumentHistory(sessionId: string, instrument: string, signal: AbortSignal) {
	const visit = await fetchCheckInVisit(sessionId, signal);
	if (!visit || visit.id !== sessionId) throw new Error('Visit mismatch');
	const { data } = await apiClient.get(`/assessments/client/${encodeURIComponent(visit.client_id)}`, { signal });
	const records = historySchema.parse(data).filter(entry => entry.client_id === visit.client_id && entry.assessment_type.toLowerCase() === instrument.toLowerCase());
	let names = new Map<string, string>();
	let recorderWarning = false;
	if (records.some(record => record.administered_by && !record.administered_by_name)) {
		try {
			const { data: caregivers } = await apiClient.get('/caregivers', { signal });
			const people = z.array(z.object({ user_id: z.string(), full_name: z.string().nullable().optional() })).parse(caregivers);
			names = new Map(people.filter(person => person.full_name?.trim()).map(person => [person.user_id, person.full_name!]));
		} catch { recorderWarning = true; }
	}
	const unique = new Map(records.map(record => [record.id, record]));
	const entries: HistoryRecord[] = [...unique.values()].map(entry => ({ ...entry, recordedAt: entry.state === 'completed' && entry.administered_at ? entry.administered_at : entry.created_at, numericScore: historyNumericScore(entry), recorderName: entry.administered_by_name?.trim() || names.get(entry.administered_by || '') || null })).sort((first, second) => Date.parse(second.recordedAt) - Date.parse(first.recordedAt) || second.id.localeCompare(first.id));
	const metadata = historyInstruments[instrument.toLowerCase()] || { name: entries.find(entry => entry.instrument_name)?.instrument_name || instrument.replaceAll('_', ' '), metric: 'Recorded result', unit: '' };
	return { visit, instrument, metadata, entries, trendEntries: entries.slice(0, 10).reverse(), recorderWarning };
}

// --- visitMedications ---
// Medications are catalog entries assigned through the client's diagnoses; they carry no client_id.
const medicationSchema = z.object({ id: z.string(), name: z.string().min(1), dosage: z.string().min(1), instructions: z.string().nullable().optional(), is_active: z.boolean(), requires_glucose_check: z.boolean().default(false), window_start_local: z.string(), window_end_local: z.string(), pill_image_url: z.string().nullable().optional(), pill_image_source: z.string().nullable().optional(), pill_image_verified: z.boolean().default(false) });
const administrationSchema = z.object({ id: z.string().min(1), session_id: z.string(), medication_id: z.string(), schedule_id: z.string().nullable().optional(), status: z.string().transform(value => value.toLowerCase()).pipe(z.enum(['administered', 'missed', 'refused'])), administered_at: timestamp.nullable().optional(), created_at: timestamp, recorded_by: z.string().nullable().optional(), missed_reason: z.string().nullable().optional(), glucose_check_value: z.union([z.number(), z.string().min(1)]).transform(Number).refine(Number.isFinite).nullable().optional() });
export type VisitMedication = z.infer<typeof medicationSchema>;
export type MedicationAdministration = z.infer<typeof administrationSchema>;
export type MedicationOutcome = MedicationAdministration['status'];

const doseSchema = z.object({ id: z.string(), client_id: z.string(), medication_id: z.string(), medication_name: z.string().min(1), dosage: z.string().min(1), scheduled_at: timestamp, window_start: timestamp, window_end: timestamp, status: z.enum(['scheduled', 'administered', 'missed', 'refused', 'unrecorded']), administered_at: timestamp.nullable(), reason: z.string().nullable(), recorded_by_name: z.string().nullable() }).refine(dose => Date.parse(dose.window_start) <= Date.parse(dose.window_end));
const weeklySchema = z.object({ client_id: z.string(), week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), timezone: z.string().refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } }), doses: z.array(doseSchema) });
export type WeeklyMedicationSchedule = z.infer<typeof weeklySchema>;

// Submits to router.post("/medications/administrations", response_model=MedicationAdministration)
export async function fetchVisitMedications(sessionId: string, signal: AbortSignal) {
	const visit = await fetchCheckInVisit(sessionId, signal);
	if (!visit || visit.id !== sessionId) throw new Error('Visit mismatch');
	const response = await apiClient.get(`/medications/client/${encodeURIComponent(visit.client_id)}`, { signal });
	const medications = z.array(medicationSchema).parse(response.data).filter(medication => medication.is_active);
	let records: MedicationAdministration[] = [];
	let recordsAvailable = false;
	try {
		const administrations = await apiClient.get('/medications/administrations', { signal, params: { session_id: sessionId } });
		const ids = new Set(medications.map(medication => medication.id));
		records = z.array(administrationSchema).parse(administrations.data).filter(record => record.session_id === sessionId && ids.has(record.medication_id)).sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at));
		recordsAvailable = true;
	} catch { recordsAvailable = false; }
	return { visit, medications, records, recordsAvailable };
}

// Submits to router.post("/medications/administrations", response_model=MedicationAdministration)
export async function recordMedication(sessionId: string, medication: VisitMedication, status: MedicationOutcome, values: { reason?: string; glucose?: number; administeredAt?: string }, signal: AbortSignal) {
	if (status !== 'administered' && !values.reason?.trim()) throw new Error('Reason required');
	if (status === 'administered' && (!values.administeredAt || !Number.isFinite(Date.parse(values.administeredAt)) || Date.parse(values.administeredAt) > Date.now())) throw new Error('Administration time required');
	if (status === 'administered' && medication.requires_glucose_check && (values.glucose === undefined || !Number.isFinite(values.glucose) || values.glucose <= 0)) throw new Error('Glucose reading required');
	const { data } = await apiClient.post('/medications/administrations', [{
		session_id: sessionId, medication_id: medication.id, status,
		...(status === 'administered' ? { administered_at: values.administeredAt, ...(values.glucose !== undefined ? { glucose_check_value: values.glucose } : {}) } : { missed_reason: values.reason?.trim() }),
	}], { signal });
	const record = administrationSchema.parse(Array.isArray(data) ? data[0] : data);
	if (record.session_id !== sessionId || record.medication_id !== medication.id || record.status !== status || (status === 'administered' && !record.administered_at) || (status !== 'administered' && !record.missed_reason?.trim())) throw new Error('Medication record not confirmed');
	return record;
}

// Fetches from router.get("/medications/client/{client_id}/weekly", response_model=WeeklyMedications)
export async function fetchWeeklyMedications(clientId: string, weekStart: string, signal: AbortSignal) {
	const { data } = await apiClient.get(`/medications/client/${encodeURIComponent(clientId)}/weekly`, { signal, params: { week_start: weekStart } });
	const week = weeklySchema.parse(data);
	if (week.client_id !== clientId || week.week_start !== weekStart || week.doses.some(dose => dose.client_id !== clientId)) throw new Error('Weekly patient mismatch');
	const end = shiftWeek(weekStart, 1);
	const dates = new Intl.DateTimeFormat('en-CA', { timeZone: week.timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
	for (const dose of week.doses) {
		const parts = dates.formatToParts(new Date(dose.scheduled_at));
		const day = `${parts.find(part => part.type === 'year')?.value}-${parts.find(part => part.type === 'month')?.value}-${parts.find(part => part.type === 'day')?.value}`;
		if (day < weekStart || day >= end || (dose.status === 'administered' && !dose.administered_at)) throw new Error('Weekly occurrence not verified');
	}
	return week;
}

export function currentWeekStart() {
	const now = new Date();
	now.setDate(now.getDate() - (now.getDay() + 6) % 7);
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function shiftWeek(start: string, weeks: number) {
	const date = new Date(`${start}T12:00:00Z`);
	date.setUTCDate(date.getUTCDate() + weeks * 7);
	return date.toISOString().slice(0, 10);
}

// --- visitTasks ---
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

// Fetches from router.get("/scheduling/sessions/{session_id}/tasks", response_model=list[VisitTask])
export async function fetchVisitTasks(sessionId: string, signal: AbortSignal) {
	const visit = await fetchCheckInVisit(sessionId, signal);
	if (!visit || visit.id !== sessionId) throw new Error('Visit mismatch');
	let tasks: VisitTask[] = [];
	let tasksAvailable = false;
	try {
		const { data } = await apiClient.get(`/scheduling/sessions/${encodeURIComponent(sessionId)}/tasks`, { signal });
		const records = z.array(taskSchema).parse(data);
		if (records.some(task => task.session_id !== sessionId || task.client_id !== visit.client_id) || new Set(records.map(task => task.id)).size !== records.length) throw new Error('Task identity mismatch');
		tasks = records.filter(task => !task.is_voided);
		tasksAvailable = true;
	} catch { tasksAvailable = false; }
	return { visit, tasks, tasksAvailable };
}

function confirmedTask(data: unknown, sessionId: string, clientId: string) {
	const task = taskSchema.parse(data);
	if (task.session_id !== sessionId || task.client_id !== clientId || task.is_voided) throw new Error('Task save not confirmed');
	return task;
}

// Fetches from router.post("/scheduling/sessions/{session_id}/tasks", response_model=VisitTask)
export async function createVisitTask(sessionId: string, clientId: string, fields: TaskFields, signal: AbortSignal) {
	const { data } = await apiClient.post(`/scheduling/sessions/${encodeURIComponent(sessionId)}/tasks`, fields, { signal });
	const task = confirmedTask(data, sessionId, clientId);
	if (task.status !== 'pending' || task.title !== fields.title) throw new Error('Ad-hoc task not confirmed');
	return task;
}

// Fetches from router.patch("/scheduling/tasks/{task_id}", response_model=VisitTask)
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

// Fetches from router.delete("/scheduling/tasks/{task_id}", response_model=TaskReceipt)
export async function voidVisitTask(task: VisitTask, reason: string, signal: AbortSignal) {
	if (!reason.trim()) throw new Error('Removal reason required');
	const { data } = await apiClient.delete(`/scheduling/tasks/${encodeURIComponent(task.id)}`, { signal, params: { reason: reason.trim() }, data: { expected_revision: task.revision } });
	const receipt = z.object({ status: z.literal('voided'), task_id: z.string(), revision: z.number().int() }).parse(data);
	if (receipt.task_id !== task.id || receipt.revision <= task.revision) throw new Error('Task removal not confirmed');
	return receipt;
}
