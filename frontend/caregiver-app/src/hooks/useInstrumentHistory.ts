'use client';

import { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { fetchInstrumentHistory } from '@/services/instrumentHistory';
import { VISIT_DEMO_MODE } from '@/services/visitDemo';

export function useInstrumentHistory(sessionId: string) {
	const isOnline = useOnlineStatus();
	const [data, setData] = useState<Awaited<ReturnType<typeof fetchInstrumentHistory>> | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [reload, setReload] = useState(0);
	const [instrument, setInstrument] = useState('');
	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		const values = new URLSearchParams(window.location.search).getAll('instrument');
		const selected = values.length === 0 ? 'tug' : values[0]?.trim().toLowerCase();
		setLoading(true);
		setError('');
		if (values.length > 1 || !selected || !/^[a-z0-9_-]{1,150}$/.test(selected)) {
			setError('This instrument history link is incomplete. Please return to the assessment list.');
			setLoading(false);
			return;
		}
		setInstrument(selected);
		fetchInstrumentHistory(sessionId, selected, controller.signal).then(result => { if (!disposed) setData(result); }).catch(() => { if (!disposed) setError('Instrument history could not be loaded. Please check your connection and try again.'); }).finally(() => { if (!disposed) setLoading(false); });
		return () => { disposed = true; controller.abort(); };
	}, [sessionId, reload]);
	return { data, loading, error, instrument, isOnline, isDemo: Boolean(data?.isDemo && VISIT_DEMO_MODE), refreshHistory: () => setReload(value => value + 1) };
}