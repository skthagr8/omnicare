import { CalendarDays, Flag, UsersRound } from 'lucide-react';
import type { useAdminDashboard } from '@/hooks/useAdminDashboard';

export default function DashboardSummaryStrip({ dashboard: state }: { dashboard: ReturnType<typeof useAdminDashboard> }) {
	const patientCount = state.dashboard?.patients === null || !state.dashboard ? null : state.patients.length;
	const appointmentCount = state.dashboard?.sessions === null || !state.dashboard ? null : state.sessions.length;
	return <section aria-label="Daily overview" className="border-b border-[#e9edf1] bg-white px-5 sm:px-8"><div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-8 gap-y-3 py-4 text-sm">
		<p className="flex items-center gap-2 text-[#637480]"><UsersRound aria-hidden="true" className="size-4 text-[#7c8c98]" /><strong className="font-bold text-[#29343d]">{patientCount ?? (state.loading ? 'Loading' : 'Unavailable')}</strong>total patients</p>
		<p className="flex items-center gap-2 text-[#637480]"><CalendarDays aria-hidden="true" className="size-4 text-[#7c8c98]" /><strong className="font-bold text-[#29343d]">{appointmentCount ?? (state.loading ? 'Loading' : 'Unavailable')}</strong>appointments today</p>
		<p className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${state.flagCount === null ? 'bg-slate-100 text-slate-600' : state.flagCount > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}><Flag aria-hidden="true" className="size-3.5" />{state.flagCount === null ? state.loading ? 'Checking AI flags' : 'AI flags unavailable' : `${state.flagCount} ${state.flagCount === 1 ? 'patient' : 'patients'} with unresolved AI flags`}</p>
		<span className="ml-auto text-xs text-[#7c8c98]">{state.now ? new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(state.now) : 'Today'}</span>
	</div></section>;
}