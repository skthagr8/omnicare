import Link from 'next/link';
import { Clock3, RefreshCw } from 'lucide-react';
import type { useVisitShell } from '@/hooks/useVisitShell';

export default function PatientHistory({ shell }: { shell: ReturnType<typeof useVisitShell> }) {
	return <section id="care-panel-history" role="tabpanel" aria-labelledby="care-tab-history" tabIndex={0} className="focus-visible:outline-2 focus-visible:outline-[#287b7c]">
		<div className="mb-6 flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Patient History</h2><p className="mt-1 text-xs text-[#737c77]">Recorded visits / read-only</p></div><button type="button" disabled={!shell.care.isOnline || shell.historyLoading} onClick={shell.refreshHistory} aria-label="Refresh history" title="Refresh history" className="flex size-10 items-center justify-center rounded-lg text-[#64716b] disabled:opacity-50"><RefreshCw aria-hidden="true" className="size-4" /></button></div>
		{shell.historyLoading ? <p role="status" className="text-sm text-[#737c77]">Loading visit history...</p> : shell.historyError ? <p role="alert" className="text-sm leading-6 text-[#79523e]">{shell.historyError}</p> : !shell.care.visit ? <p className="text-sm text-[#737c77]">Patient history unavailable.</p> : shell.history.length ? <ol aria-label="Patient visit history" className="space-y-5">{shell.history.map(visit => {
			const date = new Date(visit.scheduled_start);
			const dateLabel = Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Date unavailable';
			const records = shell.care.context?.assessments.filter(record => record.session_id === visit.id && record.client_id === visit.client_id) || [];
			return <li key={visit.id} className="border-l-2 border-[#dce9e5] pl-5"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><Clock3 aria-hidden="true" className="size-4 text-[#5a9d99]" />{dateLabel}</h3><span className="rounded-full bg-[#eff4ef] px-2 py-1 text-xs capitalize text-[#64716b]">{visit.status.toLowerCase().replaceAll('_', ' ')}</span></div>{records.length > 0 && <ul className="mb-3 space-y-1">{records.map(record => <li key={record.id} className="text-xs leading-5 text-[#737c77]">{record.assessment_type.toUpperCase()} / {record.state}{record.state === 'refused' && record.refused_reason ? `: ${record.refused_reason}` : ''}</li>)}</ul>}<Link href={`/visit-summary?session_id=${encodeURIComponent(visit.id)}`} className="inline-flex min-h-10 items-center text-xs font-semibold text-[#287b7c] underline underline-offset-4">View visit record</Link></li>;
		})}</ol> : <p className="text-sm text-[#737c77]">No visit history recorded for this patient.</p>}
	</section>;
}