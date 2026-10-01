'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/layout/Sidebar';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import AddressDetails from '../../../components/intake/AddressDetails';
import IdentityDetails from '../../../components/intake/IdentityDetails';
import IntakeFooter from '../../../components/intake/IntakeFooter';
import IntakeProgress from '../../../components/intake/IntakeProgress';
import IntakeStatusBar from '../../../components/intake/IntakeStatusBar';

const INITIAL_VALUES = {
  firstName: 'Eleanor',
  lastName: 'Vance',
  dateOfBirth: '1945-05-12',
  gender: 'Female',
  street: '4522 Oakwood Drive',
  city: 'North Springfield',
  postalCode: '62704',
};

export default function IntakeStepOnePage() {
  const router = useRouter();
  const [values, setValues] = useState(INITIAL_VALUES);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleNext = () => {
    router.push('/intake/step-2');
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F5F7F8]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader timeLabel="14:22" />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <IntakeProgress />
          <main className="mx-auto w-full max-w-6xl flex-1 px-8 pb-8 pt-7">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#2B2E33]">Patient Demographics</h1>
              <p className="mt-1 text-sm text-slate-500">Confirm the patient&apos;s primary identification and residential information.</p>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <IdentityDetails values={values} onChange={handleChange} />
              <AddressDetails values={values} onChange={handleChange} />
            </div>
          </main>
          <IntakeFooter onPrevious={() => router.push('/patients')} onNext={handleNext} />
          <IntakeStatusBar />
        </div>
      </div>
    </div>
  );
}
