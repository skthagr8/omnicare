'use client';

import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';
import Header from './Header';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login';

  if (isAuthPage) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-gray-50">
      <Header />
      <main className="flex-1 overflow-y-auto pb-20 px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}