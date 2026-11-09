'use client';

import { useEffect, useState } from 'react';
import { AuthGuard, FamilyHeader, FamilyFooter } from '../../components/layout/Layout';
import { apiClient } from '../../services/api';

interface UserProfile {
  full_name: string;
  email: string;
  role: string;
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | undefined>(undefined);

  useEffect(() => {
    // Single point of user profile data fetching
    apiClient
      .get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch((err) => console.error('[ProtectedLayout] Failed to fetch profile:', err));
  }, []);

  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col bg-cream">
        <FamilyHeader user={user} />
        <main className="flex-1">{children}</main>
        <FamilyFooter />
      </div>
    </AuthGuard>
  );
}
