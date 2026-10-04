'use client';

import { useEffect, useState } from 'react';
import { currentWeekStart, fetchWeeklyMedications, shiftWeek, type WeeklyMedicationSchedule } from '@/services/visitMedications';

export function useWeeklyMedications(clientId: string) {
	const [weekStart, setWeekStart] = useState(currentWeekStart);
	const [data, setData] = useState<WeeklyMedicationSchedule | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [reload, setReload] = useState(0);
	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		setLoading(true); setError(''); setData(null);
		fetchWeeklyMedications(clientId, weekStart, controller.signal).then(result => { if (!disposed) setData(result); }).catch(() => { if (!disposed) setError('The weekly medication schedule and administration history are unavailable. No adherence conclusion can be made.'); }).finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [clientId, weekStart, reload]);
	return { weekStart, data, loading, error, previousWeek: () => setWeekStart(value => shiftWeek(value, -1)), nextWeek: () => setWeekStart(value => shiftWeek(value, 1)), refresh: () => setReload(value => value + 1) };
}