import { apiClient } from '@/services/api';
import { fetchCheckInVisit, type CheckInSession, type Coordinates } from '@/services/checkIn';
import { fetchTodaySchedule } from '@/services/schedule';

export type CheckOutSession = CheckInSession & { check_out_at: string };

export async function fetchCheckOutVisit(sessionId: string | null, signal: AbortSignal, allowDemo = false) {
	if (allowDemo) return fetchCheckInVisit(sessionId || 'demo-current', signal, true);
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