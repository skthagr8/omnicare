'use client';

import { useParams } from 'next/navigation';
import VisitTaskList from '@/components/tasks/VisitTaskList';

export default function VisitTasksPage() {
	const { sessionID } = useParams<{ sessionID: string }>();
	return <VisitTaskList key={sessionID} sessionId={sessionID} />;
}
