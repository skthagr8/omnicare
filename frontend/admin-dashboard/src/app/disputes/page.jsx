'use client';

import { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DisputeDetail from '../../components/disputes/DisputeDetail';
import DisputeQueue from '../../components/disputes/DisputeQueue';
import ResolutionForm from '../../components/disputes/ResolutionForm';
import { DISPUTES } from '../../components/disputes/disputeData';

export default function DisputesPage() {
  const [activeId, setActiveId] = useState(DISPUTES[0].id);
  const activeDispute = DISPUTES.find((dispute) => dispute.id === activeId);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader timeLabel="14:22" />
        <div className="flex min-h-0 flex-1">
          <DisputeQueue disputes={DISPUTES} activeId={activeId} onSelect={setActiveId} />
          <div className="flex min-w-0 flex-1 flex-col">
            <DisputeDetail dispute={activeDispute} />
            <ResolutionForm />
          </div>
        </div>
      </div>
    </div>
  );
}
