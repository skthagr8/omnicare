import { z } from 'zod';
import { apiClient } from '@/services/api';

const patientSchema = z.object({ id: z.string().min(1), full_name: z.string().min(1), date_of_birth: z.string(), diagnosis_category: z.string(), acuity_tier: z.string(), is_active: z.boolean() });
const caregiverSchema = z.object({ user_id: z.string().min(1), full_name: z.string().nullable().optional(), status: z.string() });
const sessionSchema = z.object({ id: z.string().min(1), client_id: z.string().min(1), caregiver_id: z.string().min(1), scheduled_start: z.string().refine(value => Number.isFinite(Date.parse(value))), scheduled_end: z.string().refine(value => Number.isFinite(Date.parse(value))), status: z.string() });
const riskSchema = z.object({ client_id: z.string().min(1), resolved_at: z.string().nullable() });

export type DashboardPatient = z.infer<typeof patientSchema>;
export type DashboardCaregiver = z.infer<typeof caregiverSchema>;
export type DashboardSession = z.infer<typeof sessionSchema>;

export async function fetchAdminDashboard(signal: AbortSignal) {
	const { data: user } = await apiClient.get<{ role: string }>('/auth/me', { signal });
	if (user.role.toLowerCase() !== 'admin') return { authorized: false as const };
	const responses = await Promise.allSettled([
		apiClient.get('/clients', { signal }).then(response => z.array(patientSchema).parse(response.data)),
		apiClient.get('/caregivers', { signal }).then(response => z.array(caregiverSchema).parse(response.data)),
		apiClient.get('/scheduling/visits/today', { signal }).then(response => z.array(sessionSchema).parse(response.data)),
		apiClient.get('/ai/risk-flags?resolved=false', { signal }).then(response => z.array(riskSchema).parse(response.data)),
	]);
	const [patients, caregivers, sessions, risks] = responses;
	return {
		authorized: true as const,
		patients: patients.status === 'fulfilled' ? patients.value.filter(patient => patient.is_active) : null,
		caregivers: caregivers.status === 'fulfilled' ? caregivers.value : null,
		sessions: sessions.status === 'fulfilled' ? sessions.value.sort((first, second) => Date.parse(first.scheduled_start) - Date.parse(second.scheduled_start)) : null,
		flaggedPatientIds: risks.status === 'fulfilled' ? [...new Set(risks.value.filter(risk => risk.resolved_at === null).map(risk => risk.client_id))] : null,
	};
}