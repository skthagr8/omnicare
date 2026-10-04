'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/caregiver-invitation' || pathname === '/complete_profile' || pathname === '/activation-complete';

  const isFullWidthPage = isAuthPage || pathname === '/schedules' || pathname === '/check-in' || pathname === '/check-out' || pathname === '/point-of-care' || pathname === '/visit-summary' || pathname === '/dashboard' || pathname.startsWith('/visits/');

  return (
    <div className="min-h-screen bg-gray-50 pt-28 md:pt-18">
      <Header />
      <div className={isFullWidthPage ? 'w-full' : 'mx-auto max-w-md px-4 py-4'}>{children}</div>
    </div>
  );
}