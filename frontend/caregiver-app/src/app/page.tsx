'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user } = useAuth();
  const [todayVisits, setTodayVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayVisits = async () => {
      try {
        const response = await apiClient.get('/scheduling/visits/today');
        setTodayVisits(response.data);
      } catch (error) {
        console.error('Failed to fetch visits:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTodayVisits();
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="bg-indigo-600 text-white rounded-lg p-6">
        <h2 className="text-xl font-bold">
          Welcome back, {user?.full_name || 'Caregiver'}
        </h2>
        <p className="text-indigo-200">
          You have {todayVisits.length} visits today
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/schedules" className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold">Today's Visits</h3>
          <p className="text-2xl font-bold text-indigo-600">
            {todayVisits.length}
          </p>
        </Link>
        <Link href="/emergency" className="bg-red-50 rounded-lg shadow p-4">
          <h3 className="font-semibold text-red-700">Emergency</h3>
          <p className="text-sm text-red-600">Quick access</p>
        </Link>
      </div>
    </div>
  );
}