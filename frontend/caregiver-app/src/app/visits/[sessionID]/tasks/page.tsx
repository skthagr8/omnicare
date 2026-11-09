import type { Metadata } from 'next';
import { VisitTasksRoute } from '../../../../components/tasks/Tasks';

export const metadata: Metadata = { title: 'Visit Tasks | OmniCare' };

export default function VisitTasksPage() {
	return <VisitTasksRoute />;
}