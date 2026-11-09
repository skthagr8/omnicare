'use client';

import { PatientQueue } from '../../../components/schedules/Schedules';
import { useSchedule } from '../../../hooks/useSchedule';

export default function SchedulesPage() {
	const schedule = useSchedule();

	return (
		<main data-web-schedule className="caregiver-login min-h-svh bg-cream text-ink">
			<PatientQueue schedule={schedule} />
		</main>
	);
}