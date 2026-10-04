import { apiClient } from '@/services/api';
import { fetchCheckInVisit } from '@/services/checkIn';
import { makeDemoAssessments, makeDemoMedications, VISIT_DEMO_MODE } from '@/services/visitDemo';

export type InstrumentId = 'tug' | 'cmai' | 'braden';
export type AssessmentState = 'pending' | 'refused' | 'completed';
export type AssessmentRecord = {
	id: string;
	session_id: string;
	client_id: string;
	assessment_type: InstrumentId;
	state: AssessmentState;
	created_at: string;
	administered_at?: string | null;
	refused_reason?: string | null;
};
export type AssessmentEntry = {
	session_id: string;
	client_id: string;
	assessment_type: InstrumentId;
	state: AssessmentState;
	refused_reason?: string;
	administered_at?: string;
	tug?: { completion_time_sec: number; hesitation_flag: boolean; freezing_flag: boolean };
	cmai?: { total_score: number };
	braden?: { total_score: number; skin_inspection_notes?: string };
};
export type CareMedication = {
	id: string;
	name: string;
	dosage: string;
	instructions?: string | null;
	is_active: boolean;
	window_start_local: string;
	window_end_local: string;
};

function normalizeAssessment(record: AssessmentRecord): AssessmentRecord {
	return { ...record, assessment_type: record.assessment_type.toLowerCase() as InstrumentId, state: record.state.toLowerCase() as AssessmentState };
}

export async function fetchCareContext(sessionId: string | null, signal: AbortSignal, allowDemo = false) {
	const visit = await fetchCheckInVisit(sessionId, signal, allowDemo);
	if (!visit) return { visit, assessments: [] as AssessmentRecord[], medications: [] as CareMedication[], assessmentError: '', medicationError: '' };
	if (visit.is_demo && VISIT_DEMO_MODE) return { visit, assessments: makeDemoAssessments(visit.id) as AssessmentRecord[], medications: makeDemoMedications(visit.client_id) as CareMedication[], assessmentError: '', medicationError: '', isDemo: true };
	const [assessments, medications] = await Promise.allSettled([
		apiClient.get<AssessmentRecord[]>(`/assessments/client/${encodeURIComponent(visit.client_id)}`, { signal }),
		apiClient.get<CareMedication[]>(`/medications/client/${encodeURIComponent(visit.client_id)}`, { signal }),
	]);
	return {
		visit,
		assessments: assessments.status === 'fulfilled' ? assessments.value.data.map(normalizeAssessment).sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at)) : [],
		medications: medications.status === 'fulfilled' ? medications.value.data.filter(medication => medication.is_active) : [],
		assessmentError: assessments.status === 'rejected' ? 'Assessment records could not be loaded. Refresh before recording a new result.' : '',
		medicationError: medications.status === 'rejected' ? 'The medication list could not be loaded. Please refresh before providing medication care.' : '',
		isDemo: false,
	};
}

export async function saveAssessment(entry: AssessmentEntry, signal: AbortSignal) {
	const { data } = await apiClient.post<AssessmentRecord>('/assessments', entry, { signal });
	const record = normalizeAssessment(data);
	if (!record.id || record.session_id !== entry.session_id || record.client_id !== entry.client_id || record.assessment_type !== entry.assessment_type || record.state !== entry.state) throw new Error('Assessment save not confirmed');
	return record;
}