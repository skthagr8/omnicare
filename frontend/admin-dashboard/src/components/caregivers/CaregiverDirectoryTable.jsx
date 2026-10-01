'use client';

import { MoreHorizontal } from 'lucide-react';
import CaregiverStatusBadge from './CaregiverStatusBadge';
import { CAREGIVER_STATUS_STYLES, getCertificationLabels } from './caregiverData';

export default function CaregiverDirectoryTable({ caregivers }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left">
        <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          <tr>
            <th className="px-5 py-3">Caregiver</th>
            <th className="px-5 py-3">Org</th>
            <th className="px-5 py-3">Certifications</th>
            <th className="px-5 py-3">Verification Source</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
          {caregivers.map((caregiver) => (
            <tr key={caregiver.id} className="hover:bg-slate-50">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F6B72]/10 text-[10px] font-semibold text-[#0F6B72]">
                    {caregiver.firstName[0]}
                    {caregiver.lastName[0]}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">{caregiver.firstName} {caregiver.lastName}</p>
                    <p className="text-[11px] text-slate-500">{caregiver.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-sm text-slate-600">{caregiver.org}</td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {getCertificationLabels(caregiver.certificationIds).map((label) => (
                    <span key={label} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                      {label}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-5 py-4 text-xs text-slate-500">{caregiver.verificationSource}</td>
              <td className="px-5 py-4">
                <CaregiverStatusBadge status={caregiver.status} styles={CAREGIVER_STATUS_STYLES} />
              </td>
              <td className="px-5 py-4 text-right">
                <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
