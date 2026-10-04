import { z } from 'zod';
import { apiClient } from '@/services/api';
import { fetchCheckInVisit } from '@/services/checkIn';
import { DEMO_CLIENT_ID, makeDemoAdministrations, makeDemoMedications, makeDemoWeekly, VISIT_DEMO_MODE } from '@/services/visitDemo';

const timestamp = z.string().refine(value => Number.isFinite(Date.parse(value)));
const medicationSchema = z.object({ id: z.string(), client_id: z.string(), name: z.string().min(1), dosage: z.string().min(1), instructions: z.string().nullable().optional(), is_active: z.boolean(), requires_glucose_check: z.boolean().default(false), window_start_local: z.string(), window_end_local: z.string(), pill_image_url: z.string().nullable().optional(), pill_image_source: z.string().nullable().optional(), pill_image_verified: z.boolean().default(false) });
const administrationSchema = z.object({ id: z.string().min(1), session_id: z.string(), medication_id: z.string(), schedule_id: z.string().nullable().optional(), status: z.string().transform(value => value.toLowerCase()).pipe(z.enum(['administered', 'missed', 'refused'])), administered_at: timestamp.nullable().optional(), created_at: timestamp, recorded_by: z.string().nullable().optional(), missed_reason: z.string().nullable().optional(), glucose_check_value: z.union([z.number(), z.string().min(1)]).transform(Number).refine(Number.isFinite).nullable().optional() });
export type VisitMedication = z.infer<typeof medicationSchema>;
export type MedicationAdministration = z.infer<typeof administrationSchema>;
export type MedicationOutcome = MedicationAdministration['status'];

const doseSchema = z.object({ id: z.string(), client_id: z.string(), medication_id: z.string(), medication_name: z.string().min(1), dosage: z.string().min(1), scheduled_at: timestamp, window_start: timestamp, window_end: timestamp, status: z.enum(['scheduled', 'administered', 'missed', 'refused', 'unrecorded']), administered_at: timestamp.nullable(), reason: z.string().nullable(), recorded_by_name: z.string().nullable() }).refine(dose => Date.parse(dose.window_start) <= Date.parse(dose.window_end));
const weeklySchema = z.object({ client_id: z.string(), week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), timezone: z.string().refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } }), doses: z.array(doseSchema) });
export type WeeklyMedicationSchedule = z.infer<typeof weeklySchema>;

export async function fetchVisitMedications(sessionId: string, signal: AbortSignal) {
	const visit = await fetchCheckInVisit(sessionId, signal, true);
	if (!visit || visit.id !== sessionId) throw new Error('Visit mismatch');
	if (visit.is_demo && VISIT_DEMO_MODE) return { visit, medications: makeDemoMedications(visit.client_id) as VisitMedication[], records: makeDemoAdministrations(sessionId) as MedicationAdministration[], recordsAvailable: true, isDemo: true };
	const response = await apiClient.get(`/medications/client/${encodeURIComponent(visit.client_id)}`, { signal });
	const medications = z.array(medicationSchema).parse(response.data).filter(medication => medication.client_id === visit.client_id && medication.is_active);
	let records: MedicationAdministration[] = [];
	let recordsAvailable = false;
	try {
		const administrations = await apiClient.get('/medications/administrations', { signal, params: { session_id: sessionId } });
		const ids = new Set(medications.map(medication => medication.id));
		records = z.array(administrationSchema).parse(administrations.data).filter(record => record.session_id === sessionId && ids.has(record.medication_id)).sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at));
		recordsAvailable = true;
	} catch { recordsAvailable = false; }
	return { visit, medications, records, recordsAvailable, isDemo: false };
}

export async function recordMedication(sessionId: string, medication: VisitMedication, status: MedicationOutcome, values: { reason?: string; glucose?: number; administeredAt?: string }, signal: AbortSignal) {
	if (status !== 'administered' && !values.reason?.trim()) throw new Error('Reason required');
	if (status === 'administered' && (!values.administeredAt || !Number.isFinite(Date.parse(values.administeredAt)) || Date.parse(values.administeredAt) > Date.now())) throw new Error('Administration time required');
	if (status === 'administered' && medication.requires_glucose_check && (values.glucose === undefined || !Number.isFinite(values.glucose) || values.glucose <= 0)) throw new Error('Glucose reading required');
	const { data } = await apiClient.post('/medications/administrations', {
		session_id: sessionId, medication_id: medication.id, status,
		...(status === 'administered' ? { administered_at: values.administeredAt, ...(values.glucose !== undefined ? { glucose_check_value: values.glucose } : {}) } : { missed_reason: values.reason?.trim() }),
	}, { signal });
	const record = administrationSchema.parse(data);
	if (record.session_id !== sessionId || record.medication_id !== medication.id || record.status !== status || (status === 'administered' && !record.administered_at) || (status !== 'administered' && !record.missed_reason?.trim())) throw new Error('Medication record not confirmed');
	return record;
}

export async function fetchWeeklyMedications(clientId: string, weekStart: string, signal: AbortSignal) {
	if (VISIT_DEMO_MODE && clientId === DEMO_CLIENT_ID) return makeDemoWeekly(clientId, weekStart) as WeeklyMedicationSchedule;
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