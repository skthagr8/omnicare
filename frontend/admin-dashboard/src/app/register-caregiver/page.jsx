'use client';

import { useEffect, useRef, useState } from 'react';
import { UserPlus } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import CreateCaregiverForm from '../../components/caregivers/CreateCaregiverForm';
import CaregiverDirectoryTable from '../../components/caregivers/CaregiverDirectoryTable';
import InviteToast from '../../components/caregivers/InviteToast';
import { INITIAL_CAREGIVERS } from '../../components/caregivers/caregiverData';

let nextIdCounter = 1200;

export default function RegisterCaregiverPage() {
  const [caregivers, setCaregivers] = useState(INITIAL_CAREGIVERS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(toastTimeoutRef.current), []);

  const handleCreate = (form) => {
    nextIdCounter += 1;
    const newCaregiver = {
      id: `CG-${nextIdCounter}`,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email,
      org: form.org,
      certificationIds: form.certificationIds,
      verificationSource: form.verificationSource.trim(),
      status: 'invited',
      invitedAt: new Date().toISOString().slice(0, 10),
    };

    setCaregivers((current) => [newCaregiver, ...current]);
    setIsFormOpen(false);
    setToastMessage(`Invite sent to ${newCaregiver.email}.`);

    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(''), 3500);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader timeLabel="14:22" />

        <header className="flex items-center justify-between border-b border-slate-200 bg-[#EEF3F6] px-8 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0F6B72]">Care Operations</p>
            <h1 className="mt-1 text-2xl font-bold text-[#2B2E33]">Caregiver Directory</h1>
            <p className="mt-1 text-sm text-slate-500">Manage caregiver records, certifications, and onboarding status.</p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[#0F6B72] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0d5b61]"
          >
            <UserPlus className="h-4 w-4" />
            New Caregiver
          </button>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-auto px-8 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#2B2E33]">Registered Caregivers</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{caregivers.length} total</span>
          </div>
          <CaregiverDirectoryTable caregivers={caregivers} />
        </main>
      </div>

      {isFormOpen && (
        <CreateCaregiverForm onClose={() => setIsFormOpen(false)} onCreate={handleCreate} />
      )}

      <InviteToast message={toastMessage} />
    </div>
  );
}
