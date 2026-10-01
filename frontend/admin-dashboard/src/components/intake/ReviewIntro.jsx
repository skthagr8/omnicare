import { ClipboardCheck, ShieldCheck } from 'lucide-react';

export default function ReviewIntro() {
  return <section className="rounded-xl border border-[#CBE4E7] bg-[#F1FAFB] px-8 py-5 text-center"><div className="mx-auto flex h-20 w-32 items-center justify-center bg-white/70 text-[#0F6B72]"><ClipboardCheck className="h-12 w-12" strokeWidth={1.2} /></div><h2 className="mt-4 text-sm font-bold text-[#173E43]">Ready for Submission</h2><p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-[#39727A]">Please review all captured patient data for accuracy before finalizing the clinical record.</p><div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#0F6B72]"><ShieldCheck className="h-3.5 w-3.5" />Secure review environment</div></section>;
}
