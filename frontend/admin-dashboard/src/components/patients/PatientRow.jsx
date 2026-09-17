'use client';

import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { ACUITY_STYLES, CAREGIVER_STATUS_STYLES, DIAGNOSIS_STYLES, getAge } from './patientData';

function RowActions({ patient }) {
  const [open, setOpen] = useState(false);
  return <div className="relative"><button onClick={() => setOpen((value) => !value)} aria-label={`Actions for ${patient.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><MoreHorizontal className="h-4 w-4" /></button>{open && <div className="absolute right-0 top-9 z-10 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_12px_28px_-8px_rgba(15,23,42,0.2)]"><button className="block w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">View Profile</button><button className="block w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">Reassign Caregiver</button><button className="block w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">Edit Care Plan</button></div>}</div>;
}

export default function PatientRow({ patient }) {
  const caregiverStatus = CAREGIVER_STATUS_STYLES[patient.caregiverStatus];
  return <tr className="group border-b border-slate-100 even:bg-slate-50/60 hover:bg-teal-50/30"><td className="relative w-2 p-0"><span className={`absolute inset-y-0 left-0 w-1 ${ACUITY_STYLES[patient.acuity]}`} aria-label={`${patient.acuity} acuity`} /></td><td className="px-5 py-4"><p className="font-semibold text-[#2B2E33]">{patient.name}</p><p className="mt-0.5 text-[11px] text-slate-400">Client ID {patient.id}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${DIAGNOSIS_STYLES[patient.diagnosis]}`}>{patient.diagnosis}</span></td><td className="px-5 py-4 text-sm text-slate-600">{getAge(patient.dateOfBirth)}</td><td className="px-5 py-4"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0F6B72]/10 text-[10px] font-semibold text-[#0F6B72]">{patient.initials}</span><span className="text-sm text-slate-700">{patient.caregiver}</span></div></td><td className="px-5 py-4"><span className="flex items-center gap-2 text-xs text-slate-600"><span className={`h-2 w-2 rounded-full ${caregiverStatus.dot}`} />{caregiverStatus.label}</span></td><td className="px-5 py-4 text-right"><RowActions patient={patient} /></td></tr>;
}
