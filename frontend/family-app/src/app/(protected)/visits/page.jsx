'use client';

import { useState } from 'react';
import { CaregiverSpotlight, TrustGuarantee, VisitCard, VisitsHero } from '../../../components/visits/Visits';
import { EmptyState, ErrorState, LoadingState } from '../../../components/layout/Layout';
import { getCareTeam, getClientVisits, useApi, useLinkedClient } from '../../../utils/familyApi';

function loadVisitsAndTeam(clientId) {
  if (!clientId) return Promise.resolve(null);
  return Promise.all([getClientVisits(clientId), getCareTeam(clientId)]).then(([visits, team]) => ({ visits, team }));
}

export default function VisitsPage() {
  const { client, loading, error } = useLinkedClient();
  const result = useApi(() => loadVisitsAndTeam(client?.client_id), [client?.client_id]);
  const [selectedId, setSelectedId] = useState(null);

  if (loading || result.loading) return <LoadingState />;
  if (error || result.error) return <ErrorState message={error || result.error} onRetry={result.reload} />;
  if (!client) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <EmptyState title="No loved one is linked to your account yet" />
      </div>
    );
  }

  const { visits, team } = result.data;
  const now = Date.now();
  const upcoming = visits
    .filter((v) => v.status === 'scheduled' || v.status === 'in_progress')
    .filter((v) => new Date(v.scheduled_end).getTime() >= now)
    .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));
  const recent = visits.filter((v) => !upcoming.includes(v)).slice(0, 5);

  const selected = visits.find((v) => v.id === selectedId) ?? upcoming[0] ?? recent[0];
  const spotlight = team.find((c) => c.caregiver_id === selected?.caregiver_id) ?? team[0];

  const list = (items) =>
    items.map((visit) => (
      <VisitCard key={visit.id} visit={visit} selected={visit.id === selected?.id} onSelect={() => setSelectedId(visit.id)} />
    ));

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-6 py-10">
      <VisitsHero lovedOne={client.full_name} team={team} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-5">
          <h2 className="px-2 text-2xl font-medium text-ink">Upcoming Visits</h2>
          {upcoming.length ? list(upcoming) : <EmptyState title="No upcoming visits scheduled">New visits appear here once the care team schedules them.</EmptyState>}

          {recent.length > 0 && (
            <>
              <h2 className="px-2 pt-4 text-2xl font-medium text-ink">Recent Visits</h2>
              {list(recent)}
            </>
          )}
          <TrustGuarantee />
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-medium text-ink">Caregiver Spotlight</h2>
            <p className="text-sm italic text-slate-500">Click a visit to view its caregiver</p>
          </div>
          {spotlight ? (
            <CaregiverSpotlight caregiver={spotlight} lovedOne={client.full_name} />
          ) : (
            <EmptyState title="No caregivers assigned yet" />
          )}
        </div>
      </div>
    </div>
  );
}
