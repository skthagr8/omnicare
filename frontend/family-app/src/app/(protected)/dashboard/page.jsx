'use client';

import {
  AwarenessBanner,
  MedicationCard,
  MobilityCard,
  PeriodBadge,
  StatTiles,
  WellbeingCard,
} from '../../../components/dashboard/Dashboard';
import { EmptyState, ErrorState, LoadingState } from '../../../components/layout/Layout';
import { firstName, getHealthSummary, useApi, useLinkedClient } from '../../../utils/familyApi';

export default function DashboardPage() {
  const { client, loading, error } = useLinkedClient();
  const health = useApi(() => (client ? getHealthSummary(client.client_id, 30) : Promise.resolve(null)), [client?.client_id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!client) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <EmptyState title="No loved one is linked to your account yet">
          Please contact your care coordinator to connect your account.
        </EmptyState>
      </div>
    );
  }

  const summary = health.data;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-6 py-8">
      <AwarenessBanner />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="rounded-full border border-teal/30 bg-teal-soft px-3 py-1 text-xs font-medium text-teal">
            Last 30 days
          </span>
          <h1 className="mt-4 font-serif text-4xl font-semibold text-ink">Health &amp; Wellbeing</h1>
          <p className="mt-2 text-slate-600">
            Tracking progress and comfort for{' '}
            <span className="font-semibold text-teal">{firstName(client.full_name)}</span>
          </p>
        </div>
        {summary && <PeriodBadge start={summary.period_start} end={summary.period_end} />}
      </div>

      {health.loading && <LoadingState label="Loading health trends…" />}
      {health.error && <ErrorState message={health.error} onRetry={health.reload} />}

      {summary && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <MobilityCard points={summary.tug_seconds} />
            <WellbeingCard points={summary.cmai_scores} />
            <MedicationCard start={summary.period_start} end={summary.period_end} days={summary.medication_days} />
          </div>
          <StatTiles summary={summary} />
        </>
      )}
    </div>
  );
}
