import { apiClient } from '@/services/api';
import type { Visit } from '@/types/visit';

export type FallRisk = 'high' | 'moderate' | 'low' | 'unknown';
export type QueueVisit = Visit & { patient_photo_url: string | null; room: string | null; fall_risk: FallRisk };
type ClientDetails = { full_name: string; address_text: string; photo_url?: string | null; room?: string | null; fall_risk_level?: string | null };
type SessionDetails = Visit & { patient_photo_url?: string | null; room?: string | null; fall_risk_level?: string | null };

function normalizeRisk(value: string | null | undefined): FallRisk {
	const risk = value?.toLowerCase();
	return risk === 'high' || risk === 'moderate' || risk === 'low' ? risk : 'unknown';
}

export async function fetchTodaySchedule(signal: AbortSignal) {
	const response = await apiClient.get<SessionDetails[]>('/scheduling/visits/today', { signal });
	const sessions = response.data;
	const clientIds = [...new Set(sessions.filter(visit => !visit.client_name || !visit.client_address || visit.patient_photo_url === undefined || visit.room === undefined || visit.fall_risk_level === undefined).map(visit => visit.client_id))];
	const details = await Promise.all(clientIds.map(async clientId => {
		try {
			const client = await apiClient.get<ClientDetails>(`/clients/${encodeURIComponent(clientId)}`, { signal });
			return [clientId, client.data] as const;
		} catch { return [clientId, null] as const; }
	}));
	const clients = new Map(details);
	return {
		clientWarning: details.some(([, client]) => !client),
		visits: sessions.map(visit => ({
			...visit,
			status: visit.status.toLowerCase() as Visit['status'],
			client_name: visit.client_name || clients.get(visit.client_id)?.full_name || 'Client details unavailable',
			client_address: visit.client_address || clients.get(visit.client_id)?.address_text || '',
			patient_photo_url: visit.patient_photo_url || clients.get(visit.client_id)?.photo_url || null,
			room: visit.room || clients.get(visit.client_id)?.room || null,
			fall_risk: normalizeRisk(visit.fall_risk_level || clients.get(visit.client_id)?.fall_risk_level),
		})).sort((first, second) => Date.parse(first.scheduled_start) - Date.parse(second.scheduled_start)),
	};
}