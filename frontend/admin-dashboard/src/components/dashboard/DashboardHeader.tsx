'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Search } from 'lucide-react';
import { endSession } from '../../libs/session';

interface DashboardHeaderProps {
  timeLabel?: string;
  user?: {
    full_name: string;
    email: string;
    role: string;
  };
}

export default function DashboardHeader({ timeLabel, user }: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname(); // Retrieves the current URL path
  const [menuOpen, setMenuOpen] = useState(false);

  // Extract and format the route name (e.g., "/patients" -> "Patients Workflows")
  const currentSegment = pathname?.split('/')[1] || 'Dashboard';
  const formattedSegment = currentSegment.charAt(0).toUpperCase() + currentSegment.slice(1);
  const pageTitle = `${formattedSegment} Workflows`;

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const displayName = user?.full_name || 'User';
  const initials = getInitials(user?.full_name);

  useEffect(() => {
    console.log('[DashboardHeader] Loaded user credentials:', {
      user,
      extractedName: displayName,
      extractedInitials: initials,
    });
  }, [user, displayName, initials]);

  const handleLogout = () => {
    console.log('[DashboardHeader] Initiating logout. Clearing session and tokens...');
    endSession(); 
    console.log('[DashboardHeader] Session cleared successfully. Redirecting to /login...');
    router.replace('/login');
  };

  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3">
      <p className="text-sm font-medium text-slate-500">
        OmniCare <span className="mx-1 text-slate-300">/</span>
        <span className="text-slate-800">{pageTitle}</span>
      </p>
      {timeLabel && <span className="text-xs text-slate-400">{timeLabel} UTC</span>}

      <div className="ml-auto flex items-center gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients, rooms..."
            className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-[#0F6B72] focus:bg-white"
          />
        </div>

        <button className="relative text-slate-400 hover:text-slate-600">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        {/* Profile Dropdown Container */}
        <div className="relative">
          <button
            onClick={() => {
              const nextState = !menuOpen;
              console.log(`[DashboardHeader] Profile menu ${nextState ? 'opened' : 'closed'}`);
              setMenuOpen(nextState);
            }}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 transition-colors outline-none"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F6B72] text-xs font-semibold text-white">
              {initials}
            </span>
            <div className="leading-tight text-left">
              <p className="text-xs font-semibold text-slate-800">{displayName}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role || 'Admin'}</p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                menuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Menu Popover */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />

              <div className="absolute right-0 mt-2 z-20 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}