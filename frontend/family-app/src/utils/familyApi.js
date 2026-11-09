'use client';

/**
 * Family portal API. Every route lives under /api/family on the backend and is
 * scoped to clients the signed-in family member is linked to (client_family_links).
 */
import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { apiClient } from '../services/api';

// --- Calls -----------------------------------------------------------------

export const getLinkedClients = () => apiClient.get('/family/me/clients').then((r) => r.data);
export const getClientVisits = (clientId) => apiClient.get(`/family/clients/${clientId}/visits`).then((r) => r.data);
export const getCareTeam = (clientId) => apiClient.get(`/family/clients/${clientId}/care-team`).then((r) => r.data);
export const getHealthSummary = (clientId, days = 30) =>
  apiClient.get(`/family/clients/${clientId}/health`, { params: { days } }).then((r) => r.data);
export const getVisitDetail = (visitId) => apiClient.get(`/family/visits/${visitId}`).then((r) => r.data);

// --- Hooks -----------------------------------------------------------------

/**
 * Runs `load` and tracks loading/error state; `reload` re-runs it.
 * Results are tagged with the deps they were loaded for, so on the render where
 * deps change (before the effect re-fires) the hook reports `loading` instead of
 * handing back data from the previous deps.
 */
export function useApi(load, deps) {
  const key = JSON.stringify(deps);
  const [state, setState] = useState({ key: null, data: undefined, loading: true, error: '' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  const reload = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    run()
      .then((data) => !cancelled && setState({ key, data, loading: false, error: '' }))
      .catch((err) => !cancelled && setState({ key, data: undefined, loading: false, error: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  useEffect(() => reload(), [reload]);

  if (state.key !== key) return { data: undefined, loading: true, error: '', reload };
  return { data: state.data, loading: state.loading, error: state.error, reload };
}

/** The loved one this family member follows (primary-contact links come first). */
export function useLinkedClient() {
  const { data, loading, error } = useApi(getLinkedClients, []);
  return { client: data?.[0], clients: data ?? [], loading, error };
}

// --- Formatting --------------------------------------------------------------

export function errorMessage(err) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (!err?.response) return 'Unable to reach the server. Check your connection and try again.';
  return 'Something went wrong while loading this page.';
}

export const firstName = (name = '') => name.split(' ')[0];
export const fmtDate = (iso, pattern = 'EEEE, MMM d') => (iso ? format(new Date(iso), pattern) : '—');
export const fmtTime = (iso) => (iso ? format(new Date(iso), 'h:mm a') : '—');
export const titleCase = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
