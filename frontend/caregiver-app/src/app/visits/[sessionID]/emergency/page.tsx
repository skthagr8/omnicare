'use client';

import { useState } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { apiClient } from '@/services/api';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { makeDemoEmergency, VISIT_DEMO_MODE } from '@/services/visitDemo';

export default function EmergencyPage() {
  const pathname = usePathname();
  const isVisitDemo = VISIT_DEMO_MODE && pathname.startsWith('/visits/');
  const [confirming, setConfirming] = useState(false);
  const [emergencySent, setEmergencySent] = useState(false);
  const { latitude, longitude, getCurrentPosition } = useGeolocation();
  const { queueOfflineAction } = useOfflineQueue();
  const demoEmergency = makeDemoEmergency();

  if (isVisitDemo) {
    return <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-12 text-center"><div className="max-w-md rounded-lg border border-[#e9d39e] bg-[#fff5d9] p-7 text-[#785716]"><AlertTriangle aria-hidden="true" className="mx-auto mb-4 size-8" /><h1 className="text-xl font-bold">Emergency workflow preview</h1><p className="mt-3 text-sm font-semibold">{demoEmergency.level}</p><p className="mt-2 text-sm leading-6">{demoEmergency.note}</p><p className="mt-3 text-xs font-semibold">DEMO DATA / No alert has been sent.</p></div></div>;
  }

  const confirmEmergency = async () => {
    await getCurrentPosition();

    const emergencyData = {
      type: 'caregiver_emergency',
      location: latitude && longitude ? { latitude, longitude } : null,
      timestamp: new Date().toISOString(),
    };

    try {
      await apiClient.post('/emergency/raise', emergencyData);
      setEmergencySent(true);
    } catch (error) {
      await queueOfflineAction({
        type: 'emergency',
        endpoint: '/emergency/raise',
        data: emergencyData,
      });
      setEmergencySent(true);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      {!confirming && !emergencySent && (
        <button
          onClick={() => setConfirming(true)}
          className="w-64 h-64 bg-red-600 text-white text-2xl font-bold rounded-full shadow-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <AlertTriangle className="w-16 h-16" />
          <span>EMERGENCY</span>
        </button>
      )}

      {confirming && (
        <div className="text-center space-y-6">
          <p className="text-xl text-gray-700">Are you sure?</p>
          <div className="flex gap-4">
            <button onClick={confirmEmergency} className="px-8 py-4 bg-red-600 text-white text-lg font-bold rounded-lg">
              YES, EMERGENCY
            </button>
            <button onClick={() => setConfirming(false)} className="px-8 py-4 bg-gray-300 text-gray-700 text-lg font-bold rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}

      {emergencySent && (
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Emergency Sent</h3>
          <p className="text-gray-600">Help is on the way.</p>
        </div>
      )}
    </div>
  );
}