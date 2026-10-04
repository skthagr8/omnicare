import { z } from 'zod';
import { apiClient } from '@/services/api';
import { fetchTodaySchedule } from '@/services/schedule';
import { sortPatientQueue } from '@/services/patientQueue';
import { DEMO_CLIENT_ID, makeDemoPatient, makeDemoQueue, VISIT_DEMO_MODE } from '@/services/visitDemo';

const patientSchema = z.object({ id: z.string(), full_name: z.string(), date_of_birth: z.string().nullable().optional(), address_text: z.string(), room: z.string().nullable().optional(), photo_url: z.string().nullable().optional(), fall_risk_level: z.string().nullable().optional() });
const historySchema = z.array(z.object({ id: z.string(), client_id: z.string(), scheduled_start: z.string(), scheduled_end: z.string(), status: z.string(), check_in_at: z.string().nullable().optional(), check_out_at: z.string().nullable().optional() }));
export type ShellPatient = z.infer<typeof patientSchema>;
export type HistoricalVisit = z.infer<typeof historySchema>[number];

export async function fetchShellPatient(clientId: string, signal: AbortSignal) {
	if (VISIT_DEMO_MODE && clientId === DEMO_CLIENT_ID) return makeDemoPatient() as ShellPatient;
	const { data } = await apiClient.get(`/clients/${encodeURIComponent(clientId)}`, { signal });
	const patient = patientSchema.parse(data);
	if (patient.id !== clientId) throw new Error('Patient identity mismatch');
	return patient;
}

export async function fetchVisitHistory(clientId: string, signal: AbortSignal) {
	if (VISIT_DEMO_MODE && clientId === DEMO_CLIENT_ID) return Array.from({ length: 4 }, (_, index) => ({ id: `demo-history-visit-${index}`, client_id: clientId, scheduled_start: new Date(Date.now() - (index + 1) * 86400000).toISOString(), scheduled_end: new Date(Date.now() - (index + 1) * 86400000 + 3600000).toISOString(), check_in_at: new Date(Date.now() - (index + 1) * 86400000).toISOString(), check_out_at: new Date(Date.now() - (index + 1) * 86400000 + 3600000).toISOString(), status: 'completed' }));
	const { data } = await apiClient.get('/scheduling/sessions', { signal, params: { client_id: clientId } });
	return historySchema.parse(data).filter(visit => visit.client_id === clientId).sort((first, second) => Date.parse(second.scheduled_start) - Date.parse(first.scheduled_start));
}

export async function fetchShellQueue(signal: AbortSignal, currentSessionId = 'demo-current') {
	if (VISIT_DEMO_MODE) return makeDemoQueue(currentSessionId) as QueueVisit[];
	const { visits } = await fetchTodaySchedule(signal);
	return sortPatientQueue(visits, 'time', Date.now()).visits;
}