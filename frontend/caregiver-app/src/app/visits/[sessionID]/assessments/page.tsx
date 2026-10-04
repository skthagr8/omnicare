'use client';

import { useParams } from 'next/navigation';
import VisitAssessmentList from '@/components/assessments/VisitAssessmentList';

export default function VisitAssessmentsPage() {
	const { sessionID } = useParams<{ sessionID: string }>();
	return <VisitAssessmentList key={sessionID} sessionId={sessionID} />;
}
