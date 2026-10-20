'use client';

import { useState } from 'react';
import ReportFilters from '../../../components/reports/ReportFilters';
import ReportHeader from '../../../components/reports/ReportHeader';
import ReportNotes from '../../../components/reports/ReportNotes';
import ReportSummary from '../../../components/reports/ReportSummary';
import ReportTable from '../../../components/reports/ReportTable';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('Utilization');

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <ReportHeader activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="px-8 py-6">
          <ReportFilters />
          <ReportSummary />
          <ReportTable />
          <ReportNotes />
        </main>
      </div>
    </div>
  );
}
