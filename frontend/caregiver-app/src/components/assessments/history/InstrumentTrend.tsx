import { ChartNoAxesCombined } from 'lucide-react';
import type { HistoryRecord } from '@/services/instrumentHistory';

type InstrumentTrendProps = { entries: HistoryRecord[]; name: string; metric: string; unit: string };

export default function InstrumentTrend({ entries, name, metric, unit }: InstrumentTrendProps) {
	const scores = entries.flatMap(entry => entry.numericScore === null ? [] : [entry.numericScore]);
	const min = scores.length ? Math.min(...scores) : 0;
	const max = scores.length ? Math.max(...scores) : 1;
	const padding = Math.max((max - min) * .2, max * .05, .5);
	const lower = Math.max(0, min - padding);
	const upper = max + padding;
	const x = (index: number) => entries.length > 1 ? 65 + index * (590 / (entries.length - 1)) : 360;
	const y = (value: number) => 210 - (value - lower) / (upper - lower) * 165;
	const segments: string[][] = [];
	let segment: string[] = [];
	for (const [index, entry] of entries.entries()) {
		if (entry.numericScore === null) { if (segment.length) segments.push(segment); segment = []; }
		else segment.push(`${x(index)},${y(entry.numericScore)}`);
	}
	if (segment.length) segments.push(segment);
	const latestScore = [...entries].reverse().find(entry => entry.numericScore !== null)?.numericScore;

	return <section aria-label={`${name} trend`} className="mb-9 border-b border-[#e7e9e3] pb-7">
		<div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{metric}</h2><p className="mt-1 text-xs leading-5 text-[#737c77]">Last {entries.length} {entries.length === 1 ? 'recording' : 'recordings'}{unit ? ` / ${unit}` : ''}</p></div>{latestScore !== undefined && <div className="text-right"><p className="text-[10px] font-semibold text-[#737c77] uppercase">Latest scored result</p><p className="mt-1 text-2xl font-semibold text-[#287b7c]">{latestScore}<span className="ml-2 text-xs font-normal text-[#737c77]">{unit}</span></p></div>}</div>
		{scores.length ? <div className="overflow-x-auto rounded-lg border border-[#e5ebe5] bg-white px-2 py-4"><svg viewBox="0 0 720 285" role="img" aria-label={`${name} trend: ${scores.length} scored results across ${entries.length} recordings. Refused and unscored entries have no numerical value.`} className="block w-full min-w-[560px]">
			<title>{name} recorded {metric.toLowerCase()}</title><desc>Scores appear in chronological order. Gaps indicate refused, pending, or unavailable scores; they are not zero values.</desc>
			{[0, 1, 2, 3].map(tick => { const value = lower + (upper - lower) * tick / 3; const position = y(value); return <g key={tick}><line x1="65" y1={position} x2="655" y2={position} stroke="#e9eee9" /><text x="53" y={position + 4} textAnchor="end" fill="#738078" fontSize="11">{Number(value.toFixed(1))}</text></g>; })}
			{segments.filter(points => points.length > 1).map((points, index) => <polyline key={index} data-trend-segment fill="none" stroke="#328b82" strokeWidth="2.5" strokeLinejoin="round" points={points.join(' ')} />)}
			{entries.map((entry, index) => <g key={entry.id}>
				{entry.numericScore !== null ? <circle data-score={entry.numericScore} cx={x(index)} cy={y(entry.numericScore)} r="5" fill="#328b82" stroke="white" strokeWidth="2"><title>{new Date(entry.recordedAt).toLocaleDateString()}: {entry.numericScore} {unit}</title></circle> : <circle data-unscored={entry.state} cx={x(index)} cy="227" r="4.5" fill={entry.state === 'refused' ? '#d4a34d' : '#a6b0a6'}><title>{new Date(entry.recordedAt).toLocaleDateString()}: {entry.state === 'refused' ? `Refused / ${entry.refused_reason || 'Reason not recorded'}` : 'No scored result'}</title></circle>}
				{(entries.length <= 6 || index % 2 === 0 || index === entries.length - 1) && <text x={x(index)} y="253" textAnchor="middle" fill="#738078" fontSize="11">{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(entry.recordedAt))}</text>}
			</g>)}
		</svg></div> : <div className="rounded-lg border border-[#e5ebe5] bg-white px-5 py-10 text-center"><ChartNoAxesCombined aria-hidden="true" className="mx-auto mb-3 size-8 text-[#8da499]" /><p className="text-sm leading-6 text-[#64716b]">No scored recordings available for this instrument.</p></div>}
		<div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#737c77]"><span className="flex items-center gap-2"><span aria-hidden="true" className="size-2 rounded-full bg-[#328b82]" />Scored recording</span><span className="flex items-center gap-2"><span aria-hidden="true" className="size-2 rounded-full bg-[#d4a34d]" />Refused / not scored</span><span className="flex items-center gap-2"><span aria-hidden="true" className="size-2 rounded-full bg-[#a6b0a6]" />Pending or score unavailable</span></div>
	</section>;
}