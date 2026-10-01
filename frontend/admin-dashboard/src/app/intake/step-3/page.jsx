'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleHelp, Stethoscope } from 'lucide-react';
import Sidebar from '../../../components/layout/Sidebar';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import AcuitySelector from '../../../components/intake/AcuitySelector';
import IntakeFooter from '../../../components/intake/IntakeFooter';
import IntakeProgress from '../../../components/intake/IntakeProgress';
import IntakeStatusBar from '../../../components/intake/IntakeStatusBar';

export default function IntakeStepThreePage() {
  const router = useRouter();
  const [selectedAcuity, setSelectedAcuity] = useState('medium');

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F5F7F8]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader timeLabel="14:22" />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <IntakeProgress currentStep={3} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-8 pb-8 pt-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0F6B72]"><Stethoscope className="h-3.5 w-3.5" />Patient Admission Protocol</p>
                <h1 className="mt-1 text-2xl font-bold text-[#2B2E33]">New Patient Intake</h1>
                <h2 className="mt-6 flex items-center gap-1.5 text-sm font-bold text-[#0F6B72]"><Stethoscope className="h-4 w-4" />Step 3: Clinical Acuity Assessment</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">Evaluate the patient&apos;s initial priority level based on physiological stability and nursing intensity requirements. This selection informs staff allocation and monitoring frequency.</p>
              </div>
              <button className="mt-14 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0F6B72]"><CircleHelp className="h-3.5 w-3.5" />Assessment Guidelines</button>
            </div>
            <div className="mb-4 mt-7 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"><span>Step 3 of 5: Clinical Acuity</span><span>60% Complete</span></div>
            <AcuitySelector selectedAcuity={selectedAcuity} onAcuityChange={setSelectedAcuity} />
          </main>
          <IntakeFooter previousLabel="Step 2: Diagnosis" nextLabel="Step 4: Contact Details" onPrevious={() => router.push('/intake/step-2')} onNext={() => router.push('/intake/step-4')} />
          <IntakeStatusBar />
        </div>
      </div>
    </div>
  );
}
