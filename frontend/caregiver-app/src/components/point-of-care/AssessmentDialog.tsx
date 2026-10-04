import { useEffect, useRef } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import type { AssessmentAction } from '@/hooks/usePointOfCare';
import type { AssessmentEntry } from '@/services/pointOfCare';
import { instruments } from './instruments';

type AssessmentValues = Pick<AssessmentEntry, 'refused_reason' | 'tug' | 'cmai' | 'braden'>;
type AssessmentDialogProps = { action: AssessmentAction | null; saving: boolean; onClose: () => void; onSave: (values: AssessmentValues) => Promise<void> };
const fieldClass = 'mt-2 min-h-12 w-full rounded-lg border border-[#bccbc2] bg-white px-3 py-3 text-base text-[#303d36] outline-none focus:ring-2 focus:ring-[#63afaf]';

export default function AssessmentDialog({ action, saving, onClose, onSave }: AssessmentDialogProps) {
	const dialog = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		if (action && !dialog.current?.open) dialog.current?.showModal();
		if (!action && dialog.current?.open) dialog.current.close();
	}, [action]);
	const instrument = instruments.find(item => item.id === action?.instrument);
	const title = action?.state === 'refused' ? 'Record refusal' : action?.state === 'pending' ? 'Mark pending' : 'Record completed assessment';

	return (
		<dialog ref={dialog} aria-labelledby="assessment-dialog-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }} className="caregiver-login fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg border border-[#d5dfd7] bg-[#fffefa] p-6 text-[#303d36] shadow-xl backdrop:bg-black/25">
			{action && <form key={`${action.instrument}-${action.state}`} onSubmit={event => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				const score = Number(data.get('score'));
				const values: AssessmentValues = action.state === 'refused' ? { refused_reason: String(data.get('reason') || '').trim() } : action.state === 'completed' ? action.instrument === 'tug' ? { tug: { completion_time_sec: score, hesitation_flag: data.get('hesitation') === 'on', freezing_flag: data.get('freezing') === 'on' } } : action.instrument === 'cmai' ? { cmai: { total_score: score } } : { braden: { total_score: score, skin_inspection_notes: String(data.get('notes') || '').trim() || undefined } } : {};
				if (action.state === 'refused' && !values.refused_reason) return;
				if (action.state === 'completed' && !Number.isFinite(score)) return;
				void onSave(values);
			}}>
				<div className="mb-5 flex items-start justify-between gap-4"><div><p className="mb-1 text-sm font-semibold text-[#287b7c]">{instrument?.name}</p><h2 id="assessment-dialog-title" className="text-xl leading-7 font-semibold">{title}</h2></div><button type="button" aria-label="Close assessment dialog" title="Close" disabled={saving} onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[#737c77] hover:bg-[#eff4ef] focus-visible:outline-2 focus-visible:outline-[#287b7c]"><X aria-hidden="true" className="size-5" /></button></div>
				<fieldset disabled={saving} className="min-w-0 space-y-4">
					{action.state === 'refused' ? <div><label htmlFor="refusal-reason" className="text-sm font-semibold">Reason for refusal</label><textarea id="refusal-reason" name="reason" required maxLength={1000} rows={3} className={fieldClass} /><p className="mt-2 text-xs leading-5 text-[#737c77]">The client&apos;s choice will be recorded as a refusal.</p></div> : action.state === 'pending' ? <p className="text-sm leading-6 text-[#64716b]">Record this assessment as pending for the current visit. Any earlier record will remain in the history.</p> : <>
						<div><label htmlFor="assessment-score" className="text-sm font-semibold">{action.instrument === 'tug' ? 'Completion time (seconds)' : 'Total assessed score'}</label><input id="assessment-score" name="score" type="number" inputMode="decimal" required min={action.instrument === 'tug' ? 0.01 : action.instrument === 'cmai' ? 29 : 6} max={action.instrument === 'tug' ? undefined : action.instrument === 'cmai' ? 203 : 23} step={action.instrument === 'tug' ? 0.01 : 1} className={fieldClass} /></div>
						{action.instrument === 'tug' && <div className="space-y-2 text-sm"><label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="hesitation" className="size-5 accent-[#6d826e]" />Hesitation observed</label><label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="freezing" className="size-5 accent-[#6d826e]" />Freezing observed</label></div>}
						{action.instrument === 'braden' && <div><label htmlFor="skin-notes" className="text-sm font-semibold">Skin observations (optional)</label><textarea id="skin-notes" name="notes" maxLength={1000} rows={3} className={fieldClass} /></div>}
					</>}
				</fieldset>
				<div className="mt-6 flex gap-3"><button type="button" disabled={saving} onClick={onClose} className="min-h-12 flex-1 rounded-lg border border-[#cdd3d0] px-3 text-sm font-semibold text-[#64716b]">Cancel</button><button type="submit" disabled={saving} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold disabled:cursor-wait ${action.state === 'refused' ? 'border-[#d4a34d] bg-[#fff2d6] text-[#94621b]' : 'border-[#637862] bg-[#637862] text-white'}`}>{saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}{saving ? 'Saving...' : action.state === 'refused' ? 'Save refusal' : action.state === 'pending' ? 'Save pending' : 'Save result'}</button></div>
			</form>}
		</dialog>
	);
}