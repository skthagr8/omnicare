import Link from 'next/link';
import { ArrowLeft, RefreshCw, WifiOff } from 'lucide-react';
import { useInstrumentHistory } from '@/hooks/useInstrumentHistory';
import InstrumentTrend from './InstrumentTrend';
import InstrumentHistoryEntries from './InstrumentHistoryEntries';

export default function InstrumentHistoryScreen({ sessionId }: { sessionId: string }) {
	const history = useInstrumentHistory(sessionId);
	const { data } = history;
	return <main className="caregiver-login min-h-svh bg-[#faf9f7] px-5 py-6 text-[#303538] sm:px-8"><div className="mx-auto max-w-4xl">
		<Link href={`/visits/${encodeURIComponent(sessionId)}/assessments`} className="mb-5 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#287b7c]"><ArrowLeft aria-hidden="true" className="size-4" />Back to assessments</Link>
		<header className="mb-5 flex items-start justify-between gap-4"><div><p className="mb-2 text-xs text-[#737c77]">{data?.visit.clientName || 'Patient assessment history'}</p><h1 className="text-2xl leading-8 font-bold wrap-anywhere">{data ? `${data.metadata.name} History` : 'Instrument History'}</h1></div><button type="button" onClick={history.refreshHistory} disabled={history.loading || !history.isOnline} aria-label="Refresh instrument history" title="Refresh instrument history" className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[#d5dfd7] bg-white text-[#64716b] focus-visible:outline-2 focus-visible:outline-[#287b7c] disabled:opacity-50"><RefreshCw aria-hidden="true" className={`size-4 ${history.loading ? 'animate-spin motion-reduce:animate-none' : ''}`} /></button></header>
		<div role="status" className="mb-4 flex min-h-7 items-center gap-2 text-xs text-[#737c77]">{!history.isOnline && <><WifiOff aria-hidden="true" className="size-3.5 shrink-0" />Offline / Showing last loaded history</>}</div>
		{history.loading && <p role="status" className="mb-5 text-sm text-[#737c77]">Loading instrument history...</p>}
		{history.error && <p role="alert" className="mb-5 text-sm leading-6 text-[#79523e]">{history.error}</p>}
		{data?.recorderWarning && <p role="status" className="mb-5 text-xs leading-6 text-[#737c77]">Some recorder names are unavailable. Recorded IDs are retained.</p>}
		{data && <><InstrumentTrend entries={data.trendEntries} name={data.metadata.name} metric={data.metadata.metric} unit={data.metadata.unit} /><InstrumentHistoryEntries entries={data.entries} unit={data.metadata.unit} /></>}
	</div></main>;
}