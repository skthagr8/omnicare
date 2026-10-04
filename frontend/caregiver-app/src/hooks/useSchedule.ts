'use client';

import { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { fetchTodaySchedule, type QueueVisit } from '@/services/schedule';
import { sortPatientQueue, type QueueSort } from '@/services/patientQueue';

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