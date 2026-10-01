'use client';

import { useMemo, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import PatientDirectoryHeader from '../../components/patients/PatientDirectoryHeader';
import PatientTable from '../../components/patients/PatientTable';
import { PATIENTS } from '../../components/patients/patientData';

export default function PatientsPage() {
  const [query, setQuery] = useState('');
  const [diagnosis, setDiagnosis] = useState('All');
  const [acuity, setAcuity] = useState('All');
  const [page, setPage] = useState(1);

  const visiblePatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return PATIENTS.filter((patient) => {
      const matchesQuery = !normalizedQuery || patient.name.toLowerCase().includes(normalizedQuery) || patient.id.toLowerCase().includes(normalizedQuery) || patient.caregiver.toLowerCase().includes(normalizedQuery);
      const matchesDiagnosis = diagnosis === 'All' || patient.diagnosis === diagnosis;
      const matchesAcuity = acuity === 'All' || patient.acuity === acuity;
      return matchesQuery && matchesDiagnosis && matchesAcuity;
    });
  }, [query, diagnosis, acuity]);

  const resetPage = (setter) => (value) => {
    setPage(1);
    setter(value);
  };

  return <div className="flex h-screen w-full overflow-hidden bg-white"><Sidebar /><div className="flex min-w-0 flex-1 flex-col"><DashboardHeader timeLabel="14:22" /><PatientDirectoryHeader query={query} onQueryChange={resetPage(setQuery)} diagnosis={diagnosis} acuity={acuity} onDiagnosisChange={resetPage(setDiagnosis)} onAcuityChange={resetPage(setAcuity)} /><main className="flex min-h-0 flex-1 flex-col px-8 py-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold text-[#2B2E33]">Registered Patients</h2><p className="mt-1 text-xs text-slate-400">Operational overview. Sensitive identifiers are available only within the patient profile.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{visiblePatients.length} visible</span></div><PatientTable patients={visiblePatients} page={page} onPageChange={setPage} /></main></div></div>;
}
