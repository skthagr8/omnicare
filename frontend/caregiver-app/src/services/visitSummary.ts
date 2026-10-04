import { z } from 'zod';
import { apiClient } from '@/services/api';
import { fetchCheckInVisit } from '@/services/checkIn';
import { fetchTodaySchedule } from '@/services/schedule';

const timestamp = z.string().refine(value => Number.isFinite(Date.parse(value)), 'Invalid timestamp');
const score = z.union([z.number(), z.string().min(1)]).transform(Number).refine(Number.isFinite).nullable().optional();
const assessmentSchema = z.object({
	id: z.string().min(1),
	session_id: z.string().min(1),
	client_id: z.string().min(1),
	assessment_type: z.string().transform(value => value.toLowerCase()),
	state: z.string().transform(value => value.toLowerCase()).pipe(z.enum(['pending', 'refused', 'completed'])),
	created_at: timestamp,
	administered_at: timestamp.nullable().optional(),
	refused_reason: z.string().nullable().optional(),
	tug: z.object({ completion_time_sec: score }).nullable().optional(),
	cmai: z.object({ total_score: score }).nullable().optional(),
	braden: z.object({ total_score: score }).nullable().optional(),
	delirium: z.object({ cam_positive: z.boolean().nullable().optional() }).nullable().optional(),
});
const receiptSchema = z.object({ status: z.literal('sent'), sent_at: timestamp, recipient_count: z.number().int().positive() });
const summarySchema = z.object({
	id: z.string().min(1),
	version: z.string().min(1),
	session_id: z.string().min(1),
	client_id: z.string().min(1),
	completed_tasks: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), status: z.literal('completed') })),
	administered_medications: z.array(z.object({ id: z.string().min(1), medication_name: z.string().min(1), dosage: z.string().min(1), status: z.literal('administered'), administered_at: timestamp })),
	assessments: z.array(assessmentSchema),
	observations: z.array(z.object({ id: z.string().min(1), note: z.string().min(1), recorded_at: timestamp, author_name: z.string().optional() })),
	can_share: z.boolean(),
	authorized_recipient_count: z.number().int().nonnegative(),
	share_receipt: receiptSchema.nullable(),
});

export type SummaryAssessment = z.infer<typeof assessmentSchema>;
export type VisitSummaryContent = z.infer<typeof summarySchema>;
export type FamilyShareReceipt = z.infer<typeof receiptSchema>;

export async function fetchVisitSummary(sessionId: string | null, signal: AbortSignal) {
	let selectedId = sessionId;
	if (!selectedId) {
		const { visits } = await fetchTodaySchedule(signal);
		selectedId = visits.filter(visit => visit.status === 'completed').sort((first, second) => Date.parse(second.scheduled_end) - Date.parse(first.scheduled_end))[0]?.id || null;
	}
	if (!selectedId) return { visit: null, content: null, assessments: [] as SummaryAssessment[], assessmentError: '', contentError: '' };
	const visit = await fetchCheckInVisit(selectedId, signal);
	if (!visit) throw new Error('Visit not found');
	let content: VisitSummaryContent | null = null;
	let contentError = '';
	try {
		const response = await apiClient.get(`/scheduling/sessions/${encodeURIComponent(visit.id)}/summary`, { signal });
		content = summarySchema.parse(response.data);
		if (content.session_id !== visit.id || content.client_id !== visit.client_id || content.assessments.some(record => record.session_id !== visit.id || record.client_id !== visit.client_id)) throw new Error('Summary visit mismatch');
	} catch {
		content = null;
		contentError = 'The full visit summary is unavailable. Family sharing is paused until all records can be verified.';
	}
	let assessments = content?.assessments || [];
	let assessmentError = '';
	if (!content) {
		try {
			const response = await apiClient.get(`/assessments/client/${encodeURIComponent(visit.client_id)}`, { signal });
			assessments = z.array(assessmentSchema).parse(response.data).filter(record => record.session_id === visit.id && record.client_id === visit.client_id);
		} catch { assessmentError = 'Assessment results could not be loaded.'; }
	}
	assessments = [...assessments].sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at));
	const latest = new Map<string, SummaryAssessment>();
	for (const record of assessments) if (!latest.has(record.assessment_type)) latest.set(record.assessment_type, record);
	return { visit, content, assessments: [...latest.values()], assessmentError, contentError };
}

export async function sendSummaryToFamily(content: VisitSummaryContent, idempotencyKey: string, signal: AbortSignal): Promise<FamilyShareReceipt> {
	if (!content.can_share || content.authorized_recipient_count < 1 || content.share_receipt) throw new Error('Family sharing is unavailable');
	const response = await apiClient.post(`/scheduling/sessions/${encodeURIComponent(content.session_id)}/summary/send`, {
		summary_id: content.id,
		version: content.version,
	}, { signal, headers: { 'Idempotency-Key': idempotencyKey } });
	return receiptSchema.parse(response.data);
}