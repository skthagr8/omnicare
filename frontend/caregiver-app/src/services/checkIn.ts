import { apiClient } from '@/services/api';
import { fetchTodaySchedule } from '@/services/schedule';
import { DEMO_CLIENT_ID, makeDemoVisit, VISIT_DEMO_MODE } from '@/services/visitDemo';

export type Coordinates = { latitude: number; longitude: number };
export type CheckInSession = {
	id: string;
	client_id: string;
	status: string;
	check_in_at: string | null;
	check_in_geofence_verified: boolean | null;
	check_out_at?: string | null;
	is_demo?: boolean;
};
export type CheckInVisit = CheckInSession & {
	clientName: string;
	address: string;
	destination: Coordinates | null;
};
type ClientResponse = { full_name: string; address_text: string; location?: Coordinates | null };

export async function fetchCheckInVisit(sessionId: string | null, signal: AbortSignal, allowDemo = false): Promise<CheckInVisit | null> {
	if (VISIT_DEMO_MODE && (allowDemo || sessionId?.startsWith('demo-'))) return makeDemoVisit(sessionId || 'demo-current', sessionId === null ? 'scheduled' : undefined) as CheckInVisit;
	let selectedId = sessionId;
	if (!selectedId) {
		const { visits } = await fetchTodaySchedule(signal);
		selectedId = (visits.find(visit => visit.status === 'in_progress') || visits.find(visit => visit.status === 'scheduled'))?.id || null;
	}
	if (!selectedId) return null;
	const { data: session } = await apiClient.get<CheckInSession>(`/scheduling/sessions/${encodeURIComponent(selectedId)}`, { signal });
	const { data: client } = await apiClient.get<ClientResponse>(`/clients/${encodeURIComponent(session.client_id)}`, { signal });
	return { ...session, status: session.status.toLowerCase(), clientName: client.full_name, address: client.address_text, destination: client.location || null };
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