'use client';

import { RefreshCw, WifiOff } from 'lucide-react';
import AssessmentDialog from '@/components/point-of-care/AssessmentDialog';
import CareEmergencyButton from '@/components/point-of-care/CareEmergencyButton';
import CarePanel from '@/components/point-of-care/CarePanel';
import CareTabs from '@/components/point-of-care/CareTabs';
import CareVisitHeader from '@/components/point-of-care/CareVisitHeader';
import { usePointOfCare } from '@/hooks/usePointOfCare';

export default function PointOfCarePage() {
	const care = usePointOfCare();
	return (
		<main className="caregiver-login h-[calc(100svh-224px)] overflow-y-auto overscroll-contain bg-[#faf9f7] pb-8 text-[#303538] md:h-[calc(100svh-184px)]">
			<CareVisitHeader visit={care.visit} loading={care.loading} />
			<div className="mx-auto max-w-3xl px-5 pt-6 sm:px-8">
				<CareTabs activeTab={care.tab} onChange={care.setTab} />
				<div className="mb-4 flex min-h-8 flex-wrap items-center justify-between gap-3"><p role="status" className="flex items-center gap-2 text-xs text-[#737c77]">{!care.isOnline && <><WifiOff aria-hidden="true" className="size-3.5" />Offline · Connect to save care records</>}</p><button type="button" onClick={care.refreshVisit} disabled={care.loading || care.saving || !care.isOnline} aria-label="Refresh visit" title="Refresh visit" className="flex size-10 items-center justify-center rounded-lg text-[#64716b] hover:bg-[#eff4ef] disabled:opacity-50"><RefreshCw aria-hidden="true" className={`size-4 ${care.loading ? 'animate-spin motion-reduce:animate-none' : ''}`} /></button></div>
				{care.loading && <p role="status" className="mb-4 text-sm text-[#64716b]">Loading visit records...</p>}
				{care.error && <p role="alert" className="mb-5 text-sm leading-6 text-[#79523e]">{care.error}</p>}
				{!care.loading && !care.error && !care.visit && <p role="status" className="mb-5 text-sm text-[#64716b]">No active visit is available. Select a visit from your schedule.</p>}
				{care.visit && care.visit.status !== 'in_progress' && <p role="status" className="mb-5 text-sm leading-6 text-[#64716b]">{care.visit.status === 'scheduled' ? 'Confirm your arrival before recording assessments.' : 'This visit is not in progress. Records are read-only.'}</p>}
				{care.saveError && <p role="alert" className="mb-5 text-sm leading-6 text-[#79523e]">{care.saveError}</p>}
				<p role="status" aria-live="polite" className="mb-3 text-sm font-medium text-[#587360]">{care.announcement}</p>
				<CarePanel care={care} />
			</div>
			<AssessmentDialog action={care.action} saving={care.saving} onClose={care.closeAction} onSave={care.recordAssessment} />
			<CareEmergencyButton />
		</main>
	);
}
