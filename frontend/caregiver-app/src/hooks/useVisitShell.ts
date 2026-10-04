'use client';

import { useEffect, useState } from 'react';
import { usePointOfCare } from '@/hooks/usePointOfCare';
import { fetchShellPatient, fetchShellQueue, fetchVisitHistory, type HistoricalVisit, type ShellPatient } from '@/services/visitShell';
import type { QueueVisit } from '@/services/schedule';
import { VISIT_DEMO_MODE } from '@/services/visitDemo';

export function useVisitShell(sessionId: string) {
	const care = usePointOfCare(sessionId, true);
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
		if (!clientId) return;
		let disposed = false;
		const controller = new AbortController();
		setPatient(null);
		setPatientError('');
		fetchShellPatient(clientId, controller.signal).then(data => { if (!disposed) setPatient(data); }).catch(() => { if (!disposed) setPatientError('Additional patient details could not be loaded.'); });
		return () => { disposed = true; controller.abort(); };
	}, [clientId]);

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
		isDemo: Boolean(care.visit?.is_demo && VISIT_DEMO_MODE),
		previous: index > 0 ? queue[index - 1] : undefined, next: index >= 0 ? queue[index + 1] : undefined,
		position: index >= 0 ? `${index + 1} of ${queue.length}` : null,
		refreshHistory: () => setHistoryReload(value => value + 1),
	};
}