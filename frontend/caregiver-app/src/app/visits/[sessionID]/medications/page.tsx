import type { Metadata } from 'next';
import { VisitMedicationsRoute } from '../../../../components/medications/Medications';

export const metadata: Metadata = { title: 'Visit Medication | OmniCare' };

export default function VisitMedicationsPage() {
	return <VisitMedicationsRoute />;
}