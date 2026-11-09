'use client';

import { useCallback, useMemo, useState } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { CalendarDays, RefreshCw, Search } from 'lucide-react';
import {
  AssignVisitModal,
  DayNavigator,
  ScheduleLegend,
  SchedulingGrid,
  Toast,
  VisitDetailsModal,
  buildRows,
  useSchedule,
} from '../../../components/scheduling/Scheduling';

export default function SchedulingPage() {
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [search, setSearch] = useState('');
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [toast, setToast] = useState('');

  const { sessions, caregivers, daySessions, clients, visitDays, loading, error, reload } = useSchedule(day);

  const rows = useMemo(() => {
    const all = buildRows(day, daySessions, caregivers);
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all
      .map((row) => (row.caregiver.full_name || '').toLowerCase().includes(term)
        ? row
        : { ...row, visits: row.visits.filter((v) => (clients.get(v.client_id)?.full_name || '').toLowerCase().includes(term)) })
      .filter((row) => row.visits.length > 0);
  }, [day, daySessions, caregivers, clients, search]);

  const visitCount = rows.reduce((n, r) => n + r.visits.length, 0);

  const handleAssigned = useCallback((start, message) => {
    setIsAssignOpen(false);
    setToast(message);
    setDay(startOfDay(start));
    reload();
  }, [reload]);
  const clearToast = useCallback(() => setToast(''), []);
  const closeAssign = useCallback(() => setIsAssignOpen(false), []);
  const closeVisit = useCallback(() => setSelectedVisit(null), []);

  return (
    <div className="flex h-full w-full overflow-hidden rounded-2xl border border-coral-soft bg-white shadow-sm">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-4 border-b border-coral-soft bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-6 w-6 text-teal" />
            <div>
              <h1 className="text-lg font-semibold text-ink">Clinical Scheduling</h1>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {isSameDay(day, new Date()) ? 'Today, ' : ''}{format(day, 'EEEE d MMMM yyyy')}
              </p>
            </div>
          </div>
          <DayNavigator day={day} onChange={(d) => setDay(startOfDay(d))} visitDays={visitDays} />
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" aria-label="Search staff or patients" placeholder="Search staff or patients..." className="w-56 rounded-full border border-coral-soft py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-teal" />
            </div>
            <button onClick={reload} disabled={loading} title="Reload" className="flex h-9 w-9 items-center justify-center rounded-lg border border-coral-soft text-slate-500 hover:bg-cream disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setIsAssignOpen(true)} disabled={loading} className="rounded-xl bg-teal px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1b8a7f] disabled:bg-slate-300">+ Assign New Visit</button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-4 bg-[#ffffff] p-5">
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {!error && loading && sessions.length === 0 && <p className="py-16 text-center text-sm text-slate-400">Loading schedule…</p>}
          {!loading && !error && rows.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-coral-soft bg-white py-16 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-600">{search ? 'No visits match your search on this day.' : 'No visits scheduled on this day.'}</p>
              <p className="text-xs text-slate-400">Use the double arrows to jump to the previous or next day with visits.</p>
            </div>
          )}
          {rows.length > 0 && <SchedulingGrid day={day} rows={rows} clients={clients} onSelectVisit={setSelectedVisit} />}
          <ScheduleLegend caregiverCount={rows.length} visitCount={visitCount} />
        </main>
      </div>

      {isAssignOpen && (
        <AssignVisitModal defaultDay={day} sessions={sessions} caregivers={caregivers} onClose={closeAssign} onAssigned={handleAssigned} />
      )}
      {selectedVisit && (
        <VisitDetailsModal
          visit={selectedVisit}
          client={clients.get(selectedVisit.client_id)}
          caregiver={caregivers.get(selectedVisit.caregiver_id)}
          onClose={closeVisit}
        />
      )}
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
