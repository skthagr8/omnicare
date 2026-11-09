'use client';

import { useCallback, useState } from 'react';
import { MapCanvas, QueuePanel, useOnShiftCaregivers } from '../../../components/dashboard/Dashboard';

export default function DashboardPage() {
  const { caregivers, loading, error, updatedAt, refresh } = useOnShiftCaregivers();
  const [selectedId, setSelectedId] = useState(null);

  // Clicking the same caregiver again clears the selection.
  const handleSelect = useCallback((id) => setSelectedId((current) => (current === id ? null : id)), []);

  return (
    <div className="flex h-full min-h-[560px] w-full overflow-hidden rounded-xl border border-coral-soft bg-cream-deep/50">
      <div className="relative flex min-h-0 min-w-0 flex-1">
        <MapCanvas
          caregivers={caregivers}
          selectedId={selectedId}
          onSelect={handleSelect}
          error={error}
          updatedAt={updatedAt}
          onRefresh={refresh}
        />
        <QueuePanel caregivers={caregivers} loading={loading} selectedId={selectedId} onSelect={handleSelect} />
      </div>
    </div>
  );
}
