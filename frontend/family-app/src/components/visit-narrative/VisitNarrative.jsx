'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  CircleCheck,
  CircleDashed,
  CircleX,
  ClipboardList,
  Clock,
  Flag,
  Heart,
  Pill,
  Quote,
  Stethoscope,
} from 'lucide-react';
import { Avatar } from '../layout/Layout';
import { firstName, fmtDate, fmtTime, titleCase } from '../../utils/familyApi';

const ASSESSMENT_LABEL = {
  tug: 'Mobility check (Timed Up & Go)',
  cmai: 'Comfort & agitation check',
  braden: 'Skin health check (Braden)',
  delirium: 'Confusion screening',
  iadl: 'Daily living skills',
};

export function BackToVisits() {
  return (
    <Link href="/visits" className="flex items-center gap-2 text-sm text-slate-600 hover:text-ink">
      <ArrowLeft className="h-4 w-4" /> Back to Visits
    </Link>
  );
}

function NarrativeHero({ caregiverName, completed }) {
  return (
    <div className="relative h-64 bg-linear-to-br from-amber-200 via-coral-soft to-teal-soft">
      <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-white to-transparent" />
      <div className="absolute bottom-8 left-12 flex items-center gap-4 rounded-2xl bg-white/90 px-5 py-4 shadow-lg backdrop-blur">
        <Avatar name={caregiverName} size="sm" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-coral">
            {completed ? 'Your caregiver this visit' : 'Your caregiver'}
          </p>
          <p className="font-medium text-ink">{caregiverName}</p>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, tone = 'coral', title, children }) {
  const toneClass = tone === 'teal' ? 'bg-teal-soft text-teal' : 'bg-coral-soft text-coral';
  return (
    <section>
      <h2 className="flex items-center gap-3 text-2xl font-medium text-ink">
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        {title}
      </h2>
      <div className="mt-5 text-slate-600">{children}</div>
    </section>
  );
}

function Nothing({ children }) {
  return <p className="text-sm italic text-slate-400">{children}</p>;
}

function StatusIcon({ ok, pending }) {
  if (pending) return <CircleDashed className="h-5 w-5 shrink-0 text-slate-400" />;
  return ok ? <CircleCheck className="h-5 w-5 shrink-0 text-teal" /> : <CircleX className="h-5 w-5 shrink-0 text-coral" />;
}

function Row({ icon, title, detail, right }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-coral-soft/70 bg-cream/40 px-4 py-3">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{title}</p>
        {detail && <p className="text-sm text-slate-500">{detail}</p>}
      </div>
      {right && <span className="shrink-0 text-xs text-slate-500">{right}</span>}
    </li>
  );
}

function summarise(visit) {
  const done = visit.tasks.filter((t) => t.status === 'completed').length;
  const given = visit.medications.filter((m) => m.status === 'administered').length;
  const missed = visit.medications.filter((m) => m.status === 'missed' || m.status === 'refused').length;
  const flagged = visit.observations.filter((o) => o.is_flagged).length;

  const parts = [];
  if (visit.tasks.length) parts.push(`${done} of ${visit.tasks.length} care activities were completed`);
  if (visit.medications.length) parts.push(`${given} medication dose${given === 1 ? ' was' : 's were'} given${missed ? ` and ${missed} missed or refused` : ''}`);
  if (!parts.length) return 'No care activities or medications were recorded for this visit.';
  return `${parts.join(', and ')}. ${flagged ? `${flagged} observation${flagged > 1 ? 's were' : ' was'} flagged for the care team’s attention.` : 'No concerns were flagged.'}`;
}

export function VisitNarrative({ visit }) {
  const completed = visit.status === 'completed';
  const cg = firstName(visit.caregiver_name);
  const lovedOne = firstName(visit.client_name);

  return (
    <>
      <article className="overflow-hidden rounded-[2.5rem] bg-white shadow-[0_24px_60px_-24px_rgba(0,0,0,0.18)]">
        <NarrativeHero caregiverName={visit.caregiver_name} completed={completed} />

        <div className="space-y-14 px-12 pb-12 pt-6">
          <header>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="rounded-full bg-teal-soft px-3 py-1 text-xs font-medium text-teal">
                {titleCase(visit.status)} Visit
              </span>
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> {fmtDate(visit.scheduled_start, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <h1 className="mt-6 font-serif text-5xl font-semibold text-ink">
              {completed ? 'A visit with' : 'Upcoming visit with'} <em className="text-teal">{lovedOne}.</em>
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-500">
              {visit.check_in_at ? (
                <>
                  {cg} checked in at <strong className="text-ink">{fmtTime(visit.check_in_at)}</strong>
                  {visit.check_out_at ? (
                    <> and checked out at <strong className="text-ink">{fmtTime(visit.check_out_at)}</strong>.</>
                  ) : (
                    ' and is with them now.'
                  )}
                </>
              ) : (
                <>
                  Scheduled from <strong className="text-ink">{fmtTime(visit.scheduled_start)}</strong> to{' '}
                  <strong className="text-ink">{fmtTime(visit.scheduled_end)}</strong> with {visit.caregiver_name}.
                </>
              )}
            </p>
          </header>

          <Section icon={ClipboardList} title="Care Activities">
            {visit.tasks.length === 0 ? (
              <Nothing>No care activities recorded for this visit.</Nothing>
            ) : (
              <ul className="space-y-3">
                {visit.tasks.map((t, i) => (
                  <Row
                    key={i}
                    icon={<StatusIcon ok={t.status === 'completed'} />}
                    title={t.title}
                    detail={t.was_skipped ? `Skipped${t.skip_reason ? `: ${t.skip_reason}` : ''}` : titleCase(t.status)}
                    right={t.completed_at && fmtTime(t.completed_at)}
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section icon={Pill} title="Medications">
            {visit.medications.length === 0 ? (
              <Nothing>No medications recorded for this visit.</Nothing>
            ) : (
              <ul className="space-y-3">
                {visit.medications.map((m, i) => (
                  <Row
                    key={i}
                    icon={<StatusIcon ok={m.status === 'administered'} pending={m.status === 'pending'} />}
                    title={`${m.name} · ${m.dosage}`}
                    detail={m.missed_reason ? `${titleCase(m.status)}: ${m.missed_reason}` : titleCase(m.status)}
                    right={m.administered_at && fmtTime(m.administered_at)}
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section icon={Stethoscope} title="Wellness Checks">
            {visit.assessments.length === 0 ? (
              <Nothing>No wellness checks planned for this visit.</Nothing>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {visit.assessments.map((a, i) => (
                  <Row
                    key={i}
                    icon={<StatusIcon ok={a.state === 'completed'} pending={a.state === 'pending'} />}
                    title={ASSESSMENT_LABEL[a.assessment_type] ?? titleCase(a.assessment_type)}
                    detail={titleCase(a.state)}
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section icon={Heart} tone="teal" title="Caregiver Notes">
            {visit.observations.length === 0 ? (
              <Nothing>No notes were written during this visit.</Nothing>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {visit.observations.map((o, i) => (
                  <blockquote
                    key={i}
                    className="relative rounded-3xl border border-teal/20 bg-teal-soft/40 p-8 pt-10 leading-relaxed text-ink"
                  >
                    <Quote className="absolute -left-2 -top-3 h-9 w-9 fill-teal-soft text-teal/60" />
                    &ldquo;{o.note}&rdquo;
                    {o.is_flagged && (
                      <span className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-coral">
                        <Flag className="h-3.5 w-3.5" /> Flagged for the care team
                      </span>
                    )}
                  </blockquote>
                ))}
              </div>
            )}
          </Section>

          <div className="border-t border-coral-soft pt-10">
            <section className="flex gap-5 rounded-3xl border border-coral-soft bg-cream/60 p-8">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                <CircleCheck className="h-6 w-6 text-green-500" />
              </span>
              <div>
                <h3 className="text-lg font-medium text-ink">Visit Summary</h3>
                <p className="mt-2 leading-relaxed text-slate-500">{summarise(visit)}</p>
              </div>
            </section>
          </div>
        </div>
      </article>

      {visit.check_out_at && (
        <div className="flex justify-center gap-6 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Logged securely at {fmtTime(visit.check_out_at)}
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-2">
            <Heart className="h-4 w-4" /> Compassionate care standard
          </span>
        </div>
      )}
    </>
  );
}
