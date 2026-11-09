import axios from 'axios';
import { z } from 'zod';
import { apiClient } from './api';
import type {
    Visit,
    QueueVisit,
    CognitiveDeclineRisk,
    CognitiveDeclineLevel,
} from '../types/visit';



// --- checkIn ---
export type Coordinates = { latitude: number; longitude: number };
export type CheckInSession = {
    id: string;
    client_id: string;
    status: string;
    check_in_at: string | null;
    check_in_geofence_verified: boolean | null;
    check_out_at?: string | null;
};
export type CheckInVisit = CheckInSession & {
    clientName: string;
    address: string;
    destination: Coordinates | null;
};
type ClientResponse = { full_name: string; address_text: string; location?: Coordinates | null };

export async function fetchCheckInVisit(sessionId: string | null, signal: AbortSignal): Promise<CheckInVisit | null> {
    let selectedId = sessionId;
    
    if (!selectedId) {
        const { visits } = await fetchTodaySchedule(signal);
        selectedId = (visits.find(visit => visit.status === 'in_progress') || visits.find(visit => visit.status === 'scheduled'))?.id || null;
    }
    
    if (!selectedId) return null;
    
    const { data: session } = await apiClient.get<CheckInSession>(`/scheduling/sessions/${encodeURIComponent(selectedId)}`, { signal });
    const { data: client } = await apiClient.get<ClientResponse>(`/clients/${encodeURIComponent(session.client_id)}`, { signal });
    
    return { 
        ...session, 
        status: session.status.toLowerCase(), 
        clientName: client.full_name, 
        address: client.address_text, 
        destination: client.location || null 
    };
}

export async function submitCheckIn(sessionId: string, location: Coordinates, signal: AbortSignal): Promise<CheckInSession> {
    const { data } = await apiClient.post<CheckInSession>(`/scheduling/sessions/${encodeURIComponent(sessionId)}/check-in`, {
        location,
        geofence_verified: false,
    }, { signal });
    
    if (data.id !== sessionId || !data.check_in_at || !Number.isFinite(Date.parse(data.check_in_at)) || data.status.toLowerCase() !== 'in_progress' || typeof data.check_in_geofence_verified !== 'boolean') {
        throw new Error('Check-in was not confirmed');
    }
    
    return data;
}

// --- checkOut ---
export type CheckOutSession = CheckInSession & { check_out_at: string };

export async function fetchCheckOutVisit(sessionId: string | null, signal: AbortSignal) {
	let selectedId = sessionId;
	if (!selectedId) {
		const { visits } = await fetchTodaySchedule(signal);
		selectedId = visits.find(visit => visit.status === 'in_progress')?.id || null;
	}
	return selectedId ? fetchCheckInVisit(selectedId, signal) : null;
}

export async function submitCheckOut(sessionId: string, location: Coordinates, signal: AbortSignal): Promise<CheckOutSession> {
	const { data } = await apiClient.post<CheckOutSession>(`/scheduling/sessions/${encodeURIComponent(sessionId)}/check-out`, { location }, { signal });
	const start = data.check_in_at ? Date.parse(data.check_in_at) : NaN;
	const end = data.check_out_at ? Date.parse(data.check_out_at) : NaN;
	if (data.id !== sessionId || data.status.toLowerCase() !== 'completed' || !Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error('Check-out was not confirmed');
	return data;
}



export async function fetchTodaySchedule(signal: AbortSignal) {
    try {
        const response = await apiClient.get<Visit[]>('/scheduling/visits/today', { signal });
        console.log('Fetched today schedule response:', response);
        
        const visits = Array.isArray(response?.data) ? response.data : [];

        if (visits.length === 0) {
            return { clientWarning: false, visits: [] };
        }

        visits.sort((first, second) => {
            const timeFirst = Date.parse(first.scheduled_start);
            const timeSecond = Date.parse(second.scheduled_start);
            
            if (isNaN(timeFirst) && isNaN(timeSecond)) return 0;
            if (isNaN(timeFirst)) return 1;
            if (isNaN(timeSecond)) return -1;
            
            return timeFirst - timeSecond;
        });

        return {
            clientWarning: false,
            visits,
        };

    } catch (error) {
        if (axios.isCancel(error) || (error instanceof Error && error.name === 'AbortError')) {
            throw error; 
        }
        
        if (axios.isAxiosError(error)) {
            console.error('CRITICAL API ROUTE FAILURE (/scheduling/visits/today):', {
                status: error.response?.status || 'No Status (Network Error / CORS / Preflight)',
                url: error.config?.url,
                method: error.config?.method,
                responseBody: error.response?.data || 'No Response Body',
                headers: error.response?.headers,
                axiosMessage: error.message
            });
        } else {
            console.error('Critical unknown failure fetching today schedule:', error);
        }
        
        return {
            clientWarning: true,
            visits: [],
        };
    }
}

// --- patientQueue ---


export type { QueueVisit };

export type QueueSort =
  | 'time'
  | 'cognitive_decline'
  | 'status';

const cognitiveDeclineOrder: Record<CognitiveDeclineLevel, number> = {
  significant_decline: 0,
  moderate_decline: 1,
  mild_decline: 2,
  stable: 3,
  improvement: 4,
  unknown: 5,
};

const statusOrder: Record<Visit['status'], number> = {
  in_progress: 0,
  scheduled: 1,
  completed: 2,
  missed: 3,
  cancelled: 4,
};
export function sortPatientQueue(
  visits: QueueVisit[],
  sort: QueueSort,
  currentTime: number,
  cognitiveDeclineByClientId: Readonly<
    Record<string, CognitiveDeclineRisk | null>
  > = {},
) {
  const chronological = [...visits].sort(
    (first, second) =>
      Date.parse(first.scheduled_start) -
        Date.parse(second.scheduled_start) ||
      first.id.localeCompare(second.id),
  );

  const active =
    chronological.find(
      visit => visit.status === 'in_progress',
    ) ||
    chronological.find(
      visit =>
        visit.status === 'scheduled' &&
        Date.parse(visit.scheduled_start) <= currentTime &&
        Date.parse(visit.scheduled_end) > currentTime,
    );

  const sorted = [...chronological].sort((first, second) => {
    // Keep the currently active visit at the top.
    if (first.id === active?.id) return -1;
    if (second.id === active?.id) return 1;

    let difference = 0;

    if (sort === 'cognitive_decline') {
      const firstRisk =
        cognitiveDeclineByClientId[first.client_id] ?? null;

      const secondRisk =
        cognitiveDeclineByClientId[second.client_id] ?? null;

      const firstLevel =
        firstRisk?.level ?? 'unknown';

      const secondLevel =
        secondRisk?.level ?? 'unknown';

      difference =
        cognitiveDeclineOrder[firstLevel] -
        cognitiveDeclineOrder[secondLevel];

      // Within the same category, higher positive
      // predicted decline scores come first.
      if (
        difference === 0 &&
        firstRisk &&
        secondRisk
      ) {
        difference = secondRisk.score - firstRisk.score;
      }
    } else if (sort === 'status') {
      difference =
        statusOrder[first.status] -
        statusOrder[second.status];
    }

    return (
      difference ||
      Date.parse(first.scheduled_start) -
        Date.parse(second.scheduled_start) ||
      first.id.localeCompare(second.id)
    );
  });

  return {
    visits: sorted,
    activeId: active?.id,
  };
}

// --- pointOfCare ---
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

export async function fetchCareContext(sessionId: string | null, signal: AbortSignal) {
    // Calling fetchCheckInVisit strictly with sessionId and signal
    const visit = await fetchCheckInVisit(sessionId, signal);
    if (!visit) return { visit, assessments: [] as AssessmentRecord[], medications: [] as CareMedication[], assessmentError: '', medicationError: '' };

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
    };
}

export async function saveAssessment(entry: AssessmentEntry, signal: AbortSignal) {
    const { data } = await apiClient.post<AssessmentRecord>('/assessments', entry, { signal });
    const record = normalizeAssessment(data);
    if (!record.id || record.session_id !== entry.session_id || record.client_id !== entry.client_id || record.assessment_type !== entry.assessment_type || record.state !== entry.state) throw new Error('Assessment save not confirmed');
    return record;
}

// --- visitShell ---
const patientSchema = z.object({ 
    id: z.string(), 
    full_name: z.string(), 
    date_of_birth: z.string().nullable().optional(), 
    address_text: z.string(), 
    diagnosis_category: z.string().nullable().optional() 
});

const historySchema = z.array(z.object({ 
    id: z.string(), 
    client_id: z.string(), 
    scheduled_start: z.string(), 
    scheduled_end: z.string(), 
    status: z.string(), 
    check_in_at: z.string().nullable().optional(), 
    check_out_at: z.string().nullable().optional() 
}));

export type ShellPatient = z.infer<typeof patientSchema>;
export type HistoricalVisit = z.infer<typeof historySchema>[number];

// UPDATED: Now takes sessionId and fetches from the session-client route
export async function fetchShellPatient(sessionId: string, signal: AbortSignal) {
    try {
        console.log(`[fetchShellPatient] Requesting client data for Session ID: ${sessionId}`);
        
        // Ensure the prefix matches your FastAPI router (e.g., /scheduling/sessions)
        const { data } = await apiClient.get(`/scheduling/sessions/${encodeURIComponent(sessionId)}/client`, { signal });
        
        if (!data) {
            console.warn(`[fetchShellPatient] Empty payload returned for Session ID: ${sessionId}`);
        }

        // Validate data against our Zod schema
        const parsed = patientSchema.safeParse(data);

        if (!parsed.success) {
            console.error(
                "[fetchShellPatient] Zod issues:",
                JSON.stringify(parsed.error.issues, null, 2),
            );
            console.error(
                "[fetchShellPatient] Raw payload:",
                JSON.stringify(data, null, 2),
            );
                console.error(`[fetchShellPatient] Zod validation failed for Session ID ${sessionId}. Expected schema mismatch:`, parsed.error.format());
            console.error(`[fetchShellPatient] Raw payload received:`, data);
            throw new Error('Patient data schema validation failed');
        }

        console.log(`[fetchShellPatient] Successfully fetched and validated client: ${parsed.data.id}`);
        return parsed.data;

    } catch (error) {
        if (axios.isCancel(error) || (error instanceof Error && error.name === 'AbortError')) {
            console.log(`[fetchShellPatient] Request aborted for Session ID: ${sessionId}`);
            throw error;
        }

        if (axios.isAxiosError(error)) {
            console.error(`[fetchShellPatient] Network/API Error for Session ID ${sessionId}:`, {
                status: error.response?.status,
                statusText: error.response?.statusText,
                url: error.config?.url,
                responseBody: error.response?.data,
                message: error.message
            });
        } else {
            console.error(`[fetchShellPatient] Unexpected Error for Session ID ${sessionId}:`, error);
        }
        
        throw error;
    }
}

export async function fetchVisitHistory(clientId: string, signal: AbortSignal) {
    // Fixed URL: Querying the general sessions endpoint with a client_id parameter
    const { data } = await apiClient.get('/scheduling/sessions', { signal, params: { client_id: clientId } });
    return historySchema.parse(data)
        .filter(visit => visit.client_id === clientId)
        .sort((first, second) => Date.parse(second.scheduled_start) - Date.parse(first.scheduled_start));
}

export async function fetchShellQueue(signal: AbortSignal, currentSessionId?: string) {
    const { visits } = await fetchTodaySchedule(signal);
    return sortPatientQueue(visits, 'time', Date.now()).visits as QueueVisit[];
}

// --- visitSummary ---
const timestamp = z.string().refine(value => Number.isFinite(Date.parse(value)), 'Invalid timestamp');
const score = z.union([z.number(), z.string().min(1)]).transform(Number).refine(Number.isFinite).nullable().optional();
const assessmentSchema = z.object({
	id: z.string().min(1),
	session_id: z.string().min(1),
	client_id: z.string().min(1),
	assessment_type: z.string().transform(value => value.toLowerCase()),
	state: z.string().transform(value => value.toLowerCase()).pipe(z.enum(['pending', 'refused', 'completed'])),
	created_at: timestamp,
	administered_at: timestamp.nullable().optional(),
	refused_reason: z.string().nullable().optional(),
	tug: z.object({ completion_time_sec: score }).nullable().optional(),
	cmai: z.object({ total_score: score }).nullable().optional(),
	braden: z.object({ total_score: score }).nullable().optional(),
	delirium: z.object({ cam_positive: z.boolean().nullable().optional() }).nullable().optional(),
});
const receiptSchema = z.object({ status: z.literal('sent'), sent_at: timestamp, recipient_count: z.number().int().positive() });
const summarySchema = z.object({
	id: z.string().min(1),
	version: z.string().min(1),
	session_id: z.string().min(1),
	client_id: z.string().min(1),
	completed_tasks: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), status: z.literal('completed') })),
	administered_medications: z.array(z.object({ id: z.string().min(1), medication_name: z.string().min(1), dosage: z.string().min(1), status: z.literal('administered'), administered_at: timestamp })),
	assessments: z.array(assessmentSchema),
	observations: z.array(z.object({ id: z.string().min(1), note: z.string().min(1), recorded_at: timestamp, author_name: z.string().optional() })),
	can_share: z.boolean(),
	authorized_recipient_count: z.number().int().nonnegative(),
	share_receipt: receiptSchema.nullable(),
});

export type SummaryAssessment = z.infer<typeof assessmentSchema>;
export type VisitSummaryContent = z.infer<typeof summarySchema>;
export type FamilyShareReceipt = z.infer<typeof receiptSchema>;

export async function fetchVisitSummary(sessionId: string | null, signal: AbortSignal) {
	let selectedId = sessionId;
	if (!selectedId) {
		const { visits } = await fetchTodaySchedule(signal);
		selectedId = visits.filter(visit => visit.status === 'completed').sort((first, second) => Date.parse(second.scheduled_end) - Date.parse(first.scheduled_end))[0]?.id || null;
	}
	if (!selectedId) return { visit: null, content: null, assessments: [] as SummaryAssessment[], assessmentError: '', contentError: '' };
	const visit = await fetchCheckInVisit(selectedId, signal);
	if (!visit) throw new Error('Visit not found');
	let content: VisitSummaryContent | null = null;
	let contentError = '';
	try {
		const response = await apiClient.get(`/scheduling/sessions/${encodeURIComponent(visit.id)}/summary`, { signal });
		content = summarySchema.parse(response.data);
		if (content.session_id !== visit.id || content.client_id !== visit.client_id || content.assessments.some(record => record.session_id !== visit.id || record.client_id !== visit.client_id)) throw new Error('Summary visit mismatch');
	} catch {
		content = null;
		contentError = 'The full visit summary is unavailable. Family sharing is paused until all records can be verified.';
	}
	let assessments = content?.assessments || [];
	let assessmentError = '';
	if (!content) {
		try {
			const response = await apiClient.get(`/assessments/client/${encodeURIComponent(visit.client_id)}`, { signal });
			assessments = z.array(assessmentSchema).parse(response.data).filter(record => record.session_id === visit.id && record.client_id === visit.client_id);
		} catch { assessmentError = 'Assessment results could not be loaded.'; }
	}
	assessments = [...assessments].sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at));
	const latest = new Map<string, SummaryAssessment>();
	for (const record of assessments) if (!latest.has(record.assessment_type)) latest.set(record.assessment_type, record);
	return { visit, content, assessments: [...latest.values()], assessmentError, contentError };
}

export async function sendSummaryToFamily(content: VisitSummaryContent, idempotencyKey: string, signal: AbortSignal): Promise<FamilyShareReceipt> {
	if (!content.can_share || content.authorized_recipient_count < 1 || content.share_receipt) throw new Error('Family sharing is unavailable');
	const response = await apiClient.post(`/scheduling/sessions/${encodeURIComponent(content.session_id)}/summary/send`, {
		summary_id: content.id,
		version: content.version,
	}, { signal, headers: { 'Idempotency-Key': idempotencyKey } });
	return receiptSchema.parse(response.data);
}

// --- adminDashboard ---
// Mirrors ClientResponse (backend/app/modules/clients/schemas.py) as served by GET /clients.
// It carries no diagnosis or acuity; those come from the per-client routes below.
const dashboardClientSchema = z.object({ id: z.string().min(1), full_name: z.string().min(1), date_of_birth: z.string(), is_active: z.boolean() });
// Mirrors ClientDiagnosisResponse: GET /clients/{client_id}/diagnoses, newest diagnosed_at first.
const clientDiagnosisSchema = z.object({ category: z.string().min(1), is_active: z.boolean(), diagnosed_at: z.string() });
// Mirrors AcuityTierResponse: GET /clients/{client_id}/acuity-tiers, newest effective_from first. The open tier has effective_to = null.
const acuityTierSchema = z.object({ level: z.string().min(1), effective_from: z.string(), effective_to: z.string().nullable().optional() });
const caregiverSchema = z.object({ user_id: z.string().min(1), full_name: z.string().nullable().optional(), status: z.string() });
const sessionSchema = z.object({ id: z.string().min(1), client_id: z.string().min(1), caregiver_id: z.string().min(1), scheduled_start: z.string().refine(value => Number.isFinite(Date.parse(value))), scheduled_end: z.string().refine(value => Number.isFinite(Date.parse(value))), status: z.string() });
// Mirrors CognitiveDeclinePredictionOut (backend/app/modules/ai/schemas.py)
const declinePredictionSchema = z.object({ client_id: z.string().min(1), severity: z.enum(['improvement', 'stable', 'mild_decline', 'moderate_decline', 'significant_decline']) });
const FLAGGED_SEVERITIES = new Set(['mild_decline', 'moderate_decline', 'significant_decline']);

// Fetches from router.get("/ai/clients/{client_id}/cognitive-decline/latest", response_model=CognitiveDeclinePredictionOut), one call per client.
// A 404 means no prediction exists for that client yet; that client is not flagged.
async function fetchFlaggedPatientIds(patientIds: string[], signal: AbortSignal) {
	const results = await Promise.allSettled(patientIds.map(clientId =>
		apiClient.get(`/ai/clients/${encodeURIComponent(clientId)}/cognitive-decline/latest`, { signal }).then(response => declinePredictionSchema.parse(response.data))));
	const failed = results.filter(result => result.status === 'rejected' && (result.reason as { response?: { status?: number } })?.response?.status !== 404);
	if (patientIds.length > 0 && failed.length === patientIds.length) throw new Error('Cognitive decline predictions unavailable');
	return results.flatMap(result => result.status === 'fulfilled' && FLAGGED_SEVERITIES.has(result.value.severity) ? [result.value.client_id] : []);
}

// diagnosis_category / acuity_tier are null when the backend has none recorded (or the lookup failed).
export type DashboardPatient = z.infer<typeof dashboardClientSchema> & { diagnosis_category: string | null; acuity_tier: string | null };

// Primary diagnosis = most recent active diagnosis; acuity = the open tier (effective_to null).
export async function fetchPatientCareProfile(clientId: string, signal: AbortSignal) {
	const id = encodeURIComponent(clientId);
	const [diagnoses, tiers] = await Promise.allSettled([
		apiClient.get(`/clients/${id}/diagnoses`, { signal }).then(response => z.array(clientDiagnosisSchema).parse(response.data)),
		apiClient.get(`/clients/${id}/acuity-tiers`, { signal }).then(response => z.array(acuityTierSchema).parse(response.data)),
	]);
	return {
		diagnosis_category: diagnoses.status === 'fulfilled' ? diagnoses.value.find(diagnosis => diagnosis.is_active)?.category ?? null : null,
		acuity_tier: tiers.status === 'fulfilled' ? tiers.value.find(tier => !tier.effective_to)?.level ?? null : null,
	};
}
export type DashboardCaregiver = z.infer<typeof caregiverSchema>;
export type DashboardSession = z.infer<typeof sessionSchema>;

export async function fetchAdminDashboard(signal: AbortSignal) {
	const { data: user } = await apiClient.get<{ role: string }>('/auth/me', { signal });
	if (user.role.toLowerCase() !== 'admin') return { authorized: false as const };
	const responses = await Promise.allSettled([
		apiClient.get('/clients', { signal }).then(response => z.array(dashboardClientSchema).parse(response.data).filter(client => client.is_active)),
		apiClient.get('/caregivers', { signal }).then(response => z.array(caregiverSchema).parse(response.data)),
		apiClient.get('/scheduling/visits/today', { signal }).then(response => z.array(sessionSchema).parse(response.data)),
	]);
	const [clients, caregivers, sessions] = responses;
	const activeClients = clients.status === 'fulfilled' ? clients.value : [];
	const [profiles, risks] = await Promise.all([
		Promise.all(activeClients.map(client => fetchPatientCareProfile(client.id, signal))),
		Promise.allSettled([
			clients.status === 'fulfilled'
				? fetchFlaggedPatientIds(activeClients.map(client => client.id), signal)
				: Promise.reject(clients.reason),
		]).then(([result]) => result),
	]);
	const patients: DashboardPatient[] | null = clients.status === 'fulfilled' ? activeClients.map((client, index) => ({ ...client, ...profiles[index] })) : null;
	return {
		authorized: true as const,
		patients,
		caregivers: caregivers.status === 'fulfilled' ? caregivers.value : null,
		sessions: sessions.status === 'fulfilled' ? sessions.value.sort((first, second) => Date.parse(first.scheduled_start) - Date.parse(second.scheduled_start)) : null,
		flaggedPatientIds: risks.status === 'fulfilled' ? [...new Set(risks.value)] : null,
	};
}

