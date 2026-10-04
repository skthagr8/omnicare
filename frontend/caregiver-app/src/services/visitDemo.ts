import type { Coordinates } from '@/services/checkIn';

export const DEMO_CLIENT_ID = 'demo-patient-001';
export const isDemoEnvironment = process.env.NODE_ENV !== 'production';
export const VISIT_DEMO_MODE = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_VISIT_DEMO !== 'false';

export function makeDemoVisit(sessionId: string, status?: string) {
	const now = Date.now();
	const checkInAt = new Date(now - 58 * 60000).toISOString();
	const checkOutAt = new Date(now - 2 * 60000).toISOString();
	const selectedStatus = status || (sessionId.includes('next') ? 'scheduled' : sessionId.includes('completed') || sessionId.includes('history') ? 'completed' : 'in_progress');
	const scheduledStart = selectedStatus === 'scheduled' ? new Date(now + 20 * 60000).toISOString() : checkInAt;
	const scheduledEnd = selectedStatus === 'completed' ? checkOutAt : new Date(now + 22 * 60000).toISOString();
	return {
		id: sessionId,
		org_id: 'demo-organization',
		client_id: DEMO_CLIENT_ID,
		caregiver_id: 'demo-caregiver-001',
		scheduled_start: scheduledStart,
		scheduled_end: scheduledEnd,
		visit_date: new Date().toISOString().slice(0, 10),
		status: selectedStatus,
		check_in_at: selectedStatus === 'scheduled' ? null : checkInAt,
		check_in_location: null,
		check_in_geofence_verified: false,
		check_out_at: selectedStatus === 'completed' ? checkOutAt : null,
		check_out_location: null,
		created_by: 'demo-admin',
		created_at: checkInAt,
		is_demo: true,
		clientName: 'Alex Morgan',
		address: '45 Sample Street, Portland, OR 97201',
		destination: { latitude: 45.5231, longitude: -122.6765 } as Coordinates,
	};
}

export function makeDemoPatient() {
	return {
		id: DEMO_CLIENT_ID,
		full_name: 'Alex Morgan',
		date_of_birth: '1945-06-14',
		address_text: '45 Sample Street, Portland, OR 97201',
		room: '204-A',
		photo_url: null,
		fall_risk_level: 'moderate',
		diagnosis_category: 'dementia',
		is_active: true,
	};
}

function dateDaysAgo(days: number, hour = 9) {
	const value = new Date();
	value.setDate(value.getDate() - days);
	value.setHours(hour, 0, 0, 0);
	return value.toISOString();
}

export function makeDemoAssessments(sessionId: string) {
	return [
		{ id: 'demo-assessment-tug', session_id: sessionId, client_id: DEMO_CLIENT_ID, assessment_type: 'tug', state: 'completed', created_at: dateDaysAgo(0), administered_at: dateDaysAgo(0), administered_by: 'demo-caregiver-001', administered_by_name: 'Jamie Rivera (Demo)', tug: { completion_time_sec: 18.6, hesitation_flag: false, freezing_flag: false } },
		{ id: 'demo-assessment-braden', session_id: sessionId, client_id: DEMO_CLIENT_ID, assessment_type: 'braden', state: 'completed', created_at: dateDaysAgo(0, 10), administered_at: dateDaysAgo(0, 10), administered_by: 'demo-caregiver-001', administered_by_name: 'Jamie Rivera (Demo)', braden: { total_score: 18, skin_inspection_notes: 'Sample observation only.' } },
		{ id: 'demo-assessment-cmai', session_id: sessionId, client_id: DEMO_CLIENT_ID, assessment_type: 'cmai', state: 'refused', created_at: dateDaysAgo(0, 11), administered_at: null, administered_by: 'demo-caregiver-001', administered_by_name: 'Jamie Rivera (Demo)', refused_reason: 'Demo example: client requested to rest.' },
	];
}

export function makeDemoAssessmentHistory(sessionId: string) {
	return [
		...Array.from({ length: 10 }, (_, index) => {
			const day = index * 3;
			const refused = index === 4;
			return {
				id: `demo-history-tug-${index}`,
				session_id: index === 0 ? sessionId : `demo-history-session-${index}`,
				client_id: DEMO_CLIENT_ID,
				assessment_type: 'tug',
				state: refused ? 'refused' : 'completed',
				created_at: dateDaysAgo(day),
				administered_at: refused ? null : dateDaysAgo(day),
				administered_by: 'demo-caregiver-001',
				administered_by_name: 'Jamie Rivera (Demo)',
				refused_reason: refused ? 'Demo example: client preferred to rest.' : null,
				tug: refused ? null : { completion_time_sec: 24 - index * .7, hesitation_flag: false, freezing_flag: false },
			};
		}),
		{ id: 'demo-history-braden', session_id: `demo-history-braden-${sessionId}`, client_id: DEMO_CLIENT_ID, assessment_type: 'braden', state: 'completed', created_at: dateDaysAgo(1), administered_at: dateDaysAgo(1), administered_by: 'demo-caregiver-001', administered_by_name: 'Jamie Rivera (Demo)', braden: { total_score: 18 } },
	];
}

export function makeDemoMedications(clientId = DEMO_CLIENT_ID) {
	return [
		{ id: 'demo-medication-levodopa', client_id: clientId, name: 'Levodopa (Demo)', dosage: 'Recorded demo dose', instructions: 'Sample instructions only / follow the actual care plan.', is_active: true, requires_glucose_check: false, window_start_local: '09:00:00', window_end_local: '10:00:00', pill_image_url: null, pill_image_source: null, pill_image_verified: false },
		{ id: 'demo-medication-hydration', client_id: clientId, name: 'Sample medication B', dosage: 'Example dose', instructions: 'For interface preview only.', is_active: true, requires_glucose_check: false, window_start_local: '13:00:00', window_end_local: '14:00:00', pill_image_url: null, pill_image_source: null, pill_image_verified: false },
	];
}

export function makeDemoAdministrations(sessionId: string) {
	return [{ id: 'demo-admin-levodopa', session_id: sessionId, medication_id: 'demo-medication-levodopa', status: 'administered', administered_at: dateDaysAgo(0, 9), created_at: dateDaysAgo(0, 9), recorded_by: 'demo-caregiver-001', missed_reason: null, glucose_check_value: null }];
}

export function makeDemoWeekly(clientId: string, weekStart: string) {
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	const timeFor = (day: number, hour: number, minute = 0) => {
		const date = new Date(`${weekStart}T12:00:00`);
		date.setDate(date.getDate() + day);
		date.setHours(hour, minute, 0, 0);
		return date.toISOString();
	};
	const doses = Array.from({ length: 7 }, (_, day) => {
		const status = day === 2 ? 'refused' : day === 5 ? 'missed' : 'administered';
		return { id: `demo-dose-${day}`, client_id: clientId, medication_id: 'demo-medication-levodopa', medication_name: 'Levodopa (Demo)', dosage: 'Recorded demo dose', scheduled_at: timeFor(day, 9), window_start: timeFor(day, 9), window_end: timeFor(day, 10), status, administered_at: status === 'administered' ? timeFor(day, day === 4 ? 10 : 9, day === 4 ? 20 : 15) : null, reason: status === 'refused' ? 'Demo example: client preferred to rest.' : status === 'missed' ? 'Demo example: dose not recorded.' : null, recorded_by_name: status === 'administered' ? 'Jamie Rivera (Demo)' : null };
	});
	return { client_id: clientId, week_start: weekStart, timezone, doses };
}

export function makeDemoTasks(sessionId: string) {
	return [
		{ id: 'demo-task-check-environment', session_id: sessionId, client_id: DEMO_CLIENT_ID, title: 'Check the immediate care environment', details: 'Example task for preview only.', priority: 'high', due_at: dateDaysAgo(0, 9), status: 'pending', skip_reason: null, completed_at: null, created_at: dateDaysAgo(0, 8), updated_at: dateDaysAgo(0, 8), revision: 0, is_voided: false },
		{ id: 'demo-task-mobility', session_id: sessionId, client_id: DEMO_CLIENT_ID, title: 'Support the planned mobility routine', details: 'Follow the actual care plan. This sample is not a clinical instruction.', priority: 'normal', due_at: dateDaysAgo(0, 10), status: 'completed', skip_reason: null, completed_at: dateDaysAgo(0, 10), created_at: dateDaysAgo(0, 8), updated_at: dateDaysAgo(0, 10), revision: 1, is_voided: false },
		{ id: 'demo-task-hydration', session_id: sessionId, client_id: DEMO_CLIENT_ID, title: 'Offer scheduled hydration assistance', details: 'Illustrative record only.', priority: 'low', due_at: null, status: 'skipped', skip_reason: 'Demo example: client declined.', completed_at: null, created_at: dateDaysAgo(0, 8), updated_at: dateDaysAgo(0, 8), revision: 1, is_voided: false },
	];
}

export function makeDemoQueue(currentSessionId: string) {
	const now = Date.now();
	const base = (id: string, client: string, offsetHours: number, status: string) => ({ id, client_id: DEMO_CLIENT_ID, client_name: client, client_address: '45 Sample Street, Portland, OR 97201', caregiver_id: 'demo-caregiver-001', scheduled_start: new Date(now + offsetHours * 3600000).toISOString(), scheduled_end: new Date(now + (offsetHours + 1) * 3600000).toISOString(), status, notes: 'Sample visit data / not a clinical record.', patient_photo_url: null, room: '204-A', fall_risk: 'moderate' as const });
	return [base(currentSessionId, 'Alex Morgan (Demo)', 0, 'in_progress'), base(`demo-next-${currentSessionId}`, 'Alex Morgan (Demo) / next visit', 2, 'scheduled')];
}

export function makeDemoEmergency() {
	return { level: 'Sample only', note: 'Demonstration emergency state. No alert has been sent.', created_at: new Date().toISOString(), is_demo: true };
}

export function makeDemoAssessmentItems(sessionId: string) {
	const entries = makeDemoAssessments(sessionId);
	const specs = [
		{ id: 'tug', name: 'TUG', full_name: 'Timed Up and Go', description: 'Sample mobility assessment record.', diagnosis_categories: ['*'], backend_type: 'tug', due_at: new Date(Date.now() + 30 * 60000).toISOString() },
		{ id: 'cmai', name: 'CMAI', full_name: 'Agitation Inventory', description: 'Sample frequency assessment record.', diagnosis_categories: ['dementia'], backend_type: 'cmai', due_at: new Date(Date.now() + 60 * 60000).toISOString() },
		{ id: 'braden', name: 'Braden', full_name: 'Braden Scale', description: 'Sample skin assessment record.', diagnosis_categories: [], backend_type: 'braden', due_at: null },
	];
	return specs.map(instrument => ({ id: `demo-item-${instrument.id}`, session_id: sessionId, client_id: DEMO_CLIENT_ID, instrument, due_at: instrument.due_at, entries: entries.filter(entry => entry.assessment_type === instrument.id) }));
}

export function makeDemoCaregiver() {
	return { user_id: 'demo-caregiver-001', full_name: 'Jamie Rivera (Demo)', status: 'IN_SERVICE', last_confirmed_location: null, last_confirmed_at: null, certifications: [] };
}