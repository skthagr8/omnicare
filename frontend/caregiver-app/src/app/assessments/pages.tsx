'use client';

import Link from 'next/link';

const assessmentTypes = [
  { type: 'tug', name: 'TUG (Timed Up and Go)', description: 'Mobility and fall risk assessment' },
  { type: 'cmai', name: 'CMAI', description: 'Agitation inventory' },
  { type: 'braden', name: 'Braden Scale', description: 'Pressure ulcer risk' },
  { type: 'delirium', name: 'Delirium Screen', description: 'Confusion assessment' },
];

export default function AssessmentsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Assessments</h2>
      <div className="space-y-3">
        {assessmentTypes.map((assessment) => (
          <Link
            key={assessment.type}
            href={`/assessments/${assessment.type}`}
            className="block bg-white rounded-lg shadow p-4"
          >
            <h3 className="font-semibold text-gray-900">{assessment.name}</h3>
            <p className="text-sm text-gray-600">{assessment.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}