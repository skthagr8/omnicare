import type { QueueVisit } from '@/services/schedule';

export type QueueSort = 'time' | 'risk' | 'status';

export function sortPatientQueue(visits: QueueVisit[], sort: QueueSort, currentTime: number) {
	const chronological = [...visits].sort((first, second) => Date.parse(first.scheduled_start) - Date.parse(second.scheduled_start) || first.id.localeCompare(second.id));
	const active = chronological.find(visit => visit.status === 'in_progress')
		|| chronological.find(visit => visit.status === 'scheduled' && Date.parse(visit.scheduled_start) <= currentTime && Date.parse(visit.scheduled_end) > currentTime);
	const riskOrder = { high: 0, moderate: 1, low: 2, unknown: 3 };
	const statusOrder = { in_progress: 0, scheduled: 1, completed: 2, missed: 3, cancelled: 4 };
	const sorted = [...chronological].sort((first, second) => {
		if (first.id === active?.id) return -1;
		if (second.id === active?.id) return 1;
		const difference = sort === 'risk' ? riskOrder[first.fall_risk] - riskOrder[second.fall_risk] : sort === 'status' ? statusOrder[first.status] - statusOrder[second.status] : 0;
		return difference || Date.parse(first.scheduled_start) - Date.parse(second.scheduled_start) || first.id.localeCompare(second.id);
	});
	return { visits: sorted, activeId: active?.id };
}