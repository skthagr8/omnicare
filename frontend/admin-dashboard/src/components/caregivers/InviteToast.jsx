'use client';

import { CheckCircle2 } from 'lucide-react';

export default function InviteToast({ message }) {
  if (!message) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex justify-end">
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_16px_40px_-16px_rgba(15,23,42,0.35)]">
        <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
        {message}
      </div>
    </div>
  );
}
