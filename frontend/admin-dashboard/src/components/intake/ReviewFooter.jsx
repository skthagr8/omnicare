'use client';

import { ArrowLeft, CheckCircle2, Send } from 'lucide-react';

export default function ReviewFooter({ accepted, onBack, onSubmit }) {
  return <div className="mt-5"><button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"><ArrowLeft className="h-3.5 w-3.5" />Return to Contacts</button><button type="button" onClick={onSubmit} disabled={!accepted} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F6B72] py-3 text-sm font-bold text-white shadow-[0_8px_18px_-10px_rgba(15,107,114,0.65)] transition-colors hover:bg-[#0d5b61] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"><Send className="h-4 w-4" />Submit Intake Record<CheckCircle2 className="h-4 w-4" /></button><p className="mt-3 text-center text-[10px] text-slate-400">Need to clarify a diagnosis? Contact the <span className="font-semibold text-[#0F6B72]">Clinical Informatics Desk</span>.</p></div>;
}
