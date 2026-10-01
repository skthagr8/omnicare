'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/layout/Sidebar';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import AddContactCard from '../../../components/intake/AddContactCard';
import ContactCard from '../../../components/intake/ContactCard';
import ContactSidebar from '../../../components/intake/ContactSidebar';
import IntakeFooter from '../../../components/intake/IntakeFooter';
import IntakeProgress from '../../../components/intake/IntakeProgress';
import IntakeStatusBar from '../../../components/intake/IntakeStatusBar';

const INITIAL_CONTACTS = [
  { id: 'primary', name: 'Sarah Miller', initials: 'SM', relationship: 'Spouse', phone: '(555) 123-4567', address: '124 Oak Street, Springfield, IL 62704', email: 'sarah.m@example.com' },
  { id: 'brother', name: 'James Vance', initials: 'JV', relationship: 'Brother', phone: '(555) 987-6543', address: '88 West Maple Ave, Chicago, IL 60611', email: 'j.vance@example.com' },
];

export default function IntakeStepFourPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);

  const addContact = (contact) => setContacts((current) => [...current, { ...contact, id: `contact-${Date.now()}` }]);
  const removeContact = (id) => setContacts((current) => current.filter((contact) => contact.id !== id));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F5F7F8]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader timeLabel="14:22" />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <IntakeProgress currentStep={4} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-8 pb-8 pt-7">
            <div className="mb-7 flex items-start justify-between gap-10"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0F6B72]">Step 4 of 5: Emergency Contacts</p><h1 className="mt-2 text-2xl font-bold text-[#2B2E33]">Emergency &amp; Support Contacts</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">Please provide at least one primary emergency contact. You can add additional family members, caregivers, or legal representatives who should be informed about your care plan.</p></div></div>
            <div className="grid grid-cols-[minmax(0,1fr)_220px] gap-8"><section><div className="grid grid-cols-2 gap-4">{contacts.map((contact, index) => <ContactCard key={contact.id} contact={contact} primary={index === 0} onRemove={removeContact} />)}<AddContactCard onAdd={addContact} /></div></section><ContactSidebar /></div>
          </main>
          <IntakeFooter previousLabel="Back to Acuity" nextLabel="Continue to Review" onPrevious={() => router.push('/intake/step-3')} onNext={() => router.push('/intake/step-5')} />
          <IntakeStatusBar />
        </div>
      </div>
    </div>
  );
}
