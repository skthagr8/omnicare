'use client';

import Link from 'next/link';
import VisitStatus from './VisitStatus';

export default function VisitCard({ visit }: { visit: any }) {
  return (
    <Link
      href={`/visits/${visit.id}`}
      className="block bg-white rounded-lg shadow p-4"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">{visit.client_name}</h3>
        <VisitStatus status={visit.status} />
      </div>
      <p className="text-sm text-gray-600">{visit.client_address}</p>
      <p className="text-sm text-gray-600 mt-1">
        {new Date(visit.scheduled_start).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </p>
    </Link>
  );
}