'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  
  if (isOnline) return null;
  
  return (
    <div className="bg-yellow-500 text-white text-center py-2 text-sm font-medium">
      You're offline. Data will sync when connection is restored.
    </div>
  );
}