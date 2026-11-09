'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CarePlanDialog,
  PatientDirectoryHeader,
  PatientProfileDrawer,
  PatientTable,
  ReassignCaregiverDialog,
  Toast,
  useClientDirectory,
} from '../../../components/patients/Patients';

function PatientsView() {
  // `?q=` comes from the global header search.
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(urlQuery);
  const [diagnosis, setDiagnosis] = useState('All');
  const [acuity, setAcuity] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [active, setActive] = useState(null); // { type: 'profile' | 'reassign' | 'care-plan', patient }
  const [toast, setToast] = useState('');

  useEffect(() => {
    setQuery(urlQuery);
    setPage(1);
  }, [urlQuery]);

  const { items, total, loading, error, reload } = useClientDirectory({ query, diagnosis, acuity, status, page, onPageChange: setPage });

  // Any filter change goes back to the first page.
  const resetPage = (setter) => (value) => {
    setPage(1);
    setter(value);
  };

  const openAction = useCallback((type, patient) => setActive({ type, patient }), []);
  const closeAction = useCallback(() => setActive(null), []);
  const finishAction = useCallback((message) => {
    setActive(null);
    setToast(message);
    reload();
  }, [reload]);
  const clearToast = useCallback(() => setToast(''), []);

  return (
    <div className="flex h-full w-full overflow-hidden rounded-2xl border border-coral-soft bg-white shadow-sm">
      <div className="flex min-w-0 flex-1 flex-col">
        <PatientDirectoryHeader
          query={query}
          onQueryChange={resetPage(setQuery)}
          diagnosis={diagnosis}
          acuity={acuity}
          status={status}
          onDiagnosisChange={resetPage(setDiagnosis)}
          onAcuityChange={resetPage(setAcuity)}
          onStatusChange={resetPage(setStatus)}
        />
        <main className="flex min-h-0 flex-1 flex-col px-8 py-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">Registered Patients</h2>
              <p className="mt-1 text-xs text-slate-400">Clients with caregiver visits. Records sharing a name are shown once.</p>
            </div>
            <span className="rounded-full bg-cream-deep/50 px-3 py-1 text-xs font-semibold text-slate-500">{total.toLocaleString()} {total === 1 ? 'match' : 'matches'}</span>
          </div>
          <PatientTable patients={items} total={total} loading={loading} error={error} onRetry={reload} page={page} onPageChange={setPage} onAction={openAction} />
        </main>
      </div>

      {active?.type === 'profile' && <PatientProfileDrawer patient={active.patient} onClose={closeAction} onAction={openAction} />}
      {active?.type === 'reassign' && <ReassignCaregiverDialog patient={active.patient} onClose={closeAction} onDone={finishAction} />}
      {active?.type === 'care-plan' && <CarePlanDialog patient={active.patient} onClose={closeAction} onDone={finishAction} />}
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}

export default function PatientsPage() {
  // useSearchParams needs a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={null}>
      <PatientsView />
    </Suspense>
  );
}
