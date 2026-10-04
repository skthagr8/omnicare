'use client';

import Link from 'next/link';
import { LockKeyhole, WifiOff } from 'lucide-react';
import AppointmentsAgenda from '@/components/dashboard/AppointmentsAgenda';
import DashboardSummaryStrip from '@/components/dashboard/DashboardSummaryStrip';
import DashboardToolbar from '@/components/dashboard/DashboardToolbar';
import PatientsRoster from '@/components/dashboard/PatientsRoster';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';

export default function DashboardPage() {
	const state = useAdminDashboard();
	if (state.data?.authorized === false) return <main className="caregiver-login mx-auto max-w-xl px-6 py-16 text-center text-[#29343d]"><LockKeyhole aria-hidden="true" className="mx-auto mb-5 size-8 text-[#748793]" /><h1 className="text-2xl font-bold">Administrator access required</h1><p className="mt-3 text-sm leading-6 text-[#637480]">Patients &amp; Appointments is available to administrators.</p><Link href="/schedules" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#287b7c] px-5 text-sm font-semibold text-white">Go to my schedule</Link></main>;
	return <main className="caregiver-login flex min-h-[calc(100svh-112px)] flex-col bg-white text-[#29343d] md:min-h-[calc(100svh-72px)] lg:h-[calc(100svh-72px)] lg:min-h-0">
		<DashboardToolbar dashboard={state} />
		<DashboardSummaryStrip dashboard={state} />
		{!state.isOnline && <p role="status" className="flex items-center gap-2 border-b border-[#e9edf1] px-5 py-2 text-xs text-[#637480]"><WifiOff aria-hidden="true" className="size-3.5" />Offline / Showing last loaded operational data</p>}
		{state.error && <p role="alert" className="border-b border-[#e9edf1] px-5 py-3 text-sm text-[#79523e]">{state.error}</p>}
		<div className="mx-auto grid w-full max-w-[1600px] flex-1 items-stretch lg:min-h-0 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"><PatientsRoster dashboard={state} /><AppointmentsAgenda dashboard={state} /></div>
	</main>;
}
