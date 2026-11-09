'use client';

import Link from 'next/link';
import { Award, CalendarDays, ChevronRight, CircleCheck, Clock, Info, ShieldCheck } from 'lucide-react';
import { Avatar } from '../layout/Layout';
import { firstName, fmtDate, fmtTime, titleCase } from '../../utils/familyApi';

const STATUS_STYLE = {
  scheduled: 'bg-teal-soft text-teal',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-rose-50 text-rose-600',
};

export function VisitsHero({ lovedOne, team }) {
  const shown = team.slice(0, 2);
  return (
    <div className="flex flex-wrap items-end justify-between gap-8">
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-coral/30 bg-coral-soft/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-coral">
          <CalendarDays className="h-3.5 w-3.5" /> Care Visits
        </span>
        <h1 className="mt-5 font-serif text-5xl font-semibold leading-tight text-ink">
          Your family&apos;s care is in <em className="text-teal">trusted hands.</em>
        </h1>
        <p className="mt-5 text-lg text-slate-600">
          View upcoming and recent visits for {lovedOne}, and learn about the caregivers who look after them.
        </p>
      </div>

      {team.length > 0 && (
        <div className="rounded-3xl border border-coral-soft bg-white/50 px-6 py-5 text-right shadow-sm">
          <div className="flex justify-end -space-x-3">
            {shown.map((c) => (
              <Avatar key={c.caregiver_id} name={c.full_name} size="sm" />
            ))}
            {team.length > shown.length && (
              <span className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-coral-soft text-xs font-semibold text-coral">
                +{team.length - shown.length}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {team.length} caregiver{team.length > 1 ? 's' : ''} on {firstName(lovedOne)}&apos;s care team
          </p>
        </div>
      )}
    </div>
  );
}

export function VisitCard({ visit, selected, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className={`flex cursor-pointer items-center gap-4 rounded-3xl border bg-white/50 p-5 shadow-sm transition ${
        selected ? 'border-coral ring-2 ring-coral/20' : 'border-coral-soft hover:border-coral/50'
      }`}
    >
      <Avatar name={visit.caregiver_name} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{fmtDate(visit.scheduled_start)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-teal">
          <Clock className="h-3.5 w-3.5" /> {fmtTime(visit.scheduled_start)} – {fmtTime(visit.scheduled_end)}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs italic text-slate-500">
          <Info className="h-3.5 w-3.5" /> Caregiver: {visit.caregiver_name}
        </p>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
        <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_STYLE[visit.status] ?? STATUS_STYLE.completed}`}>
          {titleCase(visit.status)}
        </span>
      </div>
      <Link
        href={`/visits/${visit.id}`}
        onClick={(e) => e.stopPropagation()}
        aria-label="Open visit details"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-soft text-coral hover:bg-coral hover:text-white"
      >
        <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  );
}

const GUARANTEES = ['Background-checked caregivers', 'Condition-specific certification', 'GPS-verified check-ins', 'Every visit logged'];

export function TrustGuarantee() {
  return (
    <section className="rounded-3xl border border-teal/20 bg-teal-soft/60 p-6">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal text-white">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <div>
          <h3 className="text-lg font-medium text-ink">The OmniCare Trust Guarantee</h3>
          <p className="text-sm text-teal">Safety, quality, and compassion in every visit.</p>
        </div>
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-4 text-sm text-slate-700">
        {GUARANTEES.map((g) => (
          <li key={g} className="flex items-center gap-2">
            <CircleCheck className="h-4 w-4 shrink-0 text-teal" /> {g}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CaregiverSpotlight({ caregiver, lovedOne }) {
  const stats = [
    { label: `Visits with ${firstName(lovedOne)}`, value: caregiver.visit_count },
    { label: 'Completed', value: caregiver.completed_visit_count },
    { label: 'Next visit', value: caregiver.next_visit_at ? fmtDate(caregiver.next_visit_at, 'MMM d') : '—' },
    { label: 'Last visit', value: caregiver.last_visit_at ? fmtDate(caregiver.last_visit_at, 'MMM d') : '—' },
  ];

  return (
    <section className="overflow-hidden rounded-4xl border border-coral-soft bg-white/60 shadow-md">
      <div className="h-32 bg-coral-soft/70" />
      <div className="px-8 pb-8">
        <div className="-mt-16 flex flex-wrap items-end gap-6">
          <Avatar name={caregiver.full_name} size="lg" />
          <div className="flex-1 pb-2">
            <h3 className="flex flex-wrap items-center gap-3 font-serif text-3xl font-semibold text-ink">
              {caregiver.full_name}
              {caregiver.certifications.length > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-teal-soft px-2 py-0.5 font-sans text-xs font-medium text-teal">
                  <ShieldCheck className="h-3 w-3" /> Certified
                </span>
              )}
            </h3>
            {caregiver.certified_since && (
              <p className="mt-1 italic text-teal">Certified since {fmtDate(caregiver.certified_since, 'MMMM yyyy')}</p>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-cream-deep/40 p-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="mt-1 text-xl font-medium text-ink">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h4 className="text-xl font-medium text-ink">Certifications</h4>
          <div className="mt-4 flex flex-wrap gap-3">
            {caregiver.certifications.length === 0 && <p className="text-sm text-slate-500">No certifications on record.</p>}
            {caregiver.certifications.map((c) => (
              <span key={c} className="flex items-center gap-2 rounded-full border border-teal/30 bg-teal-soft/50 px-4 py-2 text-sm text-ink">
                <Award className="h-4 w-4 text-teal" /> {titleCase(c)} Care
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
