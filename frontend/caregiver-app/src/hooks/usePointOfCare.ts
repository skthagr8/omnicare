'use client';

import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { fetchCareContext, saveAssessment, type AssessmentEntry, type AssessmentRecord, type AssessmentState, type InstrumentId } from '@/services/pointOfCare';

export type CareTab = 'tasks' | 'assessments' | 'medication' | 'history';
export type AssessmentAction = { instrument: InstrumentId; state: AssessmentState };
type CareContext = Awaited<ReturnType<typeof fetchCareContext>>;

export function usePointOfCare(routeSessionId?: string, allowDemo = false) {
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
		fetchCareContext(sessionIds[0] || null, controller.signal, allowDemo)
			.then(data => { if (!disposed) { setContext(data); setSaveError(''); } })
			.catch(() => { if (!disposed) setError('This visit could not be loaded. Check your connection and try again.'); })
			.finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [refresh, routeSessionId, allowDemo]);

	const visit = context?.visit;
	const sessionRecords = (context?.assessments || []).filter(record => record.session_id === visit?.id);
	const currentRecords: Partial<Record<InstrumentId, AssessmentRecord>> = {};
	for (const record of sessionRecords) if (!currentRecords[record.assessment_type]) currentRecords[record.assessment_type] = record;
	const resolvedCount = (['tug', 'cmai', 'braden'] as InstrumentId[]).filter(id => ['completed', 'refused'].includes(currentRecords[id]?.state || '')).length;
	const canRecord = Boolean(!visit?.is_demo && visit?.status === 'in_progress' && isOnline && !loading && !error && !context?.assessmentError && !saving && !saveError);

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