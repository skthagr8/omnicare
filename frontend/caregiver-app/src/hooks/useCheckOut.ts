'use client';

import { useEffect, useRef, useState } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { CheckInVisit } from '@/services/checkIn';
import { fetchCheckOutVisit, submitCheckOut, type CheckOutSession } from '@/services/checkOut';

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
		fetchCheckOutVisit(sessionIds[0] || null, controller.signal, new URLSearchParams(window.location.search).get('demo') === '1')
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
	const canCheckOut = Boolean(!visit?.is_demo && visit?.status === 'in_progress' && Number.isFinite(startTime) && startTime <= Date.now() && !alreadyCheckedOut && !loading && !loadError && !submitting && !submitError && !gps.loading && !gps.error && locationFresh && isOnline);

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