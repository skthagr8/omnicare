'use client';

import { useParams } from 'next/navigation';
import VisitMedicationList from '@/components/medications/VisitMedicationList';

export default function VisitMedicationsPage() {
	const { sessionID } = useParams<{ sessionID: string }>();
	return <VisitMedicationList key={sessionID} sessionId={sessionID} />;
}
