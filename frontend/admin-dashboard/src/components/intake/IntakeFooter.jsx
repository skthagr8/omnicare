'use client';

import { ArrowLeft, ArrowRight, Save } from 'lucide-react';

export default function IntakeFooter({ onPrevious, onNext, previousLabel = 'Previous Step', nextLabel = 'Next Component' }) {
  return <footer className="border-t border-slate-200 bg-white px-8 py-5"><div className="mx-auto flex max-w-6xl items-center justify-between"><button onClick={onPrevious} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-50"><ArrowLeft className="h-3.5 w-3.5" />{previousLabel}</button><div className="flex items-center gap-6"><button className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"><Save className="h-3.5 w-3.5" />Save Draft</button><button onClick={onNext} className="flex items-center gap-2 rounded-lg bg-[#0F6B72] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#0d5b61]">{nextLabel}<ArrowRight className="h-3.5 w-3.5" /></button></div></div></footer>;
}
