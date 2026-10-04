import Link from 'next/link';
import { ArrowLeft, WifiOff } from 'lucide-react';
import { useVisitTasks } from '@/hooks/useVisitTasks';
import TaskListToolbar from './TaskListToolbar';
import VisitTaskCard from './VisitTaskCard';
import TaskActionDialog from './TaskActionDialog';

export default function VisitTaskList({ sessionId }: { sessionId: string }) {
	const list = useVisitTasks(sessionId);
	return <main className="caregiver-login min-h-svh bg-[#faf9f7] px-5 py-6 text-[#303538] sm:px-8"><div className="mx-auto max-w-4xl">
		<Link href={`/visits/${encodeURIComponent(sessionId)}`} className="mb-5 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#287b7c]"><ArrowLeft aria-hidden="true" className="size-4" />Back to patient care</Link>
		<TaskListToolbar list={list} />
		<div role="status" className="mb-3 min-h-6 text-xs text-[#737c77]">{!list.isOnline && <span className="flex items-center gap-2"><WifiOff aria-hidden="true" className="size-3.5" />Offline / Connect to save task changes</span>}</div>
		{list.loading && <p role="status" className="mb-5 text-sm text-[#737c77]">Loading visit tasks...</p>}
		{list.error && <p role="alert" className="mb-5 text-sm leading-6 text-[#79523e]">{list.error}</p>}
		{list.data && !list.data.tasksAvailable && <p role="status" className="mb-5 text-sm leading-6 text-[#737c77]">The task service is unavailable. No task records or changes can be verified.</p>}
		{list.data && list.data.visit.status !== 'in_progress' && <p className="mb-5 text-sm text-[#64716b]">This visit is not in progress. Task records are read-only.</p>}
		{list.saveError && <p role="alert" className="mb-5 text-sm leading-6 text-[#79523e]">{list.saveError}</p>}
		<p role="status" aria-live="polite" className="mb-3 text-sm text-[#587360]">{list.announcement}</p>
		<div className="space-y-5">{list.tasks.map(task => <VisitTaskCard key={task.id} task={task} disabled={!list.canWrite} onAction={list.openAction} />)}</div>
		{!list.loading && !list.error && list.data?.tasksAvailable && !list.tasks.length && <p role="status" className="py-12 text-center text-sm text-[#737c77]">{list.data.tasks.length ? 'No tasks match this view.' : 'No tasks recorded for this visit.'}</p>}
		<TaskActionDialog list={list} />
	</div></main>;
}