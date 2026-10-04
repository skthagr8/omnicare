import { Check, LoaderCircle, Send, WifiOff } from 'lucide-react';
import type { useVisitSummary } from '@/hooks/useVisitSummary';

export default function FamilyShareAction({ summary }: { summary: ReturnType<typeof useVisitSummary> }) {
	const recipientCount = summary.data?.content?.authorized_recipient_count || 0;
	return (
		<section aria-label="Family sharing" className="mt-8 border-t border-[#edf0eb] pt-7">
			{!summary.isOnline && <p role="status" className="mb-3 flex items-center gap-2 text-sm text-[#737c77]"><WifiOff aria-hidden="true" className="size-4" />Connect before sending this summary.</p>}
			{summary.sendError && <p role="alert" className="mb-4 text-sm leading-6 text-[#79523e]">{summary.sendError}</p>}
			{summary.receipt && <p role="status" className="mb-4 flex items-start gap-2 text-sm leading-6 text-[#49694d]"><Check aria-hidden="true" className="mt-1 size-4 shrink-0" />Sent to {summary.receipt.recipient_count} authorized family {summary.receipt.recipient_count === 1 ? 'recipient' : 'recipients'}.</p>}
			<button type="button" onClick={summary.sendToFamily} disabled={!summary.canSend} className="flex min-h-16 w-full items-center justify-center gap-3 rounded-lg bg-[#287b7c] px-5 py-4 text-base font-bold text-white shadow-[0_3px_0_#1e6263,0_6px_16px_rgba(40,123,124,0.12)] transition-[translate,box-shadow,background-color] duration-150 enabled:hover:bg-[#226c6d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#287b7c] enabled:active:translate-y-0.5 enabled:active:shadow-[0_1px_0_#1e6263] disabled:cursor-not-allowed disabled:bg-[#6f8f8a] disabled:shadow-none motion-reduce:transition-none">{summary.sending ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /> : summary.receipt ? <Check aria-hidden="true" className="size-5" /> : <Send aria-hidden="true" className="size-5" />}{summary.sending ? 'Sending...' : summary.receipt ? 'Sent to Family' : 'Send to Family'}</button>
			<p className="mt-3 text-center text-xs leading-5 text-[#737c77]">{summary.receipt ? 'The recorded summary has been shared.' : !summary.completed ? 'A completed visit is required before sharing.' : !summary.data?.content ? 'Family sharing is unavailable until the full summary can be verified.' : !summary.data.content.can_share || recipientCount < 1 ? 'No authorized family recipients are available for this summary.' : `Share this recorded summary with ${recipientCount} authorized family ${recipientCount === 1 ? 'recipient' : 'recipients'}.`}</p>
		</section>
	);
}