'use client';

import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { geolocationService } from '@/services/geolocation';
import { fetchCheckInVisit, submitCheckIn, type CheckInSession, type CheckInVisit, type Coordinates } from '@/services/checkIn';

type LocationFix = Coordinates & { accuracy: number; timestamp: number };

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
		fetchCheckInVisit(values[0] || null, controller.signal, new URLSearchParams(window.location.search).get('demo') === '1')
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

	const alreadyCheckedIn = Boolean(receipt || visit?.check_in_at || visit?.status === 'in_progress');
	const locationFresh = Boolean(location && now - location.timestamp <= 120000 && now >= location.timestamp - 10000);
	const canCheckIn = Boolean(!visit?.is_demo && visit?.status === 'scheduled' && !alreadyCheckedIn && !loading && !loadError && !submitting && !submitError && !locating && !locationError && locationFresh && manualConfirmed && isOnline);

	async function checkIn() {
		if (!canCheckIn || !visit || !location || submission.current) return;
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

	return { visit, loading, loadError, location, locating, locationError, manualConfirmed, setManualConfirmed, submitting, submitError, receipt, alreadyCheckedIn, locationFresh, canCheckIn, isOnline, requestLocation, checkIn, reloadVisit: () => setReload(value => value + 1) };
}