import { VISIT_DEMO_MODE } from '@/services/visitDemo';

export const metadata = {
	title: 'Patient Visit | OmniCare',
	referrer: 'no-referrer',
	robots: { index: false, follow: false },
};

export default function PatientVisitLayout({ children }: { children: React.ReactNode }) {
	return <>{VISIT_DEMO_MODE && <div role="status" className="caregiver-login sticky top-28 z-30 border-b border-[#e9d39e] bg-[#fff5d9] px-4 py-2 text-center text-xs font-semibold text-[#785716] md:top-18">DEMO DATA / Synthetic examples only / No clinical changes are saved</div>}{children}</>;
}