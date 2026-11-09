'use client';

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { differenceInYears, format, formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangle, LocateFixed, MapPinOff, Radio, RefreshCw, Users } from 'lucide-react';
import { apiClient } from '../../services/api';

// --- Config ---
const POLL_INTERVAL_MS = 30_000;
// Used only until the first caregiver location arrives.
const DEFAULT_CENTER = [-1.286389, 36.817223];
const DEFAULT_ZOOM = 12;

// Keys match the backend CaregiverStatus enum.
export const STATUS_STYLES = {
  available: { label: 'Available', dot: 'bg-teal-500', ring: 'ring-teal-500/30', text: 'text-teal-600' },
  en_route: { label: 'En-route', dot: 'bg-amber-500', ring: 'ring-amber-500/30', text: 'text-amber-600' },
  in_service: { label: 'In-service', dot: 'bg-sky-500', ring: 'ring-sky-500/30', text: 'text-sky-600' },
  emergency: { label: 'Emergency', dot: 'bg-rose-600', ring: 'ring-rose-600/30', text: 'text-rose-600' },
  off_shift: { label: 'Off shift', dot: 'bg-slate-400', ring: 'ring-slate-400/30', text: 'text-slate-500' },
};

// Keys match the backend AcuityLevel enum; null = no current acuity tier.
export const ACUITY_STYLES = {
  red: { label: 'High acuity', border: 'border-rose-500', text: 'text-rose-600', rank: 0 },
  amber: { label: 'Medium acuity', border: 'border-amber-500', text: 'text-amber-600', rank: 1 },
  green: { label: 'Low acuity', border: 'border-teal-500', text: 'text-teal-600', rank: 2 },
  none: { label: 'Not assessed', border: 'border-coral-soft', text: 'text-slate-500', rank: 3 },
};

const DIAGNOSIS_LABELS = {
  dementia: 'Dementia',
  post_stroke: 'Post-Stroke',
  parkinsons: "Parkinson's",
  other: 'Other',
};

const statusStyle = (status) => STATUS_STYLES[status] ?? STATUS_STYLES.available;
const acuityStyle = (level) => ACUITY_STYLES[level] ?? ACUITY_STYLES.none;
const formatTime = (iso) => format(new Date(iso), 'HH:mm');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

// --- Data ---
/** Polls GET /caregivers/on-shift: caregivers on shift, their location and today's open visits. */
export function useOnShiftCaregivers() {
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/caregivers/on-shift');
      setCaregivers(data);
      setUpdatedAt(new Date());
      setError('');
    } catch (err) {
      setError(err?.response?.data?.detail && typeof err.response.data.detail === 'string'
        ? err.response.data.detail
        : 'Unable to load live caregiver data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { caregivers, loading, error, updatedAt, refresh };
}

// --- MapCanvas ---
function markerHtml(caregiver, selected) {
  const style = statusStyle(caregiver.status);
  const pulse = caregiver.status === 'emergency'
    ? `<span class="absolute h-4 w-4 animate-ping rounded-full ${style.dot} opacity-50"></span>`
    : '';
  const seen = caregiver.location_at
    ? `last seen ${escapeHtml(formatDistanceToNowStrict(new Date(caregiver.location_at), { addSuffix: true }))}`
    : '';
  return `
    <div class="flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1">
      <div class="whitespace-nowrap rounded-lg border bg-white/95 px-2.5 py-1 text-center shadow-sm ${selected ? 'border-teal ring-2 ring-teal/30' : 'border-white/60'}">
        <p class="text-[11px] font-semibold text-slate-700">${escapeHtml(caregiver.full_name || 'Caregiver')}</p>
        <p class="text-[9px] font-semibold uppercase tracking-wide ${style.text}">${style.label}</p>
        <p class="text-[9px] text-slate-400">${seen}</p>
      </div>
      <div class="relative flex h-4 w-4 items-center justify-center">
        ${pulse}<span class="relative h-3 w-3 rounded-full ${style.dot} ring-4 ${style.ring}"></span>
      </div>
    </div>`;
}

function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] w-44 rounded-lg bg-white/95 p-3 shadow-sm backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Map Legend</p>
      <div className="flex flex-col gap-1.5 text-xs text-slate-600">
        {['available', 'en_route', 'in_service', 'emergency'].map((key) => (
          <span key={key} className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${STATUS_STYLES[key].dot}`} />{STATUS_STYLES[key].label}</span>
        ))}
      </div>
    </div>
  );
}

function OperationsStatusBar({ caregivers, error, updatedAt, onRefresh }) {
  const counts = caregivers.reduce((acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }), {});
  const unlocated = caregivers.filter((c) => !c.location).length;
  return (
    <div className="absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-4 whitespace-nowrap rounded-full bg-ink px-5 py-2.5 text-xs text-slate-200 shadow-lg">
      {error ? (
        <span className="flex items-center gap-1.5 font-medium text-rose-300"><AlertTriangle className="h-3.5 w-3.5" />{error}</span>
      ) : (
        <span className="flex items-center gap-1.5 font-medium text-white"><Radio className="h-3.5 w-3.5 text-teal-400" />{caregivers.length} on shift</span>
      )}
      <span className="h-3 w-px bg-white/15" />
      <span>In-service <span className="font-semibold text-white">{counts.in_service ?? 0}</span></span>
      <span>En-route <span className="font-semibold text-white">{counts.en_route ?? 0}</span></span>
      {counts.emergency > 0 && <span className="font-semibold text-rose-300">Emergency {counts.emergency}</span>}
      {unlocated > 0 && (
        <span className="flex items-center gap-1 text-amber-300" title="On shift but no known location yet"><MapPinOff className="h-3.5 w-3.5" />{unlocated} no location</span>
      )}
      <span className="h-3 w-px bg-white/15" />
      <button onClick={onRefresh} className="flex items-center gap-1 text-slate-300 hover:text-white" title="Refresh now">
        <RefreshCw className="h-3.5 w-3.5" />{updatedAt ? format(updatedAt, 'HH:mm:ss') : '—'}
      </button>
    </div>
  );
}

export function MapCanvas({ caregivers, selectedId, onSelect, error, updatedAt, onRefresh }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const layerRef = useRef(null);
  const fittedRef = useRef(false);
  const [ready, setReady] = useState(false);

  const located = useMemo(() => caregivers.filter((c) => c.location), [caregivers]);

  // Create the map once. Leaflet touches `window`, so it is loaded on the client only.
  useEffect(() => {
    let cancelled = false;
    let map;
    import('leaflet').then(({ default: L }) => {
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;
      map = L.map(containerRef.current, { zoomControl: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      L.control.zoom({ position: 'topleft' }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      layerRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  // Redraw caregiver markers whenever the data or the selection changes.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    layerRef.current.clearLayers();
    located.forEach((caregiver) => {
      const { latitude, longitude } = caregiver.location;
      const selected = caregiver.caregiver_id === selectedId;
      L.marker([latitude, longitude], {
        icon: L.divIcon({ className: '', html: markerHtml(caregiver, selected), iconSize: [0, 0] }),
        zIndexOffset: selected ? 1000 : caregiver.status === 'emergency' ? 500 : 0,
        title: caregiver.full_name || 'Caregiver',
      })
        .on('click', () => onSelect(caregiver.caregiver_id))
        .addTo(layerRef.current);
    });

    // Frame everyone the first time locations arrive; after that, leave the view to the user.
    if (!fittedRef.current && located.length > 0) {
      fittedRef.current = true;
      fitToCaregivers(L, map, located);
    }
  }, [ready, located, selectedId, onSelect]);

  // Fly to the caregiver selected from the queue.
  useEffect(() => {
    const target = located.find((c) => c.caregiver_id === selectedId);
    if (ready && target && mapRef.current) {
      mapRef.current.flyTo([target.location.latitude, target.location.longitude], Math.max(mapRef.current.getZoom(), 15), { duration: 0.6 });
    }
  }, [ready, selectedId, located]);

  const fitAll = () => {
    if (leafletRef.current && mapRef.current && located.length) fitToCaregivers(leafletRef.current, mapRef.current, located);
  };

  return (
    <main className="relative flex-1 overflow-hidden bg-coral-soft">
      <div ref={containerRef} className="absolute inset-0" />
      <button
        onClick={fitAll}
        disabled={!located.length}
        title="Show all caregivers"
        className="absolute right-4 top-4 z-[1000] flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm hover:bg-cream disabled:opacity-50"
      >
        <LocateFixed className="h-4 w-4" />Show all
      </button>
      {ready && located.length === 0 && (
        <div className="absolute left-1/2 top-6 z-[1000] -translate-x-1/2 rounded-lg bg-white/95 px-4 py-2 text-xs text-slate-500 shadow-sm">
          {caregivers.length === 0 ? 'No caregivers are on shift right now.' : 'Caregivers on shift have not reported a location yet.'}
        </div>
      )}
      <MapLegend />
      <OperationsStatusBar caregivers={caregivers} error={error} updatedAt={updatedAt} onRefresh={onRefresh} />
    </main>
  );
}

function fitToCaregivers(L, map, located) {
  if (located.length === 1) {
    map.setView([located[0].location.latitude, located[0].location.longitude], 15);
    return;
  }
  const bounds = L.latLngBounds(located.map((c) => [c.location.latitude, c.location.longitude]));
  map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
}

// --- QueuePanel ---
function ClientCard({ entry, selected, onSelect }) {
  const { client, caregiver } = entry;
  const acuity = acuityStyle(client.acuity);
  const inProgress = entry.status === 'in_progress';
  const diagnoses = client.diagnoses.map((d) => DIAGNOSIS_LABELS[d] ?? d).join(', ');

  return (
    <button
      type="button"
      onClick={() => onSelect(caregiver.caregiver_id)}
      className={`w-full rounded-xl border-l-4 bg-white/90 p-4 text-left shadow-[0_4px_16px_-4px_rgba(15,23,42,0.12)] transition-shadow hover:shadow-[0_6px_20px_-4px_rgba(15,23,42,0.2)] ${acuity.border} ${selected ? 'ring-2 ring-teal/40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{client.full_name}</p>
        <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${acuity.text}`}>{acuity.label}</span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        Age {differenceInYears(new Date(), new Date(client.date_of_birth))}{diagnoses && ` • ${diagnoses}`}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-slate-400" title={client.address_text}>{client.address_text}</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Assigned To</p>
          <p className={`flex items-center gap-1.5 text-xs font-semibold ${statusStyle(caregiver.status).text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusStyle(caregiver.status).dot}`} />{caregiver.full_name || 'Caregiver'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{inProgress ? 'In Progress' : 'Visit Window'}</p>
          <p className="text-xs font-semibold text-slate-600">
            {inProgress && entry.check_in_at ? `since ${formatTime(entry.check_in_at)}` : `${formatTime(entry.scheduled_start)}–${formatTime(entry.scheduled_end)}`}
          </p>
        </div>
      </div>
    </button>
  );
}

const SORTS = {
  acuity: (a, b) =>
    acuityStyle(a.client.acuity).rank - acuityStyle(b.client.acuity).rank ||
    (b.status === 'in_progress') - (a.status === 'in_progress') ||
    new Date(a.scheduled_start) - new Date(b.scheduled_start),
  time: (a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start),
};

export function QueuePanel({ caregivers, loading, selectedId, onSelect }) {
  const [sort, setSort] = useState('acuity');

  const entries = useMemo(
    () => caregivers.flatMap((caregiver) => caregiver.assignments.map((a) => ({ ...a, caregiver }))).sort(SORTS[sort]),
    [caregivers, sort],
  );
  const idle = caregivers.filter((c) => c.assignments.length === 0).length;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-white/40 bg-white/70 backdrop-blur-xl">
      <div className="flex items-center justify-between px-5 pt-5">
        <p className="text-sm font-semibold text-slate-800">Queue Watch</p>
        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">{entries.length} {entries.length === 1 ? 'Client' : 'Clients'}</span>
      </div>
      <div className="mx-5 mt-4 flex rounded-lg bg-cream-deep/50 p-1">
        {[['acuity', 'Acuity'], ['time', 'Time']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`flex-1 rounded-md py-1.5 text-xs ${sort === key ? 'bg-white font-semibold text-slate-700 shadow-sm' : 'font-medium text-slate-500'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mx-5 mt-5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Today&apos;s open visits</p>
      <div className="mt-3 flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5">
        {loading && <p className="py-8 text-center text-xs text-slate-400">Loading live data…</p>}
        {!loading && entries.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-400">
            {caregivers.length === 0 ? 'No caregivers are on shift.' : 'Caregivers on shift have no open visits today.'}
          </p>
        )}
        {entries.map((entry) => (
          <ClientCard key={entry.session_id} entry={entry} selected={entry.caregiver.caregiver_id === selectedId} onSelect={onSelect} />
        ))}
      </div>
      {idle > 0 && (
        <p className="flex items-center gap-1.5 border-t border-coral-soft px-5 py-3 text-[11px] text-slate-500">
          <Users className="h-3.5 w-3.5" />{idle} on shift with no open visits
        </p>
      )}
    </aside>
  );
}
