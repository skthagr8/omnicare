'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, ClipboardList, AlertTriangle, User } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/visits', label: 'Visits', icon: Calendar },
  { href: '/assessments', label: 'Assessments', icon: ClipboardList },
  { href: '/emergency', label: 'Emergency', icon: AlertTriangle, highlight: true },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-5 h-16">
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
                isActive ? 'text-indigo-600' : 'text-gray-500'
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