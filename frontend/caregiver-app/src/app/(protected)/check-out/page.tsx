import type { Metadata } from 'next';
import { CheckOutScreen } from '../../../components/check-out/CheckOut';

export const metadata: Metadata = {
	title: 'Check Out | OmniCare',
	referrer: 'no-referrer',
	robots: { index: false, follow: false },
};

export default function CheckOutPage() {
	return <CheckOutScreen />;
}