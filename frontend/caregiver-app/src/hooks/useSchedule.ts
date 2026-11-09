'use client';

import { useEffect, useState, useRef } from 'react';
import { useOnlineStatus } from './useDevice';
import { fetchTodaySchedule, type QueueVisit, sortPatientQueue, type QueueSort, fetchAdminDashboard } from '../services/visits';
import { acuityCode, diagnosisStyle, normalizeCode } from '../components/dashboard/Dashboard';

// --- useSchedule ---
export function useSchedule() {
	const isOnline = useOnlineStatus();
	const [visits, setVisits] = useState<QueueVisit[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [clientWarning, setClientWarning] = useState(false);
	const [refresh, setRefresh] = useState(0);
	const [now, setNow] = useState<Date | null>(null);
	const [statusFilter, setStatusFilter] = useState('all');
	const [sort, setSort] = useState<QueueSort>('time');

	useEffect(() => {
		setNow(new Date());
		const timer = setInterval(() => setNow(new Date()), 60000);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		if (!isOnline) { setLoading(false); return; }
		let disposed = false;
		const controller = new AbortController();
		async function loadSchedule() {
			setLoading(true);
			setError('');
			try {
				const schedule = await fetchTodaySchedule(controller.signal);
				if (disposed) return;
				setClientWarning(schedule.clientWarning);
				setVisits(schedule.visits);
				setNow(new Date());
			} catch {
				if (!disposed) setError('Your schedule could not be updated. Please try again when you have a connection.');
			} finally { if (!disposed) setLoading(false); }
		}
		loadSchedule();
		return () => { disposed = true; controller.abort(); };
	}, [isOnline, refresh]);

	const unfinished = visits.filter(visit => ['scheduled', 'in_progress'].includes(visit.status));
	const currentTime = now?.getTime() ?? 0;
	const priority = unfinished.find(visit => visit.status === 'in_progress')
		|| unfinished.find(visit => Date.parse(visit.scheduled_start) <= currentTime && Date.parse(visit.scheduled_end) > currentTime)
		|| unfinished[0];
	const dateLabel = now ? new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(now) : 'Today';
	const visibleVisits = visits.filter(visit => statusFilter === 'all' || (statusFilter === 'remaining' ? ['scheduled', 'in_progress'].includes(visit.status) : visit.status === statusFilter));
	const routeAddresses = unfinished.map(visit => visit.client_address).filter(Boolean);
	const routeUrl = routeAddresses.length ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(routeAddresses[routeAddresses.length - 1])}${routeAddresses.length > 1 ? `&waypoints=${encodeURIComponent(routeAddresses.slice(0, -1).join('|'))}` : ''}` : '';
	const queue = sortPatientQueue(visits, sort, currentTime);

	return {
		isOnline, visits, loading, error, clientWarning, currentTime, priority, dateLabel,
		visibleVisits, routeUrl, statusFilter, setStatusFilter,
		queueVisits: queue.visits, activeId: queue.activeId, sort, setSort,
		refreshSchedule: () => setRefresh(value => value + 1),
	};
}

// --- useAdminDashboard ---
export function useAdminDashboard() {
	const isOnline = useOnlineStatus();
	const [data, setData] = useState<Awaited<ReturnType<typeof fetchAdminDashboard>> | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [reload, setReload] = useState(0);
	const [query, setQuery] = useState('');
	const [diagnosis, setDiagnosis] = useState('all');
	const [acuity, setAcuity] = useState('all');
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [now, setNow] = useState<Date | null>(null);
	const agendaRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		setLoading(true);
		setError('');
		fetchAdminDashboard(controller.signal)
			.then(result => { if (!disposed) { setData(result); setNow(new Date()); } })
			.catch(() => { if (!disposed) setError('The dashboard could not be refreshed. Check your connection and try again.'); })
			.finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [reload]);

	const dashboard = data?.authorized ? data : null;
	const patients = dashboard?.patients || [];
	const sessions = dashboard?.sessions || [];
	const caregivers = new Map((dashboard?.caregivers || []).map(caregiver => [caregiver.user_id, caregiver]));
	const appointmentsByPatient = new Map<string, typeof sessions>();
	for (const session of sessions) appointmentsByPatient.set(session.client_id, [...(appointmentsByPatient.get(session.client_id) || []), session]);
	const representative = new Map(patients.map(patient => {
		const appointments = appointmentsByPatient.get(patient.id) || [];
		return [patient.id, appointments.find(session => ['in_progress', 'in_service'].includes(normalizeCode(session.status))) || appointments.find(session => normalizeCode(session.status) === 'scheduled') || appointments.at(-1)];
	}));
	const search = query.trim().toLowerCase();
	const filteredPatients = patients.filter(patient => {
		const caregiver = caregivers.get(representative.get(patient.id)?.caregiver_id || '');
		return (diagnosis === 'all' || diagnosisStyle(patient.diagnosis_category).label === diagnosis)
			&& (acuity === 'all' || acuityCode(patient.acuity_tier) === acuity)
			&& (!search || `${patient.full_name} ${diagnosisStyle(patient.diagnosis_category).label} ${caregiver?.full_name || ''}`.toLowerCase().includes(search));
	});
	const selectedPatient = filteredPatients.find(patient => patient.id === selectedId);
	const visiblePatientIds = new Set(filteredPatients.map(patient => patient.id));
	const filtersActive = Boolean(search || diagnosis !== 'all' || acuity !== 'all');
	const visibleSessions = sessions.filter(session => (!filtersActive || visiblePatientIds.has(session.client_id)) && (!selectedPatient || session.client_id === selectedPatient.id));
	const flaggedIds = dashboard?.flaggedPatientIds;
	const activePatientIds = new Set(patients.map(patient => patient.id));
	const flagCount = flaggedIds && dashboard?.patients ? flaggedIds.filter(id => activePatientIds.has(id)).length : null;
	const diagnosisOptions = [...new Set(patients.map(patient => diagnosisStyle(patient.diagnosis_category).label))].sort();

	function selectPatient(id: string) {
		setSelectedId(id);
		agendaRef.current?.scrollTo({ top: 0 });
		if (window.matchMedia('(max-width: 1023px)').matches) agendaRef.current?.closest('section')?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
	}

	return { data, dashboard, loading, error, isOnline, now, patients, sessions, caregivers, representative, filteredPatients, visibleSessions, selectedPatient, diagnosisOptions, flagCount, flaggedIds: new Set(flaggedIds || []), agendaRef, query, diagnosis, acuity, selectPatient,
		setQuery: (value: string) => { setQuery(value); setSelectedId(null); }, setDiagnosis: (value: string) => { setDiagnosis(value); setSelectedId(null); }, setAcuity: (value: string) => { setAcuity(value); setSelectedId(null); },
		clearSelection: () => { setSelectedId(null); agendaRef.current?.scrollTo({ top: 0 }); }, refreshDashboard: () => setReload(value => value + 1) };
}

