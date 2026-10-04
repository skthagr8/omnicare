'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import InstrumentHistoryScreen from '@/components/assessments/history/InstrumentHistoryScreen';

function HistoryRoute() {
	const { sessionID } = useParams<{ sessionID: string }>();
	const searchParams = useSearchParams();
	return <InstrumentHistoryScreen key={`${sessionID}-${searchParams.toString()}`} sessionId={sessionID} />;
}

export default function InstrumentHistoryPage() {
	return <Suspense fallback={<p className="p-6 text-sm text-[#737c77]">Loading instrument history...</p>}><HistoryRoute /></Suspense>;
}
