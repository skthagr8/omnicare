'use client';

import { useEffect, useState, useMemo, useCallback, useTransition } from 'react';
import {
	MapPin,
	Navigation,
	ShieldCheck,
	Check,
	Crosshair,
	LoaderCircle,
	RefreshCw,
	Signal,
	WifiOff,
	CheckCircle2,
	AlertTriangle,
	Loader2,
	ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { calculateOSMBoundingBox, type Coordinates, calculateHaversineDistance } from '../../libs/geoUtils';
import { type CheckInVisit, type CheckInSession, fetchCheckInVisit, submitCheckIn } from '../../services/visits';
import { useCheckIn } from '../../hooks/useVisitFlow';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useOnlineStatus } from '../../hooks/useDevice';

// --- CheckInMap ---
type CheckInMapProps = {
  center: Coordinates | null;
  isOnline: boolean;
  isCurrentLocation: boolean;
};

export function CheckInMap({
  center,
  isOnline,
  isCurrentLocation,
}: CheckInMapProps) {
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  const source = useMemo(() => {
    if (!center) return '';
    const bbox = calculateOSMBoundingBox(center);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;
  }, [center]);

  useEffect(() => {
    if (!source) return;
    setMapState('loading');
    const timeout = setTimeout(() => {
      setMapState((state) => (state === 'ready' ? state : 'unavailable'));
    }, 12000);

    return () => clearTimeout(timeout);
  }, [source]);

  return (
    <div className="relative h-full min-h-95 w-full overflow-hidden rounded-3xl bg-[#f6e8dd] shadow-inner">
      {/* Map Iframe */}
      {source && isOnline && (
        <iframe
          key={source}
          title={isCurrentLocation ? 'Map of your current location' : 'Map of the client residence'}
          src={source}
          referrerPolicy="no-referrer"
          tabIndex={-1}
          onLoad={() => setMapState('ready')}
          onError={() => setMapState('unavailable')}
          className="pointer-events-none absolute inset-0 size-full border-0 opacity-85 grayscale-50 saturate-75 transition-opacity duration-300"
        />
      )}

      {/* Fallback & Loading Messages */}
      {(!source || !isOnline || mapState !== 'ready') && (
        <div className="absolute inset-x-5 bottom-12 flex items-center justify-center rounded-2xl bg-white/90 px-4 py-3 text-center text-sm font-medium text-[#334155] shadow-xs backdrop-blur-sm">
          {!isOnline
            ? 'Map unavailable offline'
            : !source
              ? 'Your location will appear here'
              : mapState === 'unavailable'
                ? 'The map could not load. Your GPS location is still available.'
                : 'Loading map...'}
        </div>
      )}

      {/* Center Marker Pin */}
      {center && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          role="img"
          aria-label={isCurrentLocation ? 'Your current location' : 'Client residence location'}
        >
          <span
            aria-hidden="true"
            className="check-in-pin-pulse absolute -inset-4 rounded-full border border-teal/40 bg-teal/20"
          />
          <span className="relative flex size-14 items-center justify-center rounded-full border-4 border-white bg-teal text-white shadow-lg">
            {isCurrentLocation ? (
              <Navigation className="size-6 animate-pulse" />
            ) : (
              <MapPin className="size-6" />
            )}
          </span>
        </div>
      )}

      {/* OpenStreetMap Attribution */}
      {source && isOnline && (
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-3 bottom-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#334155] shadow-xs"
        >
          © OpenStreetMap contributors
        </a>
      )}

      <style jsx>{`
        @keyframes check-in-pin-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.35);
            opacity: 0.2;
          }
        }
        .check-in-pin-pulse {
          animation: check-in-pin-pulse 2.5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .check-in-pin-pulse {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

// --- AppointmentSummary ---
export function AppointmentSummary({ visit, loading, error }: { visit: CheckInVisit | null; loading: boolean; error: string }) {
	return (
		<aside aria-label="Current appointment" className="absolute top-20 right-5 left-5 rounded-2xl border border-white/70 bg-cream/95 p-5 shadow-[0_4px_20px_rgba(36,38,43,0.08)] sm:top-6 sm:right-6 sm:left-auto sm:w-72">
			<div className="mb-4 flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal"><Navigation aria-hidden="true" className="size-4" /></span><div><h1 className="text-sm font-semibold">Current Appointment</h1><p className="mt-0.5 text-[10px] text-[#475569] uppercase tracking-wide">{visit?.check_in_at ? 'Checked in' : 'Arrival confirmation'}</p></div></div>
			{loading ? <p role="status" className="text-sm text-[#475569]">Loading appointment...</p> : visit ? <><p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide">Client name</p><p className="mt-1 text-base font-semibold wrap-anywhere">{visit.clientName}</p><p className="mt-3 text-[10px] font-semibold text-[#475569] uppercase tracking-wide">Destination</p><p className="mt-1 text-sm leading-5 wrap-anywhere text-[#334155]">{visit.address}</p></> : <p className="text-sm leading-6 text-[#475569]">{error ? 'Appointment unavailable' : 'No upcoming appointment'}</p>}
		</aside>
	);
}

// --- CheckInToast ---
export function CheckInToast({ receipt }: { receipt: CheckInSession | null }) {
	return (
		<div role="status" aria-live="polite" aria-atomic="true" className="pointer-events-none fixed right-5 bottom-[max(1rem,env(safe-area-inset-bottom))] left-5 z-50 mx-auto max-w-lg">
			{receipt && <div className={`check-in-toast flex items-center gap-3 rounded-lg border px-5 py-4 text-sm leading-6 shadow-[0_8px_28px_rgba(180,83,9,0.12)] ${receipt.check_in_geofence_verified === false ? 'border-[#fde68a] bg-[#fef3c7] text-[#b45309]' : 'border-[#b6e6df] bg-teal-soft text-[#1b8a7f]'}`}><ShieldCheck aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.5} /><span>{receipt.check_in_geofence_verified === false ? 'Checked in \u2014 location manually verified' : 'Checked in \u2014 your arrival is recorded'}</span></div>}
			<style>{`
				@keyframes check-in-toast-enter { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
				.check-in-toast { animation: check-in-toast-enter .3s ease-out both; }
				@media (prefers-reduced-motion: reduce) { .check-in-toast { animation: none; } }
			`}</style>
		</div>
	);
}

// --- CheckInAction ---
type CheckInActionProps = { checkInState: ReturnType<typeof useCheckIn> };

export function CheckInAction({ checkInState: state }: CheckInActionProps) {
	const accuracy = state.location && state.locationFresh && !state.locationError ? state.location.accuracy <= 50 ? 'high' : 'low' : 'unavailable';
	return (
		<section aria-label="Confirm arrival" className="border-t border-coral-soft bg-cream px-5 pt-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:px-8">
			<div className="mx-auto max-w-xl">
				<p role="status" className="flex items-center justify-center gap-2 text-xs leading-6 text-[#475569]"><Signal aria-hidden="true" className="size-3.5" />Location accuracy: {state.locating ? 'locating...' : accuracy}{state.location && state.locationFresh && !state.locationError && <span>({Math.round(state.location.accuracy)} m)</span>}</p>
				{!state.isOnline && <p role="status" className="mt-2 flex items-center justify-center gap-2 text-xs text-[#475569]"><WifiOff aria-hidden="true" className="size-3.5" />Connect to save your check-in</p>}
				{state.loadError && <div className="mt-3 text-center"><p role="alert" className="text-sm leading-6 text-[#b45309]">{state.loadError}</p><button type="button" disabled={!state.isOnline || state.loading} onClick={state.reloadVisit} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal disabled:opacity-50"><RefreshCw aria-hidden="true" className="size-4" />Retry appointment</button></div>}
				{state.visit && !state.alreadyCheckedIn && <>
					<p className="mt-3 text-center text-sm leading-6 text-[#334155]">Confirm your arrival at the client&apos;s residence. Your check-in will be timestamped for the visit record.</p>
					<div className="mt-3 text-center"><button type="button" disabled={state.locating || state.submitting} onClick={state.requestLocation} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-teal hover:bg-teal-soft focus-visible:outline-2 focus-visible:outline-teal disabled:opacity-50"><Crosshair aria-hidden="true" className="size-4" />{state.locating ? 'Finding your location...' : state.location ? 'Refresh location' : 'Use my location'}</button></div>
					{state.locationError && <p role="alert" className="mt-2 text-center text-sm leading-6 text-[#b45309]">{state.locationError}</p>}
					{state.location && !state.locationFresh && !state.locating && <p role="status" className="mt-2 text-center text-xs text-[#475569]">Please refresh your location before checking in.</p>}
					<label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-3 text-sm leading-6 text-[#334155]"><input type="checkbox" checked={state.manualConfirmed} disabled={state.submitting} onChange={event => state.setManualConfirmed(event.target.checked)} className="size-5 shrink-0 accent-teal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal" /><span>I confirm I am at this client&apos;s residence.</span></label>
				</>}
				{state.submitError && <div className="mt-3 text-center"><p role="alert" className="text-sm leading-6 text-[#b45309]">{state.submitError}</p><button type="button" onClick={state.reloadVisit} disabled={state.loading || !state.isOnline} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal"><RefreshCw aria-hidden="true" className="size-4" />Refresh appointment</button></div>}
				<button type="button" onClick={state.checkIn} disabled={!state.canCheckIn} className="mt-4 flex min-h-18 w-full items-center justify-center gap-3 rounded-2xl bg-teal px-6 py-5 text-lg font-semibold text-white shadow-[0_4px_0_#1b8a7f,0_8px_18px_rgba(36,115,82,0.12)] transition-[translate,box-shadow,background-color] duration-150 enabled:hover:bg-[#1b8a7f] focus-visible:outline-2 focus-visible:outline-offset-6 focus-visible:outline-teal enabled:active:translate-y-0.5 enabled:active:shadow-[0_2px_0_#1b8a7f] disabled:cursor-not-allowed disabled:bg-[#475569] disabled:shadow-none motion-reduce:transition-none">{state.submitting ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /> : state.alreadyCheckedIn ? <Check aria-hidden="true" className="size-5" /> : <ShieldCheck aria-hidden="true" className="size-5" />}{state.submitting ? 'Checking in...' : state.alreadyCheckedIn ? 'Checked In' : 'Check In'}</button>
				{state.alreadyCheckedIn && <p className="mt-3 text-center text-sm leading-6 text-[#334155]">Your arrival is recorded. <Link href="/schedules" className="font-semibold text-teal underline underline-offset-4">Back to schedule</Link></p>}
			</div>
		</section>
	);
}

// --- CheckInWorkflow ---
const GEOFENCE_RADIUS_METERS = 100; // Client proximity allowance threshold

export function CheckInWorkflow({ sessionId }: { sessionId: string | null }) {
  const isOnline = useOnlineStatus();
  const geo = useGeolocation();
  
  const [visit, setVisit] = useState<CheckInVisit | null>(null);
  const [session, setSession] = useState<CheckInSession | null>(null);
  const [loadingVisit, setLoadingVisit] = useState(true);
  const [visitError, setVisitError] = useState<string | null>(null);
  
  const [activeView, setActiveView] = useState<'caregiver' | 'client'>('caregiver');
  const [isSubmitting, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkInSuccess, setCheckInSuccess] = useState(false);

  // Load Visit Details from Backend
  const loadVisitData = useCallback(async () => {
    setLoadingVisit(true);
    setVisitError(null);
    const controller = new AbortController();

    try {
      const data = await fetchCheckInVisit(sessionId, controller.signal);
      if (!data) {
        setVisitError('No active or scheduled visit session found.');
      } else {
        setVisit(data);
        setSession(data);
      }
    } catch (err) {
      setVisitError('Failed to load visit details. Check server connection.');
    } finally {
      setLoadingVisit(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadVisitData();
  }, [loadVisitData]);

  // Request browser location on component mount
  useEffect(() => {
    geo.getCurrentPosition();
  }, [geo.getCurrentPosition]);

  // Compute live proximity distance
  const currentDistance =
    geo.latitude && geo.longitude && visit?.destination
      ? calculateHaversineDistance(
          { latitude: geo.latitude, longitude: geo.longitude },
          visit.destination
        )
      : null;

  const isWithinGeofence =
    currentDistance !== null && currentDistance <= GEOFENCE_RADIUS_METERS;

  // Handle Submission Handler
  const handleConfirmCheckIn = () => {
    if (!session || !geo.latitude || !geo.longitude) return;

    setSubmitError(null);
    startTransition(async () => {
      try {
        const controller = new AbortController();
        const updatedSession = await submitCheckIn(
          session.id,
          { latitude: geo.latitude!, longitude: geo.longitude! },
          controller.signal
        );

        setSession(updatedSession);
        setCheckInSuccess(true);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : 'Failed to submit check-in verification.'
        );
      }
    });
  };

  if (loadingVisit) {
    return (
      <div className="flex h-96 w-full items-center justify-center rounded-3xl border border-coral-soft bg-white p-8 shadow-xs">
        <div className="flex flex-col items-center gap-3 text-teal">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-base font-semibold">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (visitError || !visit) {
    return (
      <div className="rounded-3xl border border-[#fecdd3] bg-[#fff1f2] p-6 text-[#be123c]">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-6 shrink-0" />
          <h3 className="text-lg font-semibold">Visit Session Error</h3>
        </div>
        <p className="mt-2 text-sm">{visitError || 'Unable to retrieve visit record.'}</p>
        <button
          onClick={loadVisitData}
          className="mt-4 flex items-center gap-2 rounded-xl bg-[#be123c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#be123c]"
        >
          <RefreshCw className="size-4" /> Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Card */}
      <div className="rounded-3xl border border-coral-soft bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-semibold tracking-wider text-teal uppercase">
              Caregiver Visit Check-In
            </span>
            <h1 className="mt-1 text-2xl font-semibold text-[#115e56] sm:text-3xl">
              {visit.clientName}
            </h1>
            <p className="mt-1 text-sm text-[#334155]">{visit.address}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                session?.check_in_at
                  ? 'bg-teal-soft text-teal'
                  : 'bg-[#fef3c7] text-[#b45309]'
              }`}
            >
              <CheckCircle2 className="size-4" />
              {session?.check_in_at ? 'Checked In' : 'Pending Check-In'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Map & Location Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
     {/* Map View Area */}
        <div className="relative min-h-[380px] lg:col-span-7">
          <CheckInMap
            center={
              activeView === 'caregiver'
                ? geo.latitude && geo.longitude
                  ? { latitude: geo.latitude, longitude: geo.longitude }
                  : null
                : visit.destination
            }
            isOnline={isOnline}
            isCurrentLocation={activeView === 'caregiver'}
          />

          {/* Toggle Map View Controls */}
          <div className="absolute top-4 left-4 z-10 flex gap-1 rounded-2xl bg-white/90 p-1.5 shadow-md backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveView('caregiver')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                activeView === 'caregiver'
                  ? 'bg-teal text-white'
                  : 'text-[#334155] hover:bg-teal-soft'
              }`}
            >
              <Navigation className="size-3.5" /> My Live Location
            </button>
            <button
              type="button"
              onClick={() => setActiveView('client')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                activeView === 'client'
                  ? 'bg-teal text-white'
                  : 'text-[#334155] hover:bg-teal-soft'
              }`}
            >
              <MapPin className="size-3.5" /> Client Residence
            </button>
          </div>
        </div>

        {/* Verification Status Sidebar */}
        <div className="flex flex-col justify-between space-y-6 rounded-3xl border border-coral-soft bg-white p-6 shadow-xs lg:col-span-5">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#115e56]">Location Verification</h2>

            {/* Laptop Location Feedback */}
            <div className="rounded-2xl border border-[#f0d9c8]/40 bg-teal-soft p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#115e56]">Browser Geolocation</span>
                <button
                  type="button"
                  onClick={geo.getCurrentPosition}
                  disabled={geo.loading}
                  className="flex items-center gap-1 text-xs font-semibold text-teal hover:underline"
                >
                  <RefreshCw className={`size-3 ${geo.loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {geo.loading ? (
                <p className="mt-2 text-xs text-[#334155]">Acquiring hardware GPS signal...</p>
              ) : geo.error ? (
                <p className="mt-2 text-xs font-semibold text-[#be123c]">{geo.error}</p>
              ) : (
                <div className="mt-2 space-y-1 text-xs text-[#334155]">
                  <p>
                    Lat: <span className="font-mono text-[#115e56]">{geo.latitude?.toFixed(5)}</span>
                  </p>
                  <p>
                    Lon: <span className="font-mono text-[#115e56]">{geo.longitude?.toFixed(5)}</span>
                  </p>
                  <p>
                    Accuracy: ±
                    <span className="font-mono text-[#115e56]">
                      {geo.accuracy ? Math.round(geo.accuracy) : '--'}m
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Proximity / Geofence Calculation Indicator */}
            {visit.destination && currentDistance !== null ? (
              <div
                className={`rounded-2xl border p-4 text-sm ${
                  isWithinGeofence
                    ? 'border-[#f0d9c8] bg-teal-soft text-teal'
                    : 'border-[#fde68a] bg-[#fffbeb] text-[#92400e]'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {isWithinGeofence ? (
                    <ShieldCheck className="size-5 text-teal" />
                  ) : (
                    <ShieldAlert className="size-5 text-[#92400e]" />
                  )}
                  <span>
                    {isWithinGeofence
                      ? 'Within Client Geofence'
                      : 'Outside Direct Geofence Radius'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5">
                  Distance to residence:{' '}
                  <span className="font-semibold">{currentDistance} meters</span> (Threshold:{' '}
                  {GEOFENCE_RADIUS_METERS}m).
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-cream p-4 text-xs text-slate-500">
                Destination coordinates or caregiver position unavailable for distance check.
              </div>
            )}

            {submitError && (
              <div className="rounded-2xl border border-[#fecdd3] bg-[#fff1f2] p-3 text-xs text-[#be123c]">
                {submitError}
              </div>
            )}

            {checkInSuccess && (
              <div className="rounded-2xl border border-coral-soft bg-teal-soft p-3 text-xs font-semibold text-teal">
                ✓ Check-in successfully submitted and recorded!
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleConfirmCheckIn}
            disabled={
              isSubmitting ||
              geo.loading ||
              !geo.latitude ||
              Boolean(session?.check_in_at)
            }
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-teal px-6 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-[#1b8a7f] focus-visible:outline-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-5 animate-spin" /> Confirming...
              </>
            ) : session?.check_in_at ? (
              'Check-in Complete'
            ) : (
              'Confirm Check-In Location'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- check-in page ---
export function CheckInScreen() {
  const {
    visit,
    loading,
    loadError,
    location,
    locating,
    locationError,
    manualConfirmed,
    setManualConfirmed,
    submitting,
    submitError,
    receipt,
    alreadyCheckedIn,
    visitCompleted,
    locationFresh,
    canCheckIn,
    isOnline,
    requestLocation,
    checkIn,
    reloadVisit,
  } = useCheckIn();

  const [activeView, setActiveView] = useState<'caregiver' | 'client'>('caregiver');

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center rounded-3xl border border-coral-soft bg-white">
        <div className="flex flex-col items-center gap-3 text-teal">
          <Loader2 className="size-8 animate-spin" />
          <p className="font-semibold">Loading visit details...</p>
        </div>
      </div>
    );
  }

  // Loaded fine, but there is no visit today to check into or to show.
  if (!loadError && !visit) {
    return (
      <div className="mx-auto max-w-4xl rounded-3xl border border-coral-soft bg-white p-6 text-center shadow-xs sm:p-8">
        <CheckCircle2 aria-hidden="true" className="mx-auto size-8 text-teal" />
        <h1 className="mt-3 text-lg font-semibold text-[#115e56]">No visit to check in</h1>
        <p className="mt-1 text-sm leading-6 text-[#334155]">
          You have no scheduled visits remaining today.
        </p>
        <Link
          href="/schedules"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl border border-coral-soft px-5 text-sm font-semibold text-teal hover:bg-teal-soft"
        >
          Back to schedule
        </Link>
      </div>
    );
  }

  if (loadError || !visit) {
    return (
      <div className="rounded-3xl border border-[#fecdd3] bg-[#fff1f2] p-6 text-[#be123c]">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-6 shrink-0" />
          <h3 className="text-lg font-semibold">Appointment Error</h3>
        </div>
        <p className="mt-2 text-sm">{loadError || 'Unable to load visit record.'}</p>
        <button
          onClick={reloadVisit}
          className="mt-4 flex items-center gap-2 rounded-xl bg-[#be123c] px-4 py-2 text-sm font-semibold text-white"
        >
          <RefreshCw className="size-4" /> Retry
        </button>
      </div>
    );
  }

  // A finished visit cannot be checked into again: show its outcome instead of the controls.
  if (visitCompleted) {
    const formatTime = (value?: string | null) => {
      const time = value ? new Date(value) : null;
      return time && !Number.isNaN(time.getTime())
        ? time.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
        : '—';
    };
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <section
          aria-labelledby="visit-completed-title"
          className="rounded-3xl border border-coral-soft bg-white p-6 shadow-xs sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="text-xs font-semibold text-teal uppercase tracking-wide">Scheduled Visit</span>
              <h1 className="text-2xl font-semibold text-[#115e56]">{visit.clientName}</h1>
              <p className="text-sm text-[#334155]">{visit.address}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-teal-soft px-3 py-1.5 text-xs font-semibold text-teal">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              Visit Completed
            </span>
          </div>

          <div role="status" className="mt-6 flex items-start gap-3 rounded-2xl border border-coral-soft bg-teal-soft p-4">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-teal" />
            <div>
              <h2 id="visit-completed-title" className="text-sm font-semibold text-[#115e56]">
                This visit has already been completed
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#334155]">
                Check-in is closed for this session, so no new arrival can be recorded.
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-coral-soft p-4">
              <dt className="text-xs font-semibold text-[#334155] uppercase tracking-wide">Checked in</dt>
              <dd className="mt-1 font-semibold text-[#115e56]">{formatTime(visit.check_in_at)}</dd>
            </div>
            <div className="rounded-2xl border border-coral-soft p-4">
              <dt className="text-xs font-semibold text-[#334155] uppercase tracking-wide">Checked out</dt>
              <dd className="mt-1 font-semibold text-[#115e56]">{formatTime(visit.check_out_at)}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/visit-summary?session_id=${encodeURIComponent(visit.id)}`}
              className="flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-teal px-6 text-sm font-semibold text-white hover:bg-[#1b8a7f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            >
              View visit summary
            </Link>
            <Link
              href="/schedules"
              className="flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-coral-soft px-6 text-sm font-semibold text-teal hover:bg-teal-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            >
              Back to schedule
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // Active center for the map based on selected view mode
  const currentCaregiverCoords = location ? { latitude: location.latitude, longitude: location.longitude } : null;
  const mapCenter = activeView === 'caregiver' ? currentCaregiverCoords : visit.destination;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Visit Info Banner */}
      <div className="rounded-3xl border border-coral-soft bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-semibold text-teal uppercase tracking-wide">Scheduled Visit</span>
            <h1 className="text-2xl font-semibold text-[#115e56]">{visit.clientName}</h1>
            <p className="text-sm text-[#334155]">{visit.address}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              alreadyCheckedIn ? 'bg-teal-soft text-teal' : 'bg-[#fef3c7] text-[#b45309]'
            }`}
          >
            <CheckCircle2 className="size-4" />
            {alreadyCheckedIn ? 'Checked In' : 'Pending Check-In'}
          </span>
        </div>
      </div>

      {/* Main Map & Action Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* OpenStreetMap Component */}
        <div className="relative min-h-95 lg:col-span-7">
          <CheckInMap
            center={mapCenter}
            isOnline={isOnline}
            isCurrentLocation={activeView === 'caregiver'}
          />

          {/* Toggle Map Mode Controls */}
          <div className="absolute top-4 left-4 z-10 flex gap-1 rounded-2xl bg-white/90 p-1.5 shadow-md backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveView('caregiver')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                activeView === 'caregiver' ? 'bg-teal text-white' : 'text-[#334155] hover:bg-teal-soft'
              }`}
            >
              <Navigation className="size-3.5" /> My Location
            </button>
            <button
              type="button"
              onClick={() => setActiveView('client')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                activeView === 'client' ? 'bg-teal text-white' : 'text-[#334155] hover:bg-teal-soft'
              }`}
            >
              <MapPin className="size-3.5" /> Client Residence
            </button>
          </div>
        </div>

        {/* Verification Controls */}
        <div className="flex flex-col justify-between space-y-4 rounded-3xl border border-coral-soft bg-white p-6 shadow-xs lg:col-span-5">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#115e56]">Check-In Verification</h2>

            {/* GPS Acquisition Card */}
            <div className="rounded-2xl border border-[#f0d9c8]/40 bg-teal-soft p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#115e56]">Laptop GPS Signal</span>
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={locating}
                  className="flex items-center gap-1 font-semibold text-teal hover:underline disabled:opacity-50"
                >
                  <RefreshCw className={`size-3 ${locating ? 'animate-spin' : ''}`} />
                  {locating ? 'Acquiring...' : location ? 'Refresh GPS' : 'Acquire GPS'}
                </button>
              </div>

              {locationError ? (
                <p className="mt-2 text-[#be123c] font-medium">{locationError}</p>
              ) : location ? (
                <div className="mt-2 space-y-1 text-[#334155]">
                  <p>Accuracy: ±<span className="font-mono text-[#115e56]">{Math.round(location.accuracy)}m</span></p>
                  <p>
                    Status:{' '}
                    <span className={locationFresh ? 'text-teal font-bold' : 'text-[#b45309] font-bold'}>
                      {locationFresh ? 'GPS Fix Fresh' : 'GPS Fix Expired (Refresh)'}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-[#334155]">Click acquire to request browser location permissions.</p>
              )}
            </div>

            {/* Manual Confirmation Checkbox */}
            <label className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-cream p-3 text-xs text-[#115e56] cursor-pointer">
              <input
                type="checkbox"
                checked={manualConfirmed}
                onChange={(e) => setManualConfirmed(e.target.checked)}
                disabled={alreadyCheckedIn}
                className="mt-0.5 size-4 rounded text-teal focus:ring-teal"
              />
              <span>I confirm I am physically present at the client's home and ready to begin care.</span>
            </label>

            {submitError && (
              <div className="rounded-2xl border border-[#fecdd3] bg-[#fff1f2] p-3 text-xs text-[#be123c]">
                {submitError}
              </div>
            )}

            {receipt && (
              <div className="rounded-2xl border border-coral-soft bg-teal-soft p-3 text-xs font-semibold text-teal">
                ✓ Check-in confirmed at {new Date(receipt.check_in_at!).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Final Submit Button */}
          <button
            type="button"
            onClick={checkIn}
            disabled={!canCheckIn}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-teal px-6 py-4 text-base font-semibold text-white transition-all hover:bg-[#1b8a7f] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin" /> Verifying...
              </>
            ) : alreadyCheckedIn ? (
              'Visit In Progress'
            ) : (
              'Confirm Check-In'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
