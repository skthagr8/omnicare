'use client';

import { RefreshCw, WifiOff } from 'lucide-react';
import {
	AssessmentDialog,
	CareEmergencyButton,
	CarePanel,
	CareTabs,
	CareVisitHeader,
} from '../../../components/point-of-care/PointOfCare';
import { usePointOfCare } from '../../../hooks/useVisitFlow';

export default function PointOfCarePage() {
	const care = usePointOfCare();
	return (
		<main className="caregiver-login h-[calc(100svh-224px)] overflow-y-auto overscroll-contain bg-cream pb-8 text-ink md:h-[calc(100svh-184px)]">
			<CareVisitHeader visit={care.visit} loading={care.loading} />
			<div className="mx-auto max-w-3xl px-5 pt-6 sm:px-8">
				<CareTabs activeTab={care.tab} onChange={care.setTab} />
				<div className="mb-4 flex min-h-8 flex-wrap items-center justify-between gap-3"><p role="status" className="flex items-center gap-2 text-xs text-[#475569]">{!care.isOnline && <><WifiOff aria-hidden="true" className="size-3.5" />Offline · Connect to save care records</>}</p><button type="button" onClick={care.refreshVisit} disabled={care.loading || care.saving || !care.isOnline} aria-label="Refresh visit" title="Refresh visit" className="flex size-10 items-center justify-center rounded-lg text-[#334155] hover:bg-teal-soft disabled:opacity-50"><RefreshCw aria-hidden="true" className={`size-4 ${care.loading ? 'animate-spin motion-reduce:animate-none' : ''}`} /></button></div>
				{care.loading && <p role="status" className="mb-4 text-sm text-[#334155]">Loading visit records...</p>}
				{care.error && <p role="alert" className="mb-5 text-sm leading-6 text-[#b45309]">{care.error}</p>}
				{!care.loading && !care.error && !care.visit && <p role="status" className="mb-5 text-sm text-[#334155]">No active visit is available. Select a visit from your schedule.</p>}
				{care.visit && care.visit.status !== 'in_progress' && <p role="status" className="mb-5 text-sm leading-6 text-[#334155]">{care.visit.status === 'scheduled' ? 'Confirm your arrival before recording assessments.' : 'This visit is not in progress. Records are read-only.'}</p>}
				{care.saveError && <p role="alert" className="mb-5 text-sm leading-6 text-[#b45309]">{care.saveError}</p>}
				<p role="status" aria-live="polite" className="mb-3 text-sm font-medium text-[#334155]">{care.announcement}</p>
				<CarePanel care={care} />
			</div>
			<AssessmentDialog action={care.action} saving={care.saving} onClose={care.closeAction} onSave={care.recordAssessment} />
			<CareEmergencyButton />
		</main>
	);
}
