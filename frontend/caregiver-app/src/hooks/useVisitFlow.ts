'use client';

import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from './useDevice';
import { geolocationService } from '../services/platform';
import {
	fetchCheckInVisit,
	submitCheckIn,
	type CheckInSession,
	type CheckInVisit,
	type Coordinates,
	fetchCheckOutVisit,
	fetchTodaySchedule,
	submitCheckOut,
	type CheckOutSession,
	fetchCareContext,
	saveAssessment,
	type AssessmentEntry,
	type AssessmentRecord,
	type AssessmentState,
	type InstrumentId,
	fetchShellPatient,
	fetchShellQueue,
	fetchVisitHistory,
	type HistoricalVisit,
	type ShellPatient,
	type QueueVisit,
	fetchVisitSummary,
	sendSummaryToFamily,
	type FamilyShareReceipt,
} from '../services/visits';
import { useGeolocation } from './useGeolocation';

// --- useCheckIn ---
type LocationFix = Coordinates & { accuracy: number; timestamp: number };

async function fetchLatestCompletedVisitToday(signal: AbortSignal): Promise<CheckInVisit | null> {
	const { visits } = await fetchTodaySchedule(signal); // sorted by scheduled_start
	const completed = visits.filter(visit => visit.status?.toLowerCase() === 'completed');
	const latest = completed[completed.length - 1];
	return latest ? fetchCheckInVisit(latest.id, signal) : null;
}

export function useCheckIn() {
	const isOnline = useOnlineStatus();
	const [visit, setVisit] = useState<CheckInVisit | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [location, setLocation] = useState<LocationFix | null>(null);
	const [locating, setLocating] = useState(false);
	const [locationError, setLocationError] = useState('');
	const [manualConfirmed, setManualConfirmed] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState('');
	const [receipt, setReceipt] = useState<CheckInSession | null>(null);
	const [now, setNow] = useState(0);
	const [reload, setReload] = useState(0);
	const active = useRef(false);
	const locationRequest = useRef(0);
	const submission = useRef<AbortController | null>(null);

	useEffect(() => {
		active.current = true;
		setNow(Date.now());
		const timer = setInterval(() => setNow(Date.now()), 10000);
		return () => { active.current = false; locationRequest.current += 1; submission.current?.abort(); clearInterval(timer); };
	}, []);

	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		const values = new URLSearchParams(window.location.search).getAll('session_id');
		setLoading(true);
		setLoadError('');
		setSubmitError('');
		if (values.length > 1 || (values.length === 1 && !values[0].trim())) {
			setLoadError('This visit link is incomplete. Please return to your schedule.');
			setLoading(false);
			return;
		}
		fetchCheckInVisit(values[0] || null, controller.signal)
			// Nothing left to check into today: show the latest visit already completed today
			// (rendered as "Visit completed") rather than an empty error screen.
			.then(async data => data ?? (values[0] ? null : await fetchLatestCompletedVisitToday(controller.signal)))
			.then(data => { if (!disposed) { setVisit(data); setReceipt(null); setManualConfirmed(false); } })
			.catch(() => { if (!disposed) setLoadError('We could not load this appointment. Please check your connection and try again.'); })
			.finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [reload]);

	async function requestLocation() {
		const request = ++locationRequest.current;
		setLocating(true);
		setLocationError('');
		try {
			const position = await geolocationService.getCurrentPosition();
			const { latitude, longitude, accuracy } = position.coords;
			if (![latitude, longitude, accuracy, position.timestamp].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0) throw new Error('Invalid location');
			if (active.current && request === locationRequest.current) {
				setLocation({ latitude, longitude, accuracy, timestamp: position.timestamp });
				setNow(Date.now());
			}
		} catch (error) {
			if (active.current && request === locationRequest.current) {
				const code = (error as { code?: number } | null)?.code;
				setLocationError(code === 1 ? 'Location access is off. Allow location access in your browser, then try again.' : 'Your location is unavailable. Please try again in an open area.');
			}
		} finally { if (active.current && request === locationRequest.current) setLocating(false); }
	}

	// A visit is finished once it is marked completed or has a check-out time
	// (the latter guards against a status that was reset by hand).
	const visitCompleted = Boolean(visit && (visit.status === 'completed' || visit.check_out_at));

	// Ask for the caregiver's position once the visit has loaded so the map can show it,
	// unless the visit is already finished. Stale results (e.g. from a Strict Mode
	// double-mount) are discarded via locationRequest.
	const shouldLocate = Boolean(visit && !visitCompleted);
	useEffect(() => {
		if (shouldLocate) void requestLocation();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shouldLocate, visit?.id]);

	const alreadyCheckedIn = Boolean(receipt || visit?.check_in_at || visit?.status === 'in_progress');
	const locationFresh = Boolean(location && now - location.timestamp <= 120000 && now >= location.timestamp - 10000);
	const canCheckIn = Boolean(visit?.status === 'scheduled' && !visitCompleted && !alreadyCheckedIn && !loading && !loadError && !submitting && !submitError && !locating && !locationError && locationFresh && manualConfirmed && isOnline);

	async function checkIn() {
		if (!canCheckIn || visitCompleted || !visit || !location || submission.current) return;
		if (Date.now() - location.timestamp > 120000) { setNow(Date.now()); return; }
		const controller = new AbortController();
		submission.current = controller;
		const timeout = setTimeout(() => controller.abort(), 20000);
		setSubmitting(true);
		setSubmitError('');
		try {
			const result = await submitCheckIn(visit.id, { latitude: location.latitude, longitude: location.longitude }, controller.signal);
			if (active.current) setReceipt(result);
		} catch {
			if (active.current) setSubmitError('We could not confirm check-in. Refresh the appointment before trying again to avoid a duplicate record.');
		} finally {
			clearTimeout(timeout);
			submission.current = null;
			if (active.current) setSubmitting(false);
		}
	}

	return { visit, loading, loadError, location, locating, locationError, manualConfirmed, setManualConfirmed, submitting, submitError, receipt, alreadyCheckedIn, visitCompleted, locationFresh, canCheckIn, isOnline, requestLocation, checkIn, reloadVisit: () => setReload(value => value + 1) };
}

// --- useCheckOut ---
export function useCheckOut() {
	const isOnline = useOnlineStatus();
	const gps = useGeolocation();
	const [visit, setVisit] = useState<CheckInVisit | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState('');
	const [receipt, setReceipt] = useState<CheckOutSession | null>(null);
	const [now, setNow] = useState(0);
	const [reload, setReload] = useState(0);
	const active = useRef(false);
	const submission = useRef<AbortController | null>(null);

	useEffect(() => {
		active.current = true;
		setNow(Date.now());
		const timer = setInterval(() => setNow(Date.now()), 10000);
		return () => { active.current = false; submission.current?.abort(); clearInterval(timer); };
	}, []);

	useEffect(() => {
		if (gps.timestamp !== null) setNow(Date.now());
	}, [gps.timestamp]);

	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		setLoading(true);
		setLoadError('');
		setSubmitError('');
		const sessionIds = new URLSearchParams(window.location.search).getAll('session_id');
		if (sessionIds.length > 1 || (sessionIds.length === 1 && !sessionIds[0].trim())) {
			setLoadError('This visit link is incomplete. Please return to your schedule.');
			setLoading(false);
			return;
		}
		fetchCheckOutVisit(sessionIds[0] || null, controller.signal)
			.then(data => { if (!disposed) { setVisit(data); setReceipt(null); setNow(Date.now()); } })
			.catch(() => { if (!disposed) setLoadError('We could not load this visit. Please check your connection and try again.'); })
			.finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [reload]);

	const location = gps.latitude !== null && gps.longitude !== null && gps.accuracy !== null && gps.timestamp !== null
		&& [gps.latitude, gps.longitude, gps.accuracy, gps.timestamp].every(Number.isFinite)
		&& Math.abs(gps.latitude) <= 90 && Math.abs(gps.longitude) <= 180 && gps.accuracy >= 0
		? { latitude: gps.latitude, longitude: gps.longitude, accuracy: gps.accuracy, timestamp: gps.timestamp } : null;
	const locationFresh = Boolean(location && now - location.timestamp <= 120000 && now >= location.timestamp - 10000);
	const alreadyCheckedOut = Boolean(receipt || visit?.check_out_at || visit?.status === 'completed');
	const startTime = visit?.check_in_at ? Date.parse(visit.check_in_at) : NaN;
	const endTime = visit?.check_out_at ? Date.parse(visit.check_out_at) : now;
	const durationMinutes = Number.isFinite(startTime) && Number.isFinite(endTime) && endTime >= startTime ? Math.floor((endTime - startTime) / 60000) : null;
	const canCheckOut = Boolean(visit?.status === 'in_progress' && Number.isFinite(startTime) && startTime <= Date.now() && !alreadyCheckedOut && !loading && !loadError && !submitting && !submitError && !gps.loading && !gps.error && locationFresh && isOnline);

	async function checkOut() {
		if (!canCheckOut || !visit || !location || submission.current) return;
		const fixAge = Date.now() - location.timestamp;
		if (fixAge > 120000 || fixAge < -10000) { setNow(Date.now()); return; }
		const controller = new AbortController();
		submission.current = controller;
		const timeout = setTimeout(() => controller.abort(), 20000);
		setSubmitting(true);
		setSubmitError('');
		try {
			const result = await submitCheckOut(visit.id, { latitude: location.latitude, longitude: location.longitude }, controller.signal);
			if (active.current) {
				setReceipt(result);
				setVisit(previous => previous ? { ...previous, ...result, status: result.status.toLowerCase() } : previous);
			}
		} catch {
			if (active.current) setSubmitError('We could not confirm check-out. Refresh the visit before trying again to avoid a duplicate record.');
		} finally {
			clearTimeout(timeout);
			submission.current = null;
			if (active.current) setSubmitting(false);
		}
	}

	return {
		visit, loading, loadError, location, locationFresh, alreadyCheckedOut, durationMinutes,
		submitting, submitError, receipt, canCheckOut, isOnline,
		locating: gps.loading, locationError: gps.error || (gps.latitude !== null && !location ? 'Your location could not be read. Please refresh it.' : ''),
		requestLocation: gps.getCurrentPosition, checkOut,
		reloadVisit: () => { if (!submission.current) setReload(value => value + 1); },
	};
}

// --- usePointOfCare ---
export type CareTab = 'tasks' | 'assessments' | 'medication' | 'history';
export type AssessmentAction = { instrument: InstrumentId; state: AssessmentState };
type CareContext = Awaited<ReturnType<typeof fetchCareContext>>;

export function usePointOfCare(routeSessionId?: string) {
	const isOnline = useOnlineStatus();
	const [context, setContext] = useState<CareContext | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [refresh, setRefresh] = useState(0);
	const [tab, setTab] = useState<CareTab>('assessments');
	const [action, setAction] = useState<AssessmentAction | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState('');
	const [announcement, setAnnouncement] = useState('');
	const saveController = useRef<AbortController | null>(null);
	const mounted = useRef(false);

	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; saveController.current?.abort(); };
	}, []);

	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		setLoading(true);
		setError('');
		const sessionIds = routeSessionId !== undefined ? [routeSessionId] : new URLSearchParams(window.location.search).getAll('session_id');
		if (sessionIds.length > 1 || (sessionIds.length === 1 && !sessionIds[0].trim())) {
			setError('This visit link is incomplete. Please return to your schedule.');
			setLoading(false);
			return;
		}
		fetchCareContext(sessionIds[0] || null, controller.signal)
			.then(data => { if (!disposed) { setContext(data); setSaveError(''); } })
			.catch(() => { if (!disposed) setError('This visit could not be loaded. Check your connection and try again.'); })
			.finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [refresh, routeSessionId]);

	const visit = context?.visit;
	const sessionRecords = (context?.assessments || []).filter(record => record.session_id === visit?.id);
	const currentRecords: Partial<Record<InstrumentId, AssessmentRecord>> = {};
	for (const record of sessionRecords) if (!currentRecords[record.assessment_type]) currentRecords[record.assessment_type] = record;
	const resolvedCount = (['tug', 'cmai', 'braden'] as InstrumentId[]).filter(id => ['completed', 'refused'].includes(currentRecords[id]?.state || '')).length;
	const canRecord = Boolean(visit?.status === 'in_progress' && isOnline && !loading && !error && !context?.assessmentError && !saving && !saveError);

	function openAction(instrument: InstrumentId, state: AssessmentState) {
		if (!canRecord) return;
		setAnnouncement('');
		setAction({ instrument, state });
	}

	function closeAction() { if (!saveController.current) setAction(null); }

	async function recordAssessment(values: Pick<AssessmentEntry, 'refused_reason' | 'tug' | 'cmai' | 'braden'>) {
		if (!canRecord || !visit || !action || saveController.current) return;
		const controller = new AbortController();
		saveController.current = controller;
		const timeout = setTimeout(() => controller.abort(), 20000);
		setSaving(true);
		setSaveError('');
		try {
			const record = await saveAssessment({ ...values, session_id: visit.id, client_id: visit.client_id, assessment_type: action.instrument, state: action.state, ...(action.state === 'completed' ? { administered_at: new Date().toISOString() } : {}) }, controller.signal);
			if (mounted.current) {
				setContext(previous => previous ? { ...previous, assessments: [record, ...previous.assessments] } : previous);
				setAnnouncement(`${action.instrument.toUpperCase()} ${action.state === 'completed' ? 'completed' : action.state === 'refused' ? 'refusal recorded' : 'marked pending'}.`);
				setAction(null);
			}
		} catch {
			if (mounted.current) { setAction(null); setSaveError('We could not confirm this record was saved. Refresh the visit before recording again.'); }
		} finally {
			clearTimeout(timeout);
			saveController.current = null;
			if (mounted.current) setSaving(false);
		}
	}

	return { context, visit, loading, error, tab, setTab, action, saving, saveError, announcement, isOnline, canRecord, currentRecords, resolvedCount, openAction, closeAction, recordAssessment, refreshVisit: () => { if (!saveController.current) setRefresh(value => value + 1); } };
}

// --- useVisitShell ---
export function useVisitShell(sessionId: string) {
	const care = usePointOfCare(sessionId);
	const [patient, setPatient] = useState<ShellPatient | null>(null);
	const [patientError, setPatientError] = useState('');
	const [queue, setQueue] = useState<QueueVisit[]>([]);
	const [queueError, setQueueError] = useState('');
	const [history, setHistory] = useState<HistoricalVisit[]>([]);
	const [historyError, setHistoryError] = useState('');
	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyReload, setHistoryReload] = useState(0);
	const [queueLoading, setQueueLoading] = useState(true);
	const [now, setNow] = useState<Date | null>(null);
	const clientId = care.visit?.client_id;

	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		setNow(new Date());
		fetchShellQueue(controller.signal, sessionId).then(visits => { if (!disposed) setQueue(visits); }).catch(() => { if (!disposed) setQueueError('Patient queue unavailable. Return to your schedule to choose another visit.'); }).finally(() => { if (!disposed) setQueueLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [sessionId]);

	useEffect(() => {
		// Wait until the visit has loaded (clientId known) before fetching the patient.
		if (!clientId) return;
		let disposed = false;
		const controller = new AbortController();
		setPatient(null);
		setPatientError('');
		// fetchShellPatient calls GET /scheduling/sessions/{session_id}/client, so it
		// needs the SESSION id. Passing clientId here made every lookup 404.
		fetchShellPatient(sessionId, controller.signal).then(data => { if (!disposed) setPatient(data); }).catch(() => { if (!disposed) setPatientError('Additional patient details could not be loaded.'); });
		return () => { disposed = true; controller.abort(); };
	}, [clientId, sessionId]);

	useEffect(() => {
		if (!clientId || care.tab !== 'history') return;
		let disposed = false;
		const controller = new AbortController();
		setHistoryLoading(true);
		setHistoryError('');
		fetchVisitHistory(clientId, controller.signal).then(data => { if (!disposed) setHistory(data); }).catch(() => { if (!disposed) setHistoryError('Visit history could not be loaded. Please try again when connected.'); }).finally(() => { if (!disposed) setHistoryLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [clientId, care.tab, historyReload]);

	const index = queue.findIndex(visit => visit.id === sessionId);
	return { care, patient, patientError, queueError, queueLoading, now, history, historyLoading, historyError,
		previous: index > 0 ? queue[index - 1] : undefined, next: index >= 0 ? queue[index + 1] : undefined,
		position: index >= 0 ? `${index + 1} of ${queue.length}` : null,
		refreshHistory: () => setHistoryReload(value => value + 1),
	};
}

// --- useVisitSummary ---
type SummaryData = Awaited<ReturnType<typeof fetchVisitSummary>>;

export function useVisitSummary() {
	const isOnline = useOnlineStatus();
	const [data, setData] = useState<SummaryData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [refresh, setRefresh] = useState(0);
	const [sending, setSending] = useState(false);
	const [sendError, setSendError] = useState('');
	const [receipt, setReceipt] = useState<FamilyShareReceipt | null>(null);
	const mounted = useRef(false);
	const sendController = useRef<AbortController | null>(null);
	const requestKey = useRef<{ snapshot: string; key: string } | null>(null);

	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; sendController.current?.abort(); };
	}, []);

	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		setLoading(true);
		setError('');
		setSendError('');
		const sessionIds = new URLSearchParams(window.location.search).getAll('session_id');
		if (sessionIds.length > 1 || (sessionIds.length === 1 && !sessionIds[0].trim())) {
			setError('This summary link is incomplete. Please return to your schedule.');
			setLoading(false);
			return;
		}
		fetchVisitSummary(sessionIds[0] || null, controller.signal)
			.then(summary => { if (!disposed) { setData(summary); setReceipt(summary.content?.share_receipt || null); } })
			.catch(() => { if (!disposed) setError('This visit summary could not be loaded. Please check your connection and try again.'); })
			.finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [refresh]);

	const visit = data?.visit;
	const checkIn = visit?.check_in_at ? Date.parse(visit.check_in_at) : NaN;
	const checkOut = visit?.check_out_at ? Date.parse(visit.check_out_at) : NaN;
	const durationMinutes = Number.isFinite(checkIn) && Number.isFinite(checkOut) && checkOut >= checkIn ? Math.floor((checkOut - checkIn) / 60000) : null;
	const completed = visit?.status === 'completed' && durationMinutes !== null;
	const canSend = Boolean(completed && data?.content?.can_share && data.content.authorized_recipient_count > 0 && !loading && !error && !sending && !sendError && !receipt && isOnline);

	async function sendToFamily() {
		const content = data?.content;
		if (!canSend || !content || sendController.current) return;
		const snapshot = JSON.stringify([content.session_id, content.id, content.version]);
		if (requestKey.current?.snapshot !== snapshot) requestKey.current = { snapshot, key: crypto.randomUUID() };
		const controller = new AbortController();
		sendController.current = controller;
		const timeout = setTimeout(() => controller.abort(), 20000);
		setSending(true);
		setSendError('');
		try {
			const result = await sendSummaryToFamily(content, requestKey.current.key, controller.signal);
			if (mounted.current) setReceipt(result);
		} catch {
			if (mounted.current) setSendError('We could not confirm this summary was sent. Refresh its sharing status before trying again.');
		} finally {
			clearTimeout(timeout);
			sendController.current = null;
			if (mounted.current) setSending(false);
		}
	}

	return { data, visit, loading, error, durationMinutes, completed, isOnline, sending, sendError, receipt, canSend, sendToFamily, refreshSummary: () => { if (!sendController.current) setRefresh(value => value + 1); } };
}
