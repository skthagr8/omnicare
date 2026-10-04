'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePathname } from 'next/navigation';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const pathname = usePathname();
  
  if (isOnline || pathname === '/schedules' || pathname === '/check-in' || pathname === '/check-out' || pathname.startsWith('/visits/')) return null;
  
  return (
    <div className="bg-yellow-500 text-white text-center py-2 text-sm font-medium">
      You're offline. Data will sync when connection is restored.
    </div>
  );
}