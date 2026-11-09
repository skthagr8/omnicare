'use client';

import { useParams } from 'next/navigation';
import { VisitShell } from '../../../components/visits/Visits';

export default function PatientVisitPage() {
	const { sessionID } = useParams<{ sessionID: string }>();
	return <VisitShell key={sessionID} sessionId={sessionID} />;
}
