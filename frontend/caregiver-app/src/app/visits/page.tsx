'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';
import VisitCard from '@/components/visits/VisitCard';

export default function VisitsPage() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        const response = await apiClient.get('/scheduling/visits/today');
        setVisits(response.data);
      } catch (error) {
        console.error('Failed to fetch visits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVisits();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading visits...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Today's Visits</h2>
      {visits.length === 0 ? (
        <p className="text-gray-500">No visits scheduled for today.</p>
      ) : (
        visits.map((visit: any) => (
          <VisitCard key={visit.id} visit={visit} />
        ))
      )}
    </div>
  );
}