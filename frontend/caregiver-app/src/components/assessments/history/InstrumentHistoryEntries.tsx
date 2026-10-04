import { MessageCircle, UserRound } from 'lucide-react';
import type { HistoryRecord } from '@/services/instrumentHistory';

export default function InstrumentHistoryEntries({ entries, unit }: { entries: HistoryRecord[]; unit: string }) {
	return <section aria-label="Past assessment entries"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Past Entries</h2><span className="text-xs text-[#737c77]">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span></div>
		{entries.length ? <ol aria-label="Reverse-chronological assessment entries" className="space-y-4">{entries.map(entry => {
			const refused = entry.state === 'refused';
			const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.recordedAt));
			return <li key={entry.id}><article aria-label={`${date}, ${refused ? 'Refused' : entry.state}`} className={`rounded-lg border px-5 py-5 ${refused ? 'border-[#e9d3a8] bg-[#fffaf0]' : 'border-[#e5ebe5] bg-[#fffefa]'}`}>
				<div className="flex flex-wrap items-start justify-between gap-3"><div><time dateTime={entry.recordedAt} className="text-sm font-semibold text-[#40544a]">{date}</time><p className="mt-2 flex flex-wrap items-center gap-2 text-xs leading-5 text-[#737c77]"><UserRound aria-hidden="true" className="size-3.5" /><span>{entry.recorderName ? `Recorded by ${entry.recorderName}` : entry.administered_by ? 'Recorder name unavailable' : 'Recorder not recorded'}</span>{!entry.recorderName && entry.administered_by && <span className="wrap-anywhere">ID: {entry.administered_by}</span>}</p></div>
				<span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${refused ? 'bg-[#fff1d5] text-[#926116]' : entry.numericScore !== null ? 'bg-[#e6f0e7] text-[#49694d]' : 'bg-[#eceeeb] text-[#657167]'}`}>{refused && <MessageCircle aria-hidden="true" className="size-3.5" />}{refused ? 'Refused' : entry.state === 'pending' ? 'Pending' : entry.numericScore !== null ? `${entry.numericScore}${unit ? ` ${unit}` : ''}` : 'Score unavailable'}</span>
				</div>
				{refused && <p className="mt-4 text-sm leading-7 whitespace-pre-wrap wrap-anywhere text-[#805d29]"><span className="font-semibold">Reason: </span>{entry.refused_reason?.trim() || 'Reason not recorded.'}</p>}
				{entry.result_note && <p className="mt-3 text-sm leading-7 whitespace-pre-wrap wrap-anywhere text-[#64716b]">{entry.result_note}</p>}
			</article></li>;
		})}</ol> : <p role="status" className="border-t border-[#e7e9e3] py-10 text-center text-sm text-[#737c77]">No entries recorded for this instrument.</p>}
	</section>;
}