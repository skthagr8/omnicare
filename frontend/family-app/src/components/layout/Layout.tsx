'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, CircleHelp, HeartPulse, LogOut, Phone, ShieldCheck } from 'lucide-react';
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

// --- Logo ---
export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral text-white shadow-sm">
        <HeartPulse className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="text-lg font-semibold tracking-tight text-ink">OmniCare Family</span>
    </Link>
  );
}

// --- Avatar (initials; no photo storage yet) ---
const AVATAR_SIZES = { sm: 'h-10 w-10 text-xs', md: 'h-14 w-14 text-sm', lg: 'h-32 w-32 text-3xl' };

export function Avatar({ name, size = 'md', online }: { name: string; size?: keyof typeof AVATAR_SIZES; online?: boolean }) {
  const initials = name
    .replace(/^.*:\s*/, '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={`flex items-center justify-center rounded-full border-4 border-white bg-linear-to-br from-teal to-coral font-semibold text-white shadow ${AVATAR_SIZES[size]}`}
      >
        {initials}
      </span>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-slate-300'}`}
        />
      )}
    </span>
  );
}

// --- Page states (loading / error / empty) ---
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-coral border-t-transparent" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto my-16 max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
      {message}
      {onRetry && (
        <button onClick={onRetry} className="mt-4 block w-full font-semibold text-red-800 hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-coral/40 bg-white/40 px-6 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="mt-2 text-sm text-slate-500">{children}</p>}
    </div>
  );
}

// --- Support / Contact links (shared with the login page) ---
export function HelpLinks() {
  return (
    <div className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
      <a href="#" className="flex items-center gap-1.5 hover:text-ink">
        <CircleHelp className="h-4 w-4" /> Support
      </a>
      <a href="#" className="flex items-center gap-1.5 hover:text-ink">
        <Phone className="h-4 w-4" /> Contact
      </a>
    </div>
  );
}

// --- Header ---
const NAV_ITEMS = [
  { label: 'Visits', href: '/visits' },
];

interface FamilyHeaderProps {
  user?: {
    full_name: string;
    email: string;
    role: string;
  };
}

export function FamilyHeader({ user }: FamilyHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = user?.full_name || 'Family member';
  const initials =
    user?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'F';

  const handleLogout = () => {
    endSession();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-coral-soft bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-4">
        <Logo />

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ label, href }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'bg-coral text-white' : 'text-slate-600 hover:bg-coral-soft hover:text-ink'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-6">
          <HelpLinks />
          <span className="hidden h-5 w-px bg-coral-soft sm:block" />

          <div className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full border border-ink/80 py-1 pl-1 pr-3 text-sm font-medium text-ink hover:bg-white"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal text-[11px] font-semibold text-white">
                {initials}
              </span>
              <span className="hidden max-w-32 truncate md:inline">{displayName}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-coral-soft bg-white p-1 shadow-lg">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate text-xs font-semibold text-ink">{displayName}</p>
                    <p className="truncate text-[11px] text-slate-400">{user?.email || ''}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// --- Footer ---
export function FamilyFooter() {
  return (
    <footer className="border-t border-coral-soft">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="font-semibold uppercase tracking-[0.14em] text-slate-400">OmniCare Family</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> HIPAA Compliant Platform
          </span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-ink">Emergency Protocols</a>
          <a href="#" className="hover:text-ink">Support Center</a>
          <a href="#" className="hover:text-ink">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}
