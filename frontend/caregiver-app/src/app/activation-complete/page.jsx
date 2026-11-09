import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

export const metadata = {
	title: 'Account Active | OmniCare',
	referrer: 'no-referrer',
	robots: { index: false, follow: false },
};

export default function ActivationCompletePage() {
	return (
		<main className="caregiver-login flex min-h-svh items-center justify-center bg-linear-to-br from-teal-soft via-teal-soft to-[#fffbeb] px-6 py-12 text-[#115e56] sm:px-8">
			<div className="w-full max-w-md pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-center">
				<div aria-hidden="true" className="mx-auto mb-8 flex size-24 items-center justify-center rounded-full border border-[#b6e6df] bg-teal-soft shadow-[0_6px_20px_rgba(34,166,153,0.06)]">
					<Check className="size-12 text-teal" strokeWidth={2} />
				</div>
				<h1 className="text-[28px] leading-9 font-semibold">Your account is active</h1>
				<p className="mx-auto mt-4 max-w-80 text-base leading-7 text-[#334155]">You can now view your schedule and start your first visit</p>
				<Link href="/schedules" className="mt-9 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-teal px-5 py-4 text-base font-semibold text-white shadow-[0_4px_0_#1b8a7f,0_7px_16px_rgba(34,166,153,0.14)] transition-[translate,box-shadow,background-color] duration-150 hover:bg-[#1b8a7f] focus-visible:outline-2 focus-visible:outline-offset-6 focus-visible:outline-teal active:translate-y-0.5 active:shadow-[0_2px_0_#1b8a7f] motion-reduce:transition-none">
					Go to My Schedule <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
				</Link>
			</div>
		</main>
	);
}
