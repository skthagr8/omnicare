'use client';

import { eachDayOfInterval, format, getDay, parseISO } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Clock,
  HeartHandshake,
  Info,
  Smile,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const CORAL = '#f47b4f';
const TEAL = '#22a699';
const PEACH = '#fdd8b8';
const axis = { fontSize: 11, fill: '#64748b' };

export function AwarenessBanner() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-100/80 px-5 py-4 text-sm text-slate-600">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
        <Info className="h-4 w-4 text-slate-500" />
      </span>
      These trends are for awareness, not diagnosis. Contact your care team with any concerns.
      <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
    </div>
  );
}

export function PeriodBadge({ start, end }) {
  return (
    <div className="rounded-full border border-coral-soft bg-white/60 px-4 py-2 text-xs text-slate-600">
      {format(parseISO(start), 'MMM d')} – {format(parseISO(end), 'MMM d, yyyy')}
    </div>
  );
}

function Card({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <section className="flex flex-col rounded-3xl border border-coral-soft bg-white/50 p-6 shadow-sm">
      <h3 className="flex items-center gap-3 text-xl font-medium text-ink">
        <Icon className="h-5 w-5 text-coral" /> {title}
      </h3>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-4 flex-1">{children}</div>
      {footer && <p className="mt-4 border-t border-coral-soft pt-4 text-sm italic text-slate-500">{footer}</p>}
    </section>
  );
}

function ChartEmpty({ children }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-2xl bg-cream-deep/30 px-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <p className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-600">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} /> {label}
    </p>
  );
}

const toChart = (points) => points.map((p) => ({ day: format(parseISO(p.date), 'MMM d'), value: p.value }));

/** Timed Up and Go: seconds to stand, walk 3 m, return and sit. Lower is better. */
export function MobilityCard({ points }) {
  return (
    <Card
      icon={Activity}
      title="Physical Mobility"
      subtitle="Timed Up & Go test, in seconds (lower is better)"
      footer={points.length ? `${points.length} completed mobility check${points.length > 1 ? 's' : ''} this period.` : null}
    >
      {points.length === 0 ? (
        <ChartEmpty>No mobility checks have been completed in this period yet.</ChartEmpty>
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={toChart(points)} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={PEACH} strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tick={axis} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" name="Seconds" stroke={TEAL} strokeWidth={2} dot={{ r: 3, fill: TEAL }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Legend color={TEAL} label="TUG time (s)" />
        </>
      )}
    </Card>
  );
}

/** Cohen-Mansfield Agitation Inventory total. Lower means calmer. */
export function WellbeingCard({ points }) {
  return (
    <Card
      icon={Smile}
      title="Calm & Comfort"
      subtitle="Agitation score from caregiver check-ins (lower is calmer)"
      footer={points.length ? `${points.length} completed comfort check${points.length > 1 ? 's' : ''} this period.` : null}
    >
      {points.length === 0 ? (
        <ChartEmpty>No comfort checks have been completed in this period yet.</ChartEmpty>
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={toChart(points)} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={PEACH} strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tick={axis} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" name="Score" fill={PEACH} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend color={PEACH} label="Agitation score" />
        </>
      )}
    </Card>
  );
}

export function MedicationCard({ start, end, days }) {
  const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
  const range = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) });
  const cells = [...Array(getDay(range[0])).fill(null), ...range];
  const given = days.reduce((n, d) => n + d.administered, 0);
  const missed = days.reduce((n, d) => n + d.missed, 0);

  const color = (d) => {
    const rec = byDate[format(d, 'yyyy-MM-dd')];
    if (!rec) return '#e2e8f0';
    return rec.missed > 0 ? CORAL : TEAL;
  };

  return (
    <Card
      icon={CalendarDays}
      title="Medication"
      subtitle="Doses recorded during visits"
      footer={given + missed ? `${given} dose${given === 1 ? '' : 's'} given, ${missed} missed or refused.` : 'No doses recorded in this period.'}
    >
      <div className="grid grid-cols-7 gap-y-3 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="text-xs font-medium text-slate-500">{d}</span>
        ))}
        {cells.map((day, i) =>
          day ? (
            <div key={i} className="flex flex-col items-center gap-1" title={format(day, 'MMM d')}>
              <span className="text-[9px] text-slate-400">{format(day, 'd')}</span>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: color(day) }} />
            </div>
          ) : (
            <span key={i} />
          )
        )}
      </div>
      <div className="mt-4 flex justify-center gap-5">
        <Legend color={TEAL} label="Given" />
        <Legend color={CORAL} label="Missed" />
        <Legend color="#e2e8f0" label="No record" />
      </div>
    </Card>
  );
}

export function StatTiles({ summary }) {
  const tiles = [
    { label: 'Visits Completed', value: summary.visits_completed, icon: HeartHandshake, tone: 'teal' },
    { label: 'Care Hours', value: `${summary.care_hours}h`, icon: Clock, tone: 'teal' },
    {
      label: 'Care Tasks Done',
      value: summary.tasks_total ? `${summary.tasks_completed} / ${summary.tasks_total}` : '—',
      icon: ClipboardCheck,
      tone: 'teal',
    },
    {
      label: 'Flagged Observations',
      value: summary.flagged_observations,
      icon: AlertTriangle,
      tone: summary.flagged_observations ? 'coral' : 'teal',
    },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map(({ label, value, icon: Icon, tone }) => (
        <div key={label} className="rounded-3xl border border-coral-soft bg-white/50 p-6 shadow-sm">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              tone === 'coral' ? 'bg-coral-soft text-coral' : 'bg-teal-soft text-teal'
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <p className="mt-5 text-sm text-slate-600">{label}</p>
          <p className="mt-1 text-2xl font-medium text-ink">{value}</p>
        </div>
      ))}
    </div>
  );
}
