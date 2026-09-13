'use client';

import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-indigo-600">
              {user?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-lg">{user?.full_name}</h3>
            <p className="text-gray-600">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Role</span>
            <span className="font-medium">{user?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Phone</span>
            <span className="font-medium">{user?.phone || 'Not set'}</span>
          </div>
        </div>
      </div>

      <button
        onClick={logout}
        className="w-full py-3 bg-red-50 text-red-600 font-semibold rounded-lg"
      >
        Logout
      </button>
    </div>
  );
}