'use client';

import { useParams } from 'next/navigation';
import VisitShell from '@/components/visits/VisitShell';

export default function PatientVisitPage() {
	const { sessionID } = useParams<{ sessionID: string }>();
	return <VisitShell key={sessionID} sessionId={sessionID} />;
}
