import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function CareEmergencyButton() {
	return <div className="fixed inset-x-0 bottom-0 z-30 h-28 border-t border-[#e7e9e3] bg-[#faf9f7]"><Link href="/emergency" aria-label="Emergency" title="Emergency" className="fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex size-20 flex-col items-center justify-center gap-1 rounded-full border-4 border-[#fffefa] bg-[#B23A48] text-white shadow-[0_6px_24px_rgba(178,58,72,0.25)] hover:bg-[#972f3c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B23A48] active:scale-95 motion-reduce:transition-none sm:right-7"><AlertTriangle aria-hidden="true" className="size-6" strokeWidth={1.75} /><span className="text-[10px] font-bold">Emergency</span></Link></div>;
}