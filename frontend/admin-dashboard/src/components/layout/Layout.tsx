'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Bell,
  CalendarClock,
  ChevronDown,
  FileBarChart2,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { PORTAL } from '../../libs/portal';
import { endSession } from '../../libs/session';

// --- AuthGuard ---
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get('/auth/me')
      .then(({ data }) => {
        if (cancelled) return;
        if (data.role !== PORTAL) {
          endSession();
          router.replace('/login');
          return;
        }
        setAllowed(true);
      })
      .catch(() => {
        if (cancelled) return;
        endSession();
        router.replace('/login');
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return allowed ? <>{children}</> : null;
}

// --- Sidebar ---
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Patients', href: '/patients', icon: Users },
  { label: 'Intake', href: '/intake/step-1', icon: UserPlus },
  { label: 'Scheduling', href: '/scheduling', icon: CalendarClock },
  { label: 'Risk Panel', href: '/risk-panel', icon: ShieldAlert },
  { label: 'Register Caregiver', href: '/register-caregiver', icon: FileBarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = () => {
    endSession();
    router.replace('/login');
  };

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-coral-soft bg-white/50 text-ink">
      <div className="flex items-center gap-3 px-6 py-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral text-white shadow-sm">
          <HeartPulse className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <div className="leading-tight">
          <p className="text-lg font-semibold tracking-tight">OmniCare</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-coral">Operations</p>
        </div>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1.5 px-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          // Active for the item's whole section, e.g. /intake/step-3 highlights "Intake".
          const section = `/${href.split('/')[1]}`;
          const active = pathname === href || pathname === section || pathname?.startsWith(`${section}/`);
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                active ? 'bg-coral text-white shadow-sm' : 'text-slate-600 hover:bg-coral-soft hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-coral-soft px-6 py-5">
        <div className="mb-4 flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-teal" /> HIPAA Compliant Platform
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-full px-1 text-sm font-medium text-slate-600 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// --- DashboardHeader ---
interface DashboardHeaderProps {
  timeLabel?: string;
  user?: {
    full_name: string;
    email: string;
    role: string;
  };
}

export function DashboardHeader({ timeLabel, user }: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname(); // Retrieves the current URL path
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    <header className="flex items-center gap-4 border-b border-coral-soft bg-cream/95 px-8 py-4 backdrop-blur">
      <p className="text-sm font-medium text-slate-500">
        OmniCare <span className="mx-1 text-coral">/</span>
        <span className="text-ink">{pageTitle}</span>
      </p>
      {timeLabel && <span className="text-xs text-slate-400">{timeLabel} UTC</span>}

      <div className="ml-auto flex items-center gap-4">
        {/* Searches the patients directory (opens /patients?q=...). */}
        <form
          role="search"
          className="relative"
          onSubmit={(event) => {
            event.preventDefault();
            const term = searchTerm.trim();
            router.push(term ? `/patients?q=${encodeURIComponent(term)}` : '/patients');
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Search patients"
            placeholder="Search patients… (Enter)"
            className="w-64 rounded-full border border-coral-soft bg-white/70 py-2 pl-9 pr-4 text-sm text-ink placeholder:text-slate-400 outline-none transition focus:border-teal focus:bg-white focus:ring-2 focus:ring-teal/20"
          />
        </form>

        {/* No notifications API is enabled on the backend yet. */}
        <button disabled title="Notifications are not available yet" className="relative cursor-not-allowed text-slate-300">
          <Bell className="h-5 w-5" />
        </button>

        {/* Profile Dropdown Container */}
        <div className="relative">
          <button
            onClick={() => {
              const nextState = !menuOpen;
              console.log(`[DashboardHeader] Profile menu ${nextState ? 'opened' : 'closed'}`);
              setMenuOpen(nextState);
            }}
            className="flex items-center gap-2 rounded-full border border-ink/80 py-1 pl-1 pr-3 transition-colors outline-none hover:bg-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-xs font-semibold text-white">
              {initials}
            </span>
            <div className="leading-tight text-left">
              <p className="text-xs font-semibold text-ink">{displayName}</p>
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

              <div className="absolute right-0 mt-2 z-20 w-52 rounded-xl border border-coral-soft bg-white p-1 shadow-lg">
                <div className="border-b border-coral-soft px-3 py-2">
                  <p className="text-xs font-semibold text-ink truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
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
