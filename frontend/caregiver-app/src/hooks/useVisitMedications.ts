'use client';

import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { fetchVisitMedications, recordMedication, type MedicationOutcome, type VisitMedication } from '@/services/visitMedications';

export type MedicationFilter = 'all' | 'pending' | MedicationOutcome;
export type MedicationSort = 'window' | 'name' | 'status';

export function useVisitMedications(sessionId: string) {
	const isOnline = useOnlineStatus();
	const [data, setData] = useState<Awaited<ReturnType<typeof fetchVisitMedications>> | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [reload, setReload] = useState(0);
	const [filter, setFilter] = useState<MedicationFilter>('all');
	const [sort, setSort] = useState<MedicationSort>('window');
	const [action, setAction] = useState<{ medication: VisitMedication; status: MedicationOutcome } | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState('');
	const [announcement, setAnnouncement] = useState('');
	const [calendarOpen, setCalendarOpen] = useState(false);
	const lock = useRef<AbortController | null>(null);
	const active = useRef(false);
	useEffect(() => { active.current = true; return () => { active.current = false; lock.current?.abort(); }; }, []);
	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		setLoading(true); setError('');
		fetchVisitMedications(sessionId, controller.signal).then(result => { if (!disposed) { setData(result); setSaveError(''); } }).catch(() => { if (!disposed) setError('The medication list could not be loaded. Please refresh when connected.'); }).finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [sessionId, reload]);
	const latest = new Map<string, NonNullable<typeof data>['records'][number]>();
	for (const record of data?.records || []) if (!latest.has(record.medication_id)) latest.set(record.medication_id, record);
	const order = { pending: 0, administered: 1, missed: 2, refused: 3 };
	const medications = (data?.medications || []).filter(medication => filter === 'all' || (data?.recordsAvailable && (latest.get(medication.id)?.status || 'pending') === filter)).sort((first, second) => {
		const difference = sort === 'window' ? first.window_start_local.localeCompare(second.window_start_local) : sort === 'status' ? order[latest.get(first.id)?.status || 'pending'] - order[latest.get(second.id)?.status || 'pending'] : 0;
		return difference || first.name.localeCompare(second.name) || first.id.localeCompare(second.id);
	});
	const canRecord = Boolean(data?.visit.status === 'in_progress' && data.recordsAvailable && !data.isDemo && !loading && !error && !saving && !saveError && isOnline);
	async function save(values: { reason?: string; glucose?: number; administeredAt?: string }) {
		if (!canRecord || !action || !data || lock.current || latest.has(action.medication.id)) return;
		const controller = new AbortController(); lock.current = controller;
		const timeout = setTimeout(() => controller.abort(), 20000);
		setSaving(true); setSaveError('');
		try {
			const record = await recordMedication(sessionId, action.medication, action.status, values, controller.signal);
			if (active.current) { setData(previous => previous ? { ...previous, records: [record, ...previous.records] } : previous); setAnnouncement(`${action.medication.name}: ${action.status} recorded.`); setAction(null); }
		} catch { if (active.current) { setAction(null); setSaveError('This medication record could not be confirmed. Refresh the visit before recording again.'); } }
		finally { clearTimeout(timeout); lock.current = null; if (active.current) setSaving(false); }
	}
	return { data, medications, latest, loading, error, isOnline, filter, setFilter, sort, setSort, action, saving, saveError, announcement, canRecord, calendarOpen, setCalendarOpen,
		openAction: (medication: VisitMedication, status: MedicationOutcome) => { if (canRecord && !latest.has(medication.id)) setAction({ medication, status }); },
		closeAction: () => { if (!lock.current) setAction(null); }, save,
		refreshList: () => { if (!lock.current) setReload(value => value + 1); } };
}