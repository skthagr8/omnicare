'use client';

import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { HeartPulse, LogOut, Home, Calendar, ClipboardList, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { apiClient } from '../../services/api';
import { PORTAL } from '../../libs/portal';
import { endSession } from '../../libs/session';
import { useOnlineStatus } from '../../hooks/useDevice';
import { fetchTodaySchedule } from '../../services/visits';

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

// --- Header ---
const navigation = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/schedules', label: 'Schedule' },
  { href: '/check-in', label: 'Check In' },
  { href: '/visits', label: 'Visits' }, // resolved to /visits/{session_id} on click (see openCurrentVisit)
  { href: '/check-out', label: 'Check Out' },
];

// Define routes where the header should NEVER appear
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Check if the user has a session. 
    // (Your AuthGuard handles the actual API validation, this just checks presence for UI toggling)
    const token = localStorage.getItem('access_token');
    setIsAuthenticated(!!token);
  }, [pathname]); // Re-run this check whenever the route changes

  // Visits has no index page: open the visit already on screen, otherwise today's
  // in-progress visit, otherwise the next scheduled one; with none, fall back to the schedule.
  const openCurrentVisit = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const onScreen = pathname.match(/^\/visits\/([^/]+)/)?.[1];
    if (onScreen) {
      router.push(`/visits/${onScreen}`);
      return;
    }
    try {
      const { visits } = await fetchTodaySchedule(new AbortController().signal);
      const visit = visits.find(item => item.status === 'in_progress') || visits.find(item => item.status === 'scheduled');
      router.push(visit ? `/visits/${encodeURIComponent(visit.id)}` : '/schedules');
    } catch {
      router.push('/schedules');
    }
  };

  const handleLogout = () => {
    endSession();
    setIsAuthenticated(false);
    router.push('/login');
  };

  // 1. Wait for client-side mount to prevent SSR hydration errors
  // 2. Hide if on a public route (like /login)
  // 3. Hide if no access token exists
  if (!isMounted || PUBLIC_ROUTES.includes(pathname) || !isAuthenticated) {
    return null;
  }

  return (
    <header data-dashboard-header className="fixed inset-x-0 top-0 z-40 h-28 border-b border-coral-soft bg-cream/95 text-ink backdrop-blur md:h-18">
      <div className="mx-auto grid h-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] grid-rows-[64px_48px] items-center gap-x-8 px-5 md:flex md:justify-between md:px-6 lg:px-10">

        {/* Logo */}
        <Link href="/dashboard" className="flex shrink-0 items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral">
          <span className="flex size-10 items-center justify-center rounded-full bg-coral text-white shadow-sm">
            <HeartPulse aria-hidden="true" className="size-5" strokeWidth={2.25} />
          </span>
          <span className="text-lg font-semibold tracking-tight">OmniCare Caregiver</span>
        </Link>

        {/* Navigation */}
        <nav aria-label="Primary navigation" className="col-span-2 row-start-2 flex h-full min-w-0 items-center gap-1 overflow-x-auto text-sm md:flex-1 md:justify-center">
          {navigation.map((item) => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={item.href === '/visits' ? openCurrentVisit : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`shrink-0 rounded-full px-4 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral ${
                  isActive
                    ? 'bg-coral text-white'
                    : 'text-slate-600 hover:bg-coral-soft hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions Container */}
        <div className="col-start-2 row-start-1 flex items-center gap-3">
          {/* Logout */}
          <button
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
            className="flex shrink-0 items-center gap-2 rounded-full border border-ink/80 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-rose-600 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-coral"
          >
            <LogOut aria-hidden="true" className="size-4" strokeWidth={2.25} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>

      </div>
    </header>
  );
}

// --- BottomNav ---
const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/schedules', label: 'Schedule', icon: Calendar },
  { href: '/assessments', label: 'Assessments', icon: ClipboardList },
  { href: '/emergency', label: 'Emergency', icon: AlertTriangle, highlight: true },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 z-50">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center gap-1',
                item.highlight && 'relative',
                isActive ? item.href === '/schedules' ? 'text-teal' : 'text-teal-600' : 'text-slate-500'
              )}
            >
              {item.highlight && (
                <span className="absolute -top-6 w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                  <Icon className="w-7 h-7 text-white" />
                </span>
              )}
              {!item.highlight && <Icon className="w-6 h-6" />}
              <span className={clsx('text-xs', item.highlight && 'text-red-600 font-semibold')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// --- OfflineBanner ---
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const pathname = usePathname();
  
  if (isOnline || pathname === '/schedules' || pathname === '/check-in' || pathname === '/check-out' || pathname.startsWith('/visits/')) return null;
  
  return (
    <div className="border-b border-amber-200 bg-amber-50 py-2 text-center text-sm font-medium text-amber-800">
      You're offline. Data will sync when connection is restored.
    </div>
  );
}

// --- MobileLayout ---
export function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/caregiver-invitation' || pathname === '/complete_profile' || pathname === '/activation-complete';

  const isFullWidthPage = isAuthPage || pathname === '/schedules' || pathname === '/check-in' || pathname === '/check-out' || pathname === '/point-of-care' || pathname === '/visit-summary' || pathname === '/dashboard' || pathname.startsWith('/visits/');

  return (
    <div className="min-h-screen bg-cream pt-28 md:pt-18">
      <Header />
      <div className={isFullWidthPage ? 'w-full' : 'mx-auto max-w-md px-4 py-4'}>{children}</div>
    </div>
  );
}
