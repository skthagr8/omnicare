'use client';

import { useRouter } from 'next/navigation';

export default function CheckInButton({ visitId }: { visitId: string }) {
  const router = useRouter();
  
  return (
    <button
      onClick={() => router.push(`/visits/${visitId}/check-in`)}
      className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg"
    >
      Check In
    </button>
  );
}