import { ShieldCheck } from 'lucide-react';
import type { CheckInSession } from '@/services/checkIn';

export default function CheckInToast({ receipt }: { receipt: CheckInSession | null }) {
	return (
		<div role="status" aria-live="polite" aria-atomic="true" className="pointer-events-none fixed right-5 bottom-[max(1rem,env(safe-area-inset-bottom))] left-5 z-50 mx-auto max-w-lg">
			{receipt && <div className={`check-in-toast flex items-center gap-3 rounded-lg border px-5 py-4 text-sm leading-6 shadow-[0_8px_28px_rgba(74,63,30,0.12)] ${receipt.check_in_geofence_verified === false ? 'border-[#e6d7b1] bg-[#fff2d6] text-[#6f5830]' : 'border-[#bdd8c6] bg-[#edf6ed] text-[#28533c]'}`}><ShieldCheck aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.5} /><span>{receipt.check_in_geofence_verified === false ? 'Checked in \u2014 location manually verified' : 'Checked in \u2014 your arrival is recorded'}</span></div>}
			<style>{`
				@keyframes check-in-toast-enter { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
				.check-in-toast { animation: check-in-toast-enter .3s ease-out both; }
				@media (prefers-reduced-motion: reduce) { .check-in-toast { animation: none; } }
			`}</style>
		</div>
	);
}