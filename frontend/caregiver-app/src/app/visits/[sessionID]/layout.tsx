import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Patient Visit | OmniCare',
	referrer: 'no-referrer',
	robots: { index: false, follow: false },
};

export default function PatientVisitLayout({ children }: { children: React.ReactNode }) {
	return children;
}