'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ClipboardList, HeartPulse, UserRound } from 'lucide-react';
import Sidebar from '../../../components/layout/Sidebar';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import IntakeProgress from '../../../components/intake/IntakeProgress';
import IntakeStatusBar from '../../../components/intake/IntakeStatusBar';
import ReviewAttestation from '../../../components/intake/ReviewAttestation';
import ReviewFooter from '../../../components/intake/ReviewFooter';
import ReviewIntro from '../../../components/intake/ReviewIntro';
import ReviewSectionCard from '../../../components/intake/ReviewSectionCard';

const REVIEW_SECTIONS = [
  { icon: UserRound, title: 'Patient Demographics', items: [{ label: 'Full Name', value: 'Eleanor Vance' }, { label: 'Date of Birth', value: 'May 12, 1945 (79 years)' }, { label: 'Gender', value: 'Female' }, { label: 'Primary Language', value: 'English' }, { label: 'Residential Address', value: '4522 Oakwood Drive, North Springfield, IL 62704' }] },
  { icon: ClipboardList, title: 'Clinical Assessment', items: [{ label: 'Primary Diagnosis', value: 'General Geriatric' }, { label: 'Secondary Diagnosis', value: 'Hypertension' }, { label: 'Current Medications', pills: ['Metformin 500mg', 'Lisinopril 10mg', 'Atorvastatin 20mg'] }, { label: 'Allergies', pills: ['Penicillin (Severe)', 'Shellfish'] }, { label: 'Tobacco Use', value: 'Former smoker (Quit 2012)' }] },
  { icon: Activity, title: 'Acuity & Risk Profile', items: [{ label: 'Acuity Level', value: 'High (Level 2)' }, { label: 'Fall Risk Score', value: '82/100 (High)' }, { label: 'Mental Status', value: 'Alert and Oriented x3' }, { label: 'Mobility Status', value: 'Requires Assistance (Walker)' }, { label: 'Pain Scale', value: '4/10 (Chronic Lower Back)' }] },
  { icon: HeartPulse, title: 'Emergency Contacts', items: [{ label: 'Primary Contact', value: 'Sarah Thompson (Spouse)' }, { label: 'Primary Phone', value: '(503) 555-0192' }, { label: 'Secondary Contact', value: 'David Thompson (Son)' }, { label: 'Secondary Phone', value: '(503) 555-0841' }, { label: 'Advance Directive', value: 'On File (POLST Submitted)' }] },
];

export default function IntakeStepFivePage() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!accepted) return;
    setSubmitted(true);
  };

  return <div className="flex h-screen w-full overflow-hidden bg-[#F5F7F8]"><Sidebar /><div className="flex min-w-0 flex-1 flex-col"><DashboardHeader timeLabel="14:22" /><div className="flex min-h-0 flex-1 flex-col overflow-y-auto"><IntakeProgress currentStep={5} /><main className="mx-auto w-full max-w-6xl flex-1 px-8 pb-8 pt-7"><div className="mb-6"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0F6B72]">Step 5: Final Verification</p><h1 className="mt-2 text-2xl font-bold text-[#2B2E33]">Intake Summary Review</h1><p className="mt-1 text-sm text-slate-500">Verified records ensure patient safety and operational efficiency. Confirm the clinical details below.</p></div><ReviewIntro />{submitted && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">Intake record submitted for clinical review.</div>}<div className="mt-5 grid grid-cols-2 gap-5">{REVIEW_SECTIONS.map((section) => <ReviewSectionCard key={section.title} {...section} />)}</div><div className="mt-5"><ReviewAttestation accepted={accepted} onAccepted={setAccepted} /><ReviewFooter accepted={accepted} onBack={() => router.push('/intake/step-4')} onSubmit={handleSubmit} /></div></main><IntakeStatusBar /></div></div></div>;
}
