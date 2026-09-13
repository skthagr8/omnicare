'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useGeolocation } from '@/hooks/useGeolocation';
import { apiClient } from '@/services/api';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

export default function CheckInPage() {
  const params = useParams();
  const visitId = params.id as string;
  const { latitude, longitude, accuracy, error, loading, getCurrentPosition } = useGeolocation();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState<any>(null);
  const { queueOfflineAction } = useOfflineQueue();

  useEffect(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  const handleCheckIn = async () => {
    if (!latitude || !longitude) return;

    setCheckingIn(true);
    
    const checkInData = {
      visit_id: visitId,
      location: { latitude, longitude, accuracy },
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await apiClient.post(
        `/scheduling/visits/${visitId}/check-in`,
        checkInData
      );
      setCheckInResult(response.data);
    } catch (error) {
      await queueOfflineAction({
        type: 'check-in',
        endpoint: `/scheduling/visits/${visitId}/check-in`,
        data: checkInData,
      });
      setCheckInResult({ status: 'queued_offline' });
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Check-In</h2>
      
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-2">GPS Status</h3>
        {loading ? (
          <p className="text-gray-500">Acquiring GPS signal...</p>
        ) : error ? (
          <div className="text-red-600">
            <p>{error}</p>
            <button onClick={getCurrentPosition} className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md">
              Retry GPS
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-green-600">✓ GPS Signal Acquired</p>
            <p className="text-sm text-gray-600">Latitude: {latitude?.toFixed(6)}</p>
            <p className="text-sm text-gray-600">Longitude: {longitude?.toFixed(6)}</p>
            <p className="text-sm text-gray-600">Accuracy: ±{accuracy?.toFixed(0)} meters</p>
          </div>
        )}
      </div>

      <button
        onClick={handleCheckIn}
        disabled={!latitude || !longitude || checkingIn}
        className="w-full py-4 bg-green-600 text-white text-lg font-bold rounded-lg shadow disabled:opacity-50"
      >
        {checkingIn ? 'Checking In...' : 'Check In Now'}
      </button>

      {checkInResult && (
        <div className="bg-white rounded-lg shadow p-4">
          {checkInResult.status === 'queued_offline' ? (
            <p className="text-yellow-600">Check-in saved offline. Will sync later.</p>
          ) : (
            <p className="text-green-600">Check-in successful!</p>
          )}
        </div>
      )}
    </div>
  );
}