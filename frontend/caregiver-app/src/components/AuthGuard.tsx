'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../services/api';
import { PORTAL } from '../libs/portal';
import { endSession } from '../libs/session';

export default function AuthGuard({ children }: { children: ReactNode }) {
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