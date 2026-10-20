'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import FamilyShareAction from '@/components/visit-summary/FamilyShareAction';
import RecordedCareSections from '@/components/visit-summary/RecordedCareSections';
import SummaryHeading from '@/components/visit-summary/SummaryHeading';
import SummaryObservations from '@/components/visit-summary/SummaryObservations';
import { useVisitSummary } from '@/hooks/useVisitSummary';

export default function VisitSummaryPage() {
	const summary = useVisitSummary();
	return (
		<main className="caregiver-login min-h-svh bg-[#fdfdfb] pb-[max(2.5rem,env(safe-area-inset-bottom))] text-[#303a34]">
			<SummaryHeading visit={summary.visit} loading={summary.loading} completed={summary.completed} durationMinutes={summary.durationMinutes} />
			<div className="mx-auto max-w-6xl px-5 sm:px-8">
				<div className="flex min-h-18 items-center justify-between gap-4 py-4"><p role="status" className="text-xs leading-5 text-[#737c77]">{summary.loading ? 'Loading recorded care...' : summary.visit ? 'Visit record' : 'No completed visit selected'}</p><button type="button" onClick={summary.refreshSummary} disabled={summary.loading || summary.sending || !summary.isOnline} aria-label="Refresh summary" title="Refresh summary" className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[#66756d] hover:bg-[#f0f4ed] focus-visible:outline-2 focus-visible:outline-[#287b7c] disabled:opacity-50"><RefreshCw aria-hidden="true" className={`size-4 ${summary.loading ? 'animate-spin motion-reduce:animate-none' : ''}`} /></button></div>
				{summary.error && <p role="alert" className="mb-5 text-sm leading-6 text-[#79523e]">{summary.error}</p>}
				{summary.data?.contentError && <p role="status" className="mb-5 text-sm leading-6 text-[#737c77]">{summary.data.contentError}</p>}
				{!summary.loading && !summary.visit && !summary.error && <p className="mb-6 text-sm leading-6 text-[#737c77]">There are no completed visits available. <Link href="/schedules" className="font-semibold text-[#287b7c] underline underline-offset-4">Back to schedule</Link></p>}
				<div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] lg:gap-10"><RecordedCareSections content={summary.data?.content} assessments={summary.data?.assessments || []} assessmentError={summary.data?.assessmentError || ''} assessmentsAvailable={Boolean(summary.data?.visit && !summary.loading && !summary.error && !summary.data.assessmentError)} /><SummaryObservations content={summary.data?.content} /></div>
				<FamilyShareAction summary={summary} />
			</div>
		</main>
	);
}
