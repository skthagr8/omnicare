'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarClock,
  ShieldAlert,
  MessageSquareWarning,
  FileBarChart2,
  Boxes,
  LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Patients', href: '/patients', icon: Users },
  { label: 'Intake', href: '/intake', icon: UserPlus },
  { label: 'Scheduling', href: '/scheduling', icon: CalendarClock },
  { label: 'Resource Mgmt', href: '/resource-mgmt', icon: Boxes },
  { label: 'Risk Panel', href: '/risk-panel', icon: ShieldAlert },
  { label: 'Disputes', href: '/disputes', icon: MessageSquareWarning },
  { label: 'Reports', href: '/reports', icon: FileBarChart2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-[#1B2733] text-slate-300">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F6B72] text-white shadow-[0_0_16px_rgba(15,107,114,0.55)]">
          <Activity className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">OmniCare</p>
          <p className="text-[10px] font-medium tracking-[0.16em] text-slate-400">OPERATIONS</p>
        </div>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                active
                  ? 'bg-white/8 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[#14B8AA] shadow-[0_0_10px_rgba(20,184,170,0.8)]" />
              )}
              <Icon
                className={`h-4 w-4 ${active ? 'text-[#14B8AA] drop-shadow-[0_0_6px_rgba(20,184,170,0.65)]' : ''}`}
                strokeWidth={2}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            System Health
          </p>
          <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
            <span>Network Latency</span>
            <span className="text-slate-300">12ms</span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[22%] rounded-full bg-emerald-400" />
          </div>
        </div>
        <button className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-100">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
