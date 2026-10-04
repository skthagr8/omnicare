import { z } from 'zod';
import { apiClient } from '@/services/api';
import { fetchCareContext, type AssessmentEntry, type AssessmentState } from '@/services/pointOfCare';
import { makeDemoAssessmentItems, makeDemoAssessments, VISIT_DEMO_MODE } from '@/services/visitDemo';

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
	const care = await fetchCareContext(sessionId, signal, true);
	if (!care.visit || care.visit.id !== sessionId) throw new Error('Visit not found');
	if (care.visit.is_demo && VISIT_DEMO_MODE) return { visit: care.visit, diagnosis: 'dementia', catalog: templates, catalogAvailable: true, items: makeDemoAssessmentItems(sessionId) as AssessmentItem[], managedItemsAvailable: true, history: makeDemoAssessments(sessionId) as ListEntry[], recordsError: '', isDemo: true };
	const { data: patient } = await apiClient.get<{ id: string; diagnosis_category: string }>(`/clients/${encodeURIComponent(care.visit.client_id)}`, { signal });
	if (patient.id !== care.visit.client_id) throw new Error('Patient mismatch');
	const diagnosis = patient.diagnosis_category;
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
	let items: AssessmentItem[] = templates.map(instrument => ({ id: `template-${instrument.id}`, session_id: sessionId, client_id: care.visit!.client_id, instrument, due_at: null, entries: fallbackEntries.success ? fallbackEntries.data.filter(record => record.session_id === sessionId && record.client_id === care.visit!.client_id && record.assessment_type.toLowerCase() === instrument.id) : [] }));
	let managedItemsAvailable = false;
	if (itemsResponse.status === 'fulfilled') {
		const parsed = z.array(itemSchema).safeParse(itemsResponse.value.data);
		if (parsed.success && parsed.data.every(item => item.session_id === sessionId && item.client_id === care.visit!.client_id && item.entries.every(entry => entry.session_id === sessionId && entry.client_id === care.visit!.client_id))) { items = parsed.data; managedItemsAvailable = true; }
	}
	return { visit: care.visit, diagnosis, catalog, catalogAvailable, items, managedItemsAvailable, history: fallbackEntries.success ? fallbackEntries.data.filter(record => record.client_id === care.visit!.client_id) : [], recordsError: care.assessmentError || (!fallbackEntries.success ? 'Assessment records could not be verified.' : ''), isDemo: false };
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