import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Stethoscope, WifiOff } from 'lucide-react';
import InstrumentCard from '@/components/point-of-care/InstrumentCard';
import { useAssessmentList } from '@/hooks/useAssessmentList';
import { itemEntries } from '@/services/assessmentList';
import AssessmentListToolbar from './AssessmentListToolbar';
import AssessmentOverflowMenu from './AssessmentOverflowMenu';
import AssessmentListDialog from './AssessmentListDialog';

export default function VisitAssessmentList({ sessionId }: { sessionId: string }) {
	const router = useRouter();
	const list = useAssessmentList(sessionId);
	return <main className="caregiver-login min-h-svh bg-[#faf9f7] px-5 py-6 text-[#303538] sm:px-8"><div className="mx-auto max-w-4xl">
		<Link href={`/visits/${encodeURIComponent(sessionId)}`} className="mb-5 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#287b7c]"><ArrowLeft aria-hidden="true" className="size-4" />Back to patient care</Link>
		<AssessmentListToolbar list={list} />
		<div role="status" className="mb-3 min-h-6 text-xs text-[#737c77]">{!list.isOnline && <span className="flex items-center gap-2"><WifiOff aria-hidden="true" className="size-3.5" />Offline / Connect to save assessment changes</span>}</div>
		{list.loading && <p role="status" className="mb-5 text-sm text-[#737c77]">Loading assessments...</p>}
		{list.error && <p role="alert" className="mb-5 text-sm text-[#79523e]">{list.error}</p>}
		{list.data?.recordsError && <p role="alert" className="mb-5 text-sm text-[#79523e]">{list.data.recordsError}</p>}
		{list.data && !list.data.managedItemsAvailable && <p className="mb-5 text-xs leading-6 text-[#737c77]">Template assessments shown. Due times and ad-hoc items are unavailable until the visit assessment service is connected.</p>}
		{list.data?.visit.status !== 'in_progress' && list.data && <p className="mb-5 text-sm text-[#64716b]">This visit is not in progress. Assessments are read-only.</p>}
		{list.saveError && <p role="alert" className="mb-5 text-sm leading-6 text-[#79523e]">{list.saveError}</p>}
		<p role="status" aria-live="polite" className="mb-3 text-sm text-[#587360]">{list.announcement}</p>
		<div className="space-y-5">{list.visibleItems.map(item => {
			const current = itemEntries(item)[0];
			return <div key={item.id}><InstrumentCard instrument={{ id: item.id, name: item.instrument.name, fullName: item.instrument.full_name, description: item.instrument.description, icon: Stethoscope }} current={current} lastRecorded={current} available={!list.loading && !list.error && !list.data?.recordsError} disabled={!list.canWrite} onAction={(_, state) => list.openEntry(item, state)} secondaryActions={<AssessmentOverflowMenu name={item.instrument.name} canWrite={list.canWrite} canEdit={list.canWrite && Boolean(current)} onAdd={() => list.openPicker(item.instrument.id)} onEdit={() => { if (current) list.openEntry(item, current.state, current); }} onHistory={() => router.push(`/visits/${encodeURIComponent(sessionId)}/assessments/assessmentType/History?instrument=${encodeURIComponent(item.instrument.backend_type || item.instrument.id)}`)} />} /><p className="mt-2 px-2 text-xs text-[#737c77]">Due: {item.due_at ? new Date(item.due_at).toLocaleString() : 'Not specified'}</p></div>;
		})}</div>
		{!list.loading && !list.error && !list.visibleItems.length && <p role="status" className="py-12 text-center text-sm text-[#737c77]">No assessments match this view.</p>}
		<AssessmentListDialog list={list} />
	</div></main>;
}