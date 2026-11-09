'use client';

import Link from 'next/link';
import {
	HeartPulse,
	CalendarDays,
	Filter,
	RefreshCw,
	Route,
	Check,
	Clock3,
	Compass,
	MapPin,
	WifiOff,
	ChevronRight,
	Pin,
	ArrowDownWideNarrow,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Visit } from '../../types/visit';
import axios from 'axios';
import { fetchShellPatient, type ShellPatient, type QueueSort } from '../../services/visits';
import type { useSchedule } from '../../hooks/useSchedule';

// --- ScheduleHeader ---
export function ScheduleHeader() {
	return (
		<header className="border-b border-coral-soft bg-cream">
			<div className="mx-auto flex min-h-18 max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-3 lg:px-10">
				<Link href="/" className="flex items-center gap-2.5 text-lg font-semibold"><span className="flex size-9 items-center justify-center rounded-full bg-[#5cc4b8] text-white"><HeartPulse aria-hidden="true" className="size-5" /></span>OmniCare</Link>
				<nav aria-label="Primary navigation" className="order-3 flex w-full items-center gap-6 overflow-x-auto text-sm text-[#475569] md:order-0 md:w-auto">
					<Link href="/" className="py-2 hover:text-teal">Dashboard</Link>
					<Link href="/schedules" aria-current="page" className="border-b-2 border-[#5cc4b8] py-2 font-semibold text-teal">Schedule</Link>
					<Link href="/assessments" className="py-2 hover:text-teal">Assessments</Link>
					<Link href="/emergency" className="py-2 hover:text-teal">Emergency</Link>
				</nav>
			</div>
		</header>
	);
}

// --- ScheduleToolbar ---
type ScheduleToolbarProps = {
	dateLabel: string;
	statusFilter: string;
	onFilterChange: (value: string) => void;
	routeUrl: string;
	loading: boolean;
	isOnline: boolean;
	onRefresh: () => void;
};

export function ScheduleToolbar({ dateLabel, statusFilter, onFilterChange, routeUrl, loading, isOnline, onRefresh }: ScheduleToolbarProps) {
	return (
		<div className="border-b border-coral-soft bg-cream">
			<div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3 lg:px-10">
				<div className="flex items-center gap-3 text-sm"><CalendarDays aria-hidden="true" className="size-4 text-[#475569]" /><span className="font-semibold">{dateLabel}</span><span className="ml-2 border-l border-coral-soft pl-4 text-[#475569]">Today</span></div>
				<div className="flex flex-wrap items-center gap-3">
					<div className="relative"><Filter aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#475569]" /><select aria-label="Filter visits" value={statusFilter} onChange={event => onFilterChange(event.target.value)} className="min-h-10 rounded-lg border border-coral-soft bg-transparent py-2 pr-7 pl-9 text-xs text-[#334155] focus:outline-2 focus:outline-teal"><option value="all">All visits</option><option value="remaining">Remaining</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="missed">Missed</option></select></div>
					{routeUrl && <a href={routeUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-2 rounded-xl bg-teal px-4 py-2 text-xs font-semibold text-white hover:bg-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal shadow-sm"><Route aria-hidden="true" className="size-4" />Open Route</a>}
					<button type="button" onClick={onRefresh} disabled={loading || !isOnline} aria-label="Refresh schedule" title="Refresh schedule" className="flex size-10 items-center justify-center rounded-lg text-[#475569] hover:bg-cream disabled:opacity-40"><RefreshCw aria-hidden="true" className={`size-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} /></button>
				</div>
			</div>
		</div>
	);
}

// --- ScheduleVisit ---
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function visitTime(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? 'Time unavailable' : timeFormatter.format(date);
}

type ScheduleVisitProps = { visit: Visit; highlighted: boolean; currentTime: number };

export function ScheduleVisit({ visit, highlighted, currentTime }: ScheduleVisitProps) {
	const completed = visit.status === 'completed';
	const statusLabel = highlighted ? visit.status === 'in_progress' ? 'In progress' : Date.parse(visit.scheduled_start) <= currentTime && Date.parse(visit.scheduled_end) > currentTime ? 'Current visit' : 'Next up' : visit.status.replace('_', ' ');
	const initials = visit.client_name.split(/\s+/).filter(Boolean).slice(0, 2).map(name => name[0]).join('');

	return (
		<li className="relative grid grid-cols-[48px_minmax(0,1fr)] gap-3 pb-5 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-4">
			<div className="relative flex flex-col items-center pt-6 text-center">
				<span aria-hidden="true" className={`z-10 flex size-4 items-center justify-center rounded-full border bg-cream ${highlighted ? 'border-[#5cc4b8]' : 'border-[#f0d9c8]'}`}>{completed && <Check className="size-3 text-[#64748b]" />}</span>
				<time dateTime={visit.scheduled_start} className={`z-10 mt-2 bg-cream py-1 text-[10px] leading-4 ${highlighted ? 'text-teal' : 'text-[#475569]'}`}>{visitTime(visit.scheduled_start)}</time>
				<span aria-hidden="true" className="absolute top-10 bottom-0 w-px bg-[#f6e8dd]" />
			</div>
			<article aria-label={`${visit.client_name}, ${statusLabel}`} aria-current={highlighted ? 'step' : undefined} className={`overflow-hidden rounded-lg border ${highlighted ? 'border-[#b6e6df] bg-white shadow-[0_8px_24px_rgba(36,38,43,0.08)]' : 'border-[#f6e8dd] bg-cream shadow-[0_1px_3px_rgba(36,38,43,0.025)]'}`}>
				<div className="flex flex-wrap items-center gap-4 px-4 py-5 sm:flex-nowrap sm:px-6 sm:py-6">
					<div aria-hidden="true" className={`flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${completed ? 'bg-[#f6e8dd] text-[#475569]' : 'bg-teal-soft text-[#334155]'}`}>{initials}</div>
					<div className="min-w-0 flex-1 basis-32">
						<div className="flex flex-wrap items-center gap-2"><h2 className="text-base leading-6 font-semibold wrap-anywhere">{visit.client_name}</h2>{highlighted && <span className="rounded-full bg-[#5cc4b8] px-2 py-0.5 text-[9px] font-semibold text-white uppercase tracking-wide">{statusLabel}</span>}</div>
						<p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-teal"><Clock3 aria-hidden="true" className="mt-1 size-3 shrink-0" /><span><time dateTime={visit.scheduled_start}>{visitTime(visit.scheduled_start)}</time> - <time dateTime={visit.scheduled_end}>{visitTime(visit.scheduled_end)}</time></span></p>
						<p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-[#475569]"><MapPin aria-hidden="true" className="mt-1 size-3 shrink-0" /><span className="wrap-anywhere">{visit.client_address || 'Address unavailable'}</span></p>
					</div>
					{!highlighted && <span className="text-[10px] text-[#475569] capitalize sm:ml-2">{statusLabel}</span>}
					{visit.client_address && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(visit.client_address)}`} target="_blank" rel="noopener noreferrer" aria-label={`Navigate to ${visit.client_name}`} className={`ml-auto flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${highlighted ? 'border-teal bg-teal text-white hover:bg-teal' : 'border-[#f6e8dd] text-[#475569] hover:bg-cream'}`}><Compass aria-hidden="true" className="size-3.5" />Navigate</a>}
				</div>
				{visit.notes && <p className="border-t border-teal-soft bg-[#f2fbf9] px-5 py-3 text-xs leading-5 text-teal">{visit.notes}</p>}
			</article>
		</li>
	);
}

// --- ScheduleTimeline ---
type ScheduleTimelineProps = {
	isOnline: boolean;
	visits: Visit[];
	visibleVisits: Visit[];
	loading: boolean;
	error: string;
	clientWarning: boolean;
	priority?: Visit;
	currentTime: number;
	dateLabel: string;
};

export function ScheduleTimeline({ isOnline, visits, visibleVisits, loading, error, clientWarning, priority, currentTime, dateLabel }: ScheduleTimelineProps) {
	return (
		<div className="mx-auto max-w-4xl px-5 pb-16 sm:px-10 lg:pt-3">
			<div role="status" aria-live="polite" className="flex h-8 items-center gap-2 text-xs text-[#475569]">{!isOnline && <><WifiOff aria-hidden="true" className="size-3.5" />Offline · {visits.length ? 'Showing last loaded schedule' : 'Connect to load your schedule'}</>}</div>
			<div className="mb-8 mt-2">
				<h1 className="text-2xl leading-8 font-semibold">Daily Schedule</h1>
				<p className="mt-1 text-sm leading-6 text-[#475569]">{loading && !visits.length ? 'Loading today\'s visits...' : `You have ${visits.length} scheduled ${visits.length === 1 ? 'visit' : 'visits'} for today.`}</p>
			</div>
			{error && <p role="alert" className="mb-6 border-l-2 border-[#475569] pl-3 text-sm leading-6 text-[#b45309]">{error}</p>}
			{clientWarning && <p role="status" className="mb-6 text-sm leading-6 text-[#475569]">Some client details are unavailable. Refresh when connected.</p>}
			{loading && !visits.length ? (
				<div role="status" aria-label="Loading schedule" className="space-y-5 sm:ml-20">{[1, 2, 3].map(index => <div key={index} aria-hidden="true" className="h-32 animate-pulse rounded-lg bg-cream motion-reduce:animate-none" />)}</div>
			) : visibleVisits.length ? (
				<ol aria-label="Today's visits">
					{visibleVisits.map(visit => <ScheduleVisit key={visit.id} visit={visit} highlighted={visit.id === priority?.id} currentTime={currentTime} />)}
				</ol>
			) : (
				<div className="border-t border-coral-soft py-16 text-center"><CalendarDays aria-hidden="true" className="mx-auto mb-4 size-9 text-[#64748b]" strokeWidth={1.5} /><h2 className="text-lg font-semibold">{!isOnline && !visits.length ? 'Schedule unavailable offline' : error && !visits.length ? 'Schedule unavailable' : visits.length ? 'No visits match this filter' : 'No visits scheduled today'}</h2></div>
			)}
			{!loading && visits.length > 0 && visits.every(visit => ['completed', 'cancelled', 'missed'].includes(visit.status)) && <div role="status" className="mt-8 text-center"><span className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-teal-soft"><Check aria-hidden="true" className="size-5 text-[#475569]" /></span><p className="text-xs font-semibold">Schedule Complete</p><p className="mt-1 text-[10px] text-[#475569]">{dateLabel}</p></div>}
		</div>
	);
}

// --- PatientQueueCard ---
const statusStyles = {
    scheduled: { label: 'Upcoming', className: 'bg-cream text-[#334155]' },
    in_progress: { label: 'In Progress', className: 'bg-teal-soft text-teal' },
    completed: { label: 'Completed', className: 'bg-teal-soft text-[#334155]' },
    missed: { label: 'Missed', className: 'bg-[#ffe4e6] text-[#be123c]' },
    cancelled: { label: 'Cancelled', className: 'bg-cream text-[#475569]' },
};

function time(value: string) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date) : 'Time unavailable';
}

export function PatientQueueCard({ visit, active }: { visit: Visit; active: boolean }) {
    const [patient, setPatient] = useState<ShellPatient | null>(null);

    // Fetch the dedicated client profile for this specific queue item
    useEffect(() => {
        const controller = new AbortController();
        fetchShellPatient(visit.id, controller.signal)
            .then(setPatient)
            .catch((err) => {
                // Aborts are expected: the cleanup below cancels the request on unmount,
                // when visit.id changes, and on React StrictMode's dev-only double mount.
                if (axios.isCancel(err)) return;
                console.error(`Failed to load patient shell for ${visit.id}:`, err);
            });
        
        return () => controller.abort();
    }, [visit.id]);

    // Fallback to visit properties while patient profile loads
    const clientName = patient?.full_name || visit.client_name || 'Patient details unavailable';
    const status = statusStyles[visit.status as keyof typeof statusStyles] || { label: 'Status unavailable', className: 'bg-cream text-[#475569]' };
    
    const initials = clientName.split(/\s+/).filter(Boolean).slice(0, 2).map(name => name[0]).join('');

    return (
        <li>
            <Link 
                // visit.id IS the session id: /scheduling/visits/today returns SessionResponse rows.
                // The patient visit page lives at app/visits/[sessionID] (VisitShell).
                href={`/visits/${encodeURIComponent(visit.id)}`}
                aria-label={`Open Point of Care for ${clientName}, ${status.label}`} 
                aria-current={active ? 'step' : undefined} 
                className={`group block rounded-lg border border-l-4 p-5 transition-[box-shadow,background-color] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal sm:p-6 ${active ? 'border-teal-soft border-l-teal bg-white shadow-[0_6px_24px_rgba(38,98,80,0.09)]' : 'border-[#f6e8dd] border-l-transparent bg-cream hover:bg-white hover:shadow-sm'}`}
            >
                {active && <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-teal"><Pin aria-hidden="true" className="size-3.5" />Current patient</p>}
                
                <div className="flex items-start gap-4">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-coral-soft bg-teal-soft text-lg font-semibold text-[#475569] sm:size-18">
                        <span aria-hidden="true">{initials}</span>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <h2 className="text-lg leading-7 font-semibold wrap-anywhere text-ink">{clientName}</h2>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                                {visit.status === 'completed' && <Check aria-hidden="true" className="size-3" />}
                                {status.label}
                            </span>
                        </div>
                        
                        <p className="mt-2 flex items-start gap-1.5 text-sm leading-6 text-[#475569]">
                            <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" />
                            <span className="wrap-anywhere">
                                {patient?.address_text || visit.client_address || 'Address unavailable'}
                            </span>
                        </p>
                        
                        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-teal">
                            <Clock3 aria-hidden="true" className="size-4 shrink-0" />
                            <span>{time(visit.scheduled_start)} – {time(visit.scheduled_end)}</span>
                        </p>
                    </div>
                    
                    <ChevronRight aria-hidden="true" className="mt-1 hidden size-5 shrink-0 text-[#64748b] sm:block" />
                </div>
                
                <div className="mt-4 flex items-center justify-end gap-3 sm:hidden">
                    <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-[#64748b]" />
                </div>
            </Link>
        </li>
    );
}

// --- PatientQueue ---
export function PatientQueue({ schedule }: { schedule: ReturnType<typeof useSchedule> }) {
	return (
		<div className="mx-auto max-w-3xl px-5 pb-12 sm:px-8">
			<div role="status" aria-live="polite" className="flex min-h-10 items-center gap-2 text-xs text-[#475569]">{!schedule.isOnline && <><WifiOff aria-hidden="true" className="size-3.5 shrink-0" />Offline / {schedule.visits.length ? 'Showing last loaded queue' : 'Connect to load your patient queue'}</>}</div>
			<header className="mb-7 flex flex-wrap items-end justify-between gap-5 border-b border-coral-soft pb-6">
				<div><p className="mb-2 flex items-center gap-2 text-sm text-[#475569]"><CalendarDays aria-hidden="true" className="size-4" />{schedule.dateLabel}</p><h1 className="text-2xl leading-8 font-semibold text-ink">My Patient Queue</h1><p className="mt-2 text-sm text-[#475569]">{schedule.loading && !schedule.visits.length ? 'Loading your shift...' : `${schedule.visits.length} ${schedule.visits.length === 1 ? 'visit' : 'visits'} this shift`}</p></div>
				<div className="flex items-center gap-2"><div className="relative"><ArrowDownWideNarrow aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#475569]" /><select aria-label="Sort patient queue" value={schedule.sort} onChange={event => schedule.setSort(event.target.value as QueueSort)} className="min-h-12 rounded-lg border border-coral-soft bg-white py-2 pr-8 pl-10 text-sm text-[#334155] focus:outline-2 focus:outline-teal"><option value="time">By time</option><option value="risk">By risk level</option><option value="status">By status</option></select></div><button type="button" aria-label="Refresh patient queue" title="Refresh patient queue" disabled={schedule.loading || !schedule.isOnline} onClick={schedule.refreshSchedule} className="flex size-12 items-center justify-center rounded-2xl border border-coral-soft bg-white text-[#475569] hover:bg-teal-soft focus-visible:outline-2 focus-visible:outline-teal disabled:opacity-50 shadow-sm"><RefreshCw aria-hidden="true" className={`size-4 ${schedule.loading ? 'animate-spin motion-reduce:animate-none' : ''}`} /></button></div>
			</header>
			{schedule.error && <p role="alert" className="mb-5 text-sm leading-6 text-[#b45309]">{schedule.error}</p>}
			{schedule.clientWarning && <p role="status" className="mb-5 text-sm leading-6 text-[#475569]">Some patient details are unavailable. Refresh when connected.</p>}
			{schedule.loading && !schedule.visits.length ? <div role="status" aria-label="Loading patient queue" className="space-y-5">{[1, 2, 3].map(index => <div key={index} aria-hidden="true" className="h-48 animate-pulse rounded-lg bg-[#f6e8dd] motion-reduce:animate-none" />)}</div> : schedule.queueVisits.length ? <ol aria-label="Shift patient queue" className="space-y-5">{schedule.queueVisits.map(visit => <PatientQueueCard key={visit.id} visit={visit} active={visit.id === schedule.activeId} />)}</ol> : <div role="status" className="py-12 text-center"><CalendarDays aria-hidden="true" className="mx-auto mb-4 size-8 text-[#64748b]" /><p className="text-base font-semibold text-[#334155]">{!schedule.isOnline ? 'Patient queue unavailable offline' : schedule.error ? 'Patient queue unavailable' : 'No patients scheduled this shift'}</p></div>}
		</div>
	);
}
