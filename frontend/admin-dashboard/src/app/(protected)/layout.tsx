'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import Sidebar from '../../components/layout/Sidebar'; 
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
      <div className="flex h-screen bg-slate-100 overflow-hidden">
        {/* Left Fixed Sidebar */}
        <Sidebar />

        {/* Right Section */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Header across all pages */}
          <DashboardHeader user={user} />

          {/* Dynamic page content injected here */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}