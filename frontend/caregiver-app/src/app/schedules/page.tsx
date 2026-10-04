'use client';

import PatientQueue from '@/components/schedules/PatientQueue';
import { useSchedule } from '@/hooks/useSchedule';

export default function SchedulesPage() {
	const schedule = useSchedule();

	return (
		<main data-web-schedule className="caregiver-login min-h-svh bg-[#faf9f7] text-[#303538]">
			<PatientQueue schedule={schedule} />
		</main>
	);
}
