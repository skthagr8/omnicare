'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { CaregiverDirectoryTable, CreateCaregiverForm, InviteToast } from '../../../components/caregivers/Caregivers';
import { apiErrorMessage, listCaregiverInvitations, sendCaregiverInvitation } from '../../../utils/caregiverApi';

export default function RegisterCaregiverPage() {
  const [caregivers, setCaregivers] = useState([]);
  const [organizationName, setOrganizationName] = useState('');
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(toastTimeoutRef.current), []);

  const loadCaregivers = useCallback(async () => {
    try {
      const result = await listCaregiverInvitations();
      setCaregivers(result.caregivers);
      setOrganizationName(result.organizationName);
      setLoadState('ready');
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Could not load caregivers.'));
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    loadCaregivers();
  }, [loadCaregivers]);

  // Throws on failure so the form can show the backend's message.
  const handleCreate = async (form) => {
    try {
      await sendCaregiverInvitation(form);
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'The invitation could not be sent.'));
    }
    setIsFormOpen(false);
    setToastMessage(`Invite sent to ${form.email}.`);
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(''), 3500);
    loadCaregivers();
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-coral-soft bg-cream px-8 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Care Operations</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Caregiver Directory</h1>
            <p className="mt-1 text-sm text-slate-500">Invite caregivers and track their onboarding status.</p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            disabled={loadState !== 'ready' || !organizationName}
            title={loadState === 'ready' && !organizationName ? 'Your admin account is not linked to an organisation.' : undefined}
            className="flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1b8a7f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            New Caregiver
          </button>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-auto px-8 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              Invited Caregivers{organizationName ? ` · ${organizationName}` : ''}
            </h2>
            <span className="rounded-full bg-cream-deep/50 px-3 py-1 text-xs font-semibold text-slate-500">{caregivers.length} total</span>
          </div>

          {loadState === 'loading' && <p className="py-10 text-center text-sm text-slate-400">Loading caregivers…</p>}

          {loadState === 'error' && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {loadError}{' '}
              <button onClick={() => { setLoadState('loading'); loadCaregivers(); }} className="font-semibold underline">
                Retry
              </button>
            </div>
          )}

          {loadState === 'ready' && !organizationName && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Your admin account is not linked to an organisation, so you can&apos;t invite caregivers yet.
            </p>
          )}

          {loadState === 'ready' && organizationName && caregivers.length === 0 && (
            <p className="rounded-xl border border-dashed border-coral-soft px-4 py-10 text-center text-sm text-slate-500">
              No caregivers invited yet. Use <span className="font-semibold">New Caregiver</span> to send the first invite.
            </p>
          )}

          {loadState === 'ready' && caregivers.length > 0 && <CaregiverDirectoryTable caregivers={caregivers} />}
        </main>
      </div>

      {isFormOpen && (
        <CreateCaregiverForm
          organizationName={organizationName}
          onClose={() => setIsFormOpen(false)}
          onCreate={handleCreate}
        />
      )}

      <InviteToast message={toastMessage} />
    </div>
  );
}
