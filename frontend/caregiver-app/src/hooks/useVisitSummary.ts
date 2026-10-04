'use client';

import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { fetchVisitSummary, sendSummaryToFamily, type FamilyShareReceipt } from '@/services/visitSummary';

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