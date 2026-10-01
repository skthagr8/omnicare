export const STATUS_STYLES = {
  Open: 'bg-amber-50 text-amber-700 border-amber-200',
  'Under Review': 'bg-sky-50 text-sky-700 border-sky-200',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const DISPUTES = [
  {
    id: 'DSP-8821', status: 'Open', title: 'Medication Schedule Inconsistency', patient: 'Eleanor Vance', timeAgo: '14 mins ago', facility: 'Central Hospital - North Wing', mediator: 'Dr. Sarah Chen', caseInitiated: 'Oct 23, 2024',
    thread: [
      { author: 'David Vance (Son)', role: 'family', time: 'Oct 24, 2024 · 03:15 AM', text: 'We were informed my mother would receive her physiotherapy assessment on Tuesday. However, the nurse on duty mentioned there\u2019s no record of this in her schedule. This is the third time we\u2019ve had a delay in her rehab plan.' },
      { author: 'Nurse Sarah Jenkins', role: 'caregiver', time: 'Oct 24, 2024 · 08:30 AM', text: 'I\u2019ve reviewed Mrs. Vance\u2019s digital chart. The physio referral was flagged as "Pending Consultant Approval" due to a recent blood pressure spike. Our protocol requires cardiovascular stability before intensive physical therapy. I should have communicated this reason more clearly to the family.' },
      { author: 'David Vance (Son)', role: 'family', time: 'Oct 24, 2024 · 01:45 PM', text: 'Thank you for the clarification, Nurse Jenkins. We weren\u2019t aware of the blood pressure spike. We just want to ensure her recovery isn\u2019t stalling. Can we set a tentative date for when the assessment might happen if her vitals remain stable?' },
    ],
  },
  { id: 'DSP-7749', status: 'Under Review', title: 'Discharge Timing Disagreement', patient: 'Arthur Miller', timeAgo: '2 hours ago', facility: 'Central Hospital - North Wing', mediator: 'Dr. Sarah Chen', caseInitiated: 'Oct 22, 2024', thread: [] },
  { id: 'DSP-6512', status: 'Resolved', title: 'Staff Communication Protocol', patient: 'Rosemary Clarke', timeAgo: '1 day ago', facility: 'Central Hospital - North Wing', mediator: 'Dr. Sarah Chen', caseInitiated: 'Oct 14, 2024', thread: [] },
  { id: 'DSP-5591', status: 'Under Review', title: 'Visit Frequency Clarification', patient: 'Julian Thorne', timeAgo: '3 days ago', facility: 'Central Hospital - North Wing', mediator: 'Dr. Sarah Chen', caseInitiated: 'Oct 12, 2024', thread: [] },
  { id: 'DSP-4437', status: 'Open', title: 'Treatment Preference Documentation', patient: 'Thomas Wu', timeAgo: '4 days ago', facility: 'Central Hospital - North Wing', mediator: 'Dr. Sarah Chen', caseInitiated: 'Oct 11, 2024', thread: [] },
];
