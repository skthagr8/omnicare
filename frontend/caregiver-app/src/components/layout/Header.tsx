'use client';

import { Bell } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function Header() {
  const isOnline = useOnlineStatus();
  
  return (
    <header className="sticky top-0 z-40 bg-indigo-600 text-white shadow">
      <div className="flex items-center justify-between px-4 h-14">
        <h1 className="text-lg font-bold">OmniCare</h1>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="text-xs bg-red-500 px-2 py-1 rounded-full">Offline</span>
          )}
          <button className="p-2">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}