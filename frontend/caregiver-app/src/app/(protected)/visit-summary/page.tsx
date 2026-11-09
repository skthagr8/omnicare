import type { Metadata } from 'next';
import { VisitSummaryScreen } from '../../../components/visit-summary/VisitSummary';

export const metadata: Metadata = {
	title: 'Visit Summary | OmniCare',
	referrer: 'no-referrer',
	robots: { index: false, follow: false },
};

export default function VisitSummaryPage() {
	return <VisitSummaryScreen />;
}