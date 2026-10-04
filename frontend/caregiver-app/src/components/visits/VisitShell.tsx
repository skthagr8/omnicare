import { RefreshCw, WifiOff } from 'lucide-react';
import Link from 'next/link';
import AssessmentDialog from '@/components/point-of-care/AssessmentDialog';
import CareEmergencyButton from '@/components/point-of-care/CareEmergencyButton';
import CarePanel from '@/components/point-of-care/CarePanel';
import CareTabs from '@/components/point-of-care/CareTabs';
import { useVisitShell } from '@/hooks/useVisitShell';
import PatientVisitHeader from './PatientVisitHeader';
import PatientHistory from './PatientHistory';

export default function VisitShell({ sessionId }: { sessionId: string }) {
	const shell = useVisitShell(sessionId);
	const { care } = shell;
	return <main className="caregiver-login flex h-[calc(100svh-224px)] flex-col bg-[#faf9f7] text-[#303538] md:h-[calc(100svh-184px)]">
		<div className="max-h-[55%] shrink-0 overflow-y-auto"><PatientVisitHeader shell={shell} /></div>
		<div role="status" aria-live="polite" className="flex min-h-9 shrink-0 items-center gap-2 border-b border-[#e4e8e1] bg-[#f3f6f1] px-5 text-xs text-[#68766d] sm:px-8">{!care.isOnline && <><WifiOff aria-hidden="true" className="size-3.5 shrink-0" />Offline / Showing loaded records. Connect to save care updates.</>}</div>
		<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><div className="mx-auto max-w-3xl px-5 pt-6 pb-8 sm:px-8">
			<CareTabs activeTab={care.tab} onChange={care.setTab} includeHistory />
			{care.tab === 'tasks' && <Link href={`/visits/${encodeURIComponent(sessionId)}/tasks`} className="mb-4 inline-flex min-h-11 items-center text-xs font-semibold text-[#287b7c] underline underline-offset-4">Manage visit tasks</Link>}
			{care.tab === 'assessments' && <Link href={`/visits/${encodeURIComponent(sessionId)}/assessments`} className="mb-4 inline-flex min-h-11 items-center text-xs font-semibold text-[#287b7c] underline underline-offset-4">Manage assessments</Link>}
			{care.tab === 'medication' && <Link href={`/visits/${encodeURIComponent(sessionId)}/medications`} className="mb-4 inline-flex min-h-11 items-center text-xs font-semibold text-[#287b7c] underline underline-offset-4">Medication list &amp; full schedule</Link>}
			<div className="mb-3 flex items-center justify-between gap-3"><p role="status" className="text-xs text-[#737c77]">{care.loading ? 'Loading visit records...' : shell.queueError}</p><button type="button" disabled={care.loading || care.saving || !care.isOnline} onClick={care.refreshVisit} aria-label="Refresh visit" className="flex size-10 items-center justify-center rounded-lg text-[#64716b] disabled:opacity-50"><RefreshCw aria-hidden="true" className="size-4" /></button></div>
			{care.error && <p role="alert" className="mb-5 text-sm leading-6 text-[#79523e]">{care.error}</p>}
			{care.saveError && <p role="alert" className="mb-5 text-sm leading-6 text-[#79523e]">{care.saveError}</p>}
			{care.visit?.status === 'scheduled' && care.tab !== 'history' && <p className="mb-5 text-sm text-[#64716b]">Confirm your arrival before recording assessments.</p>}
			<p role="status" aria-live="polite" className="mb-3 text-sm text-[#587360]">{care.announcement}</p>
			{care.tab === 'history' ? <PatientHistory shell={shell} /> : <CarePanel care={care} />}
		</div></div>
		<AssessmentDialog action={care.action} saving={care.saving} onClose={care.closeAction} onSave={care.recordAssessment} />
		<CareEmergencyButton />
	</main>;
}