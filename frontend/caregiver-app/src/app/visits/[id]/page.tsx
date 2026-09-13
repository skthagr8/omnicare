'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/services/api';
import VisitStatus from '@/components/visits/VisitStatus';

export default function VisitDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = params.id as string;
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisit = async () => {
      try {
        const response = await apiClient.get(`/scheduling/visits/${visitId}`);
        setVisit(response.data);
      } catch (error) {
        console.error('Failed to fetch visit:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVisit();
  }, [visitId]);

  if (loading) {
    return <div className="text-center py-8">Loading visit details...</div>;
  }

  if (!visit) {
    return <div className="text-center py-8">Visit not found</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Visit Details</h2>
      
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">{visit.client_name}</h3>
          <VisitStatus status={visit.status} />
        </div>
        
        <div className="space-y-2 text-sm text-gray-600">
          <p>Address: {visit.client_address}</p>
          <p>Scheduled: {new Date(visit.scheduled_start).toLocaleTimeString()}</p>
          {visit.actual_start && (
            <p>Started: {new Date(visit.actual_start).toLocaleTimeString()}</p>
          )}
        </div>
      </div>

      {visit.status === 'scheduled' && (
        <button
          onClick={() => router.push(`/visits/${visitId}/check-in`)}
          className="w-full py-4 bg-green-600 text-white text-lg font-bold rounded-lg"
        >
          Check In
        </button>
      )}
    </div>
  );
}