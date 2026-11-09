'use client';

import MedicationChecklist from '../../../components/medications/MedicationChecklist';

export default function MedicationsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-slate-900">Medications</h2>
      <MedicationChecklist />
    </div>
  );
}