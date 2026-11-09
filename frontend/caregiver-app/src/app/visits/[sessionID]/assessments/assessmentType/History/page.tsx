import type { Metadata } from 'next';
import { InstrumentHistoryRoute } from '../../../../../../components/assessments/Assessments';

export const metadata: Metadata = { title: 'Instrument History | OmniCare' };

export default function InstrumentHistoryPage() {
	return <InstrumentHistoryRoute />;
}