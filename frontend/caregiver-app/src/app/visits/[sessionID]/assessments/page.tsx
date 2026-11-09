import type { Metadata } from 'next';
import { VisitAssessmentsRoute } from '../../../../components/assessments/Assessments';

export const metadata: Metadata = { title: 'Visit Assessments | OmniCare' };

export default function VisitAssessmentsPage() {
	return <VisitAssessmentsRoute />;
}
