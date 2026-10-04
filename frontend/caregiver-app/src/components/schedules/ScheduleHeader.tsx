import Link from 'next/link';
import { HeartPulse, UserRound } from 'lucide-react';

export default function ScheduleHeader() {
	return (
		<header className="border-b border-[#dedfdd] bg-[#fdfcfb]">
			<div className="mx-auto flex min-h-18 max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-3 lg:px-10">
				<Link href="/" className="flex items-center gap-2.5 text-lg font-bold"><span className="flex size-9 items-center justify-center rounded-full bg-[#63afaf] text-white"><HeartPulse aria-hidden="true" className="size-5" /></span>OmniCare</Link>
				<nav aria-label="Primary navigation" className="order-3 flex w-full items-center gap-6 overflow-x-auto text-sm text-[#687174] md:order-0 md:w-auto">
					<Link href="/" className="py-2 hover:text-[#287b7c]">Dashboard</Link>
					<Link href="/schedules" aria-current="page" className="border-b-2 border-[#63afaf] py-2 font-semibold text-[#287b7c]">Schedule</Link>
					<Link href="/assessments" className="py-2 hover:text-[#287b7c]">Assessments</Link>
					<Link href="/emergency" className="py-2 hover:text-[#287b7c]">Emergency</Link>
				</nav>
				<Link href="/profile" aria-label="My profile" title="My profile" className="flex size-10 items-center justify-center rounded-full bg-[#e3e9e1] text-[#536655] focus-visible:outline-2 focus-visible:outline-[#287b7c]"><UserRound aria-hidden="true" className="size-5" /></Link>
			</div>
		</header>
	);
}