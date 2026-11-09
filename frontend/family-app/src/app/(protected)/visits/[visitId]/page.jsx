'use client';

import { useParams } from 'next/navigation';
import { BackToVisits, VisitNarrative } from '../../../../components/visit-narrative/VisitNarrative';
import { ErrorState, LoadingState } from '../../../../components/layout/Layout';
import { getVisitDetail, useApi } from '../../../../utils/familyApi';

export default function VisitNarrativePage() {
  const { visitId } = useParams();
  const { data: visit, loading, error, reload } = useApi(() => getVisitDetail(visitId), [visitId]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <BackToVisits />
      {loading && <LoadingState label="Loading visit…" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {visit && <VisitNarrative visit={visit} />}
    </div>
  );
}
