import type { Metadata } from 'next';
import { CheckInScreen } from '../../../components/check-in/CheckIn';

export const metadata: Metadata = {
	title: 'Check In | OmniCare',
	referrer: 'no-referrer',
	robots: { index: false, follow: false },
};

export default function CheckInPage() {
	return <CheckInScreen />;
}