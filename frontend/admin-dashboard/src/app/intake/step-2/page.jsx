'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/layout/Sidebar';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import DiagnosisDetails from '../../../components/intake/DiagnosisDetails';
import IntakeFooter from '../../../components/intake/IntakeFooter';
import IntakeProgress from '../../../components/intake/IntakeProgress';
import IntakeStatusBar from '../../../components/intake/IntakeStatusBar';

export default function IntakeStepTwoPage() {
  const router = useRouter();
  const [diagnosis, setDiagnosis] = useState('General Geriatric');
  const [notes, setNotes] = useState('');

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F5F7F8]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader timeLabel="14:22" />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <IntakeProgress currentStep={2} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-8 pb-8 pt-7">
            <div className="mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0F6B72]">Patient Intake Flow</p>
              <h1 className="mt-1 text-2xl font-bold text-[#2B2E33]">Clinical Diagnosis &amp; History</h1>
              <p className="mt-1 text-sm text-slate-500">Document the primary clinical reason for admission and provide essential medical background.</p>
            </div>
            <div className="mb-5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"><span>Step 2 of 5: Clinical Assessment</span><span>40% Complete</span></div>
            <DiagnosisDetails diagnosis={diagnosis} onDiagnosisChange={setDiagnosis} notes={notes} onNotesChange={setNotes} />
          </main>
          <IntakeFooter previousLabel="Back: Step 1" nextLabel="Continue to Acuity" onPrevious={() => router.push('/intake/step-1')} onNext={() => router.push('/intake/step-3')} />
          <IntakeStatusBar />
        </div>
      </div>
    </div>
  );
}
