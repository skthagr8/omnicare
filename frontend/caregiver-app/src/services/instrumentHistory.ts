import { z } from 'zod';
import { apiClient } from '@/services/api';
import { fetchCheckInVisit } from '@/services/checkIn';
import { DEMO_CLIENT_ID, makeDemoAssessmentHistory, VISIT_DEMO_MODE } from '@/services/visitDemo';

const timestamp = z.string().refine(value => Number.isFinite(Date.parse(value)));
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
	const visit = await fetchCheckInVisit(sessionId, signal, true);
	if (!visit || visit.id !== sessionId) throw new Error('Visit mismatch');
	if (visit.is_demo && VISIT_DEMO_MODE) {
		const records = historySchema.parse(makeDemoAssessmentHistory(sessionId)).filter(entry => entry.client_id === DEMO_CLIENT_ID && entry.assessment_type.toLowerCase() === instrument.toLowerCase());
		const entries: HistoryRecord[] = records.map(entry => ({ ...entry, recordedAt: entry.state === 'completed' && entry.administered_at ? entry.administered_at : entry.created_at, numericScore: historyNumericScore(entry), recorderName: entry.administered_by_name || null })).sort((first, second) => Date.parse(second.recordedAt) - Date.parse(first.recordedAt));
		return { visit, instrument, metadata: historyInstruments[instrument.toLowerCase()] || { name: instrument, metric: 'Recorded result', unit: '' }, entries, trendEntries: entries.slice(0, 10).reverse(), recorderWarning: false, isDemo: true };
	}
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
	return { visit, instrument, metadata, entries, trendEntries: entries.slice(0, 10).reverse(), recorderWarning, isDemo: false };
}