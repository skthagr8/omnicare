'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import MapCanvas from '../../components/dashboard/MapCanvas';
import QueuePanel from '../../components/dashboard/QueuePanel';

export default function DashboardPage() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader timeLabel={now.toISOString().slice(11, 16)} />
        <div className="relative flex min-h-0 flex-1">
          <MapCanvas />
          <QueuePanel />
        </div>
      </div>
    </div>
  );
}
