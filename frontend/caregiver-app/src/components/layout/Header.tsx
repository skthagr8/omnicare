'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HeartPulse, UserRound } from 'lucide-react';

const navigation = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/schedules', label: 'Schedule' },
  { href: '/check-in', label: 'Check In' },
  { href: '/visits/1', label: 'Visits' },
  { href: '/emergency', label: 'Emergency' },
];

export default function Header() {
  const pathname = usePathname();
  
  return (
    <header data-dashboard-header className="caregiver-login fixed inset-x-0 top-0 z-40 h-28 border-b border-[#dedfdd] bg-[#fdfcfb] text-[#303538] md:h-18">
      <div className="mx-auto grid h-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] grid-rows-[64px_48px] items-center gap-x-8 px-5 md:flex md:justify-between md:px-6 lg:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-lg font-bold focus-visible:outline-2 focus-visible:outline-[#287b7c]">
          <span className="flex size-9 items-center justify-center rounded-full bg-[#63afaf] text-white"><HeartPulse aria-hidden="true" className="size-5" /></span>OmniCare
        </Link>
        <nav aria-label="Primary navigation" className="col-span-2 row-start-2 flex h-full min-w-0 items-center gap-5 overflow-x-auto text-sm text-[#687174] md:gap-6">
          {navigation.map(item => {
            const isActive = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined} className={`flex h-full shrink-0 items-center border-b-2 py-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#287b7c] ${isActive ? 'border-[#63afaf] font-semibold text-[#287b7c]' : 'border-transparent hover:text-[#287b7c]'}`}>{item.label}</Link>;
          })}
        </nav>
        <Link href="/profile" aria-label="My profile" aria-current={pathname === '/profile' ? 'page' : undefined} title="My profile" className="col-start-2 row-start-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e3e9e1] text-[#536655] focus-visible:outline-2 focus-visible:outline-[#287b7c]"><UserRound aria-hidden="true" className="size-5" /></Link>
      </div>
    </header>
  );
}