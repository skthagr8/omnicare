import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

export default function ActivationCompletePage() {
	return (
		<main className="caregiver-login flex min-h-svh items-center justify-center bg-linear-to-br from-[#def3ee] via-[#f1f7ed] to-[#fff8ec] px-6 py-12 text-[#203f3b] sm:px-8">
			<div className="w-full max-w-md pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-center">
				<div aria-hidden="true" className="mx-auto mb-8 flex size-24 items-center justify-center rounded-full border border-[#b9dbce] bg-[#d4ebe2] shadow-[0_6px_20px_rgba(22,119,110,0.06)]">
					<Check className="size-12 text-[#32877c]" strokeWidth={2} />
				</div>
				<h1 className="text-[28px] leading-9 font-semibold">Your account is active</h1>
				<p className="mx-auto mt-4 max-w-80 text-base leading-7 text-[#57716b]">You can now view your schedule and start your first visit</p>
				<Link href="/schedules" className="mt-9 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#16776e] px-5 py-4 text-base font-bold text-white shadow-[0_4px_0_#105a53,0_7px_16px_rgba(22,119,110,0.14)] transition-[translate,box-shadow,background-color] duration-150 hover:bg-[#126a62] focus-visible:outline-2 focus-visible:outline-offset-6 focus-visible:outline-[#16776e] active:translate-y-0.5 active:shadow-[0_2px_0_#105a53] motion-reduce:transition-none">
					Go to My Schedule <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
				</Link>
			</div>
		</main>
	);
}
