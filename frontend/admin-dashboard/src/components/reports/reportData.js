export const TABS = ['Utilization', 'Missed Visits', 'Assessment Completion', 'Audit Trail'];

export const STATUS_STYLES = {
  Completed: 'bg-teal-50 text-teal-700',
  Pending: 'bg-amber-50 text-amber-700',
  Flagged: 'bg-slate-100 text-slate-500',
  Overdue: 'bg-rose-50 text-rose-600',
};

export const RECORDS = [
  { id: 'RC-9012', facility: 'North Wing General', category: 'Nursing Staff', status: 'Completed', ratio: '94.2%', hours: '1,240.5 hrs', timestamp: '2024-10-24 08:30' },
  { id: 'RC-8821', facility: 'Intensive Care Unit', category: 'Specialist MD', status: 'Pending', ratio: '88.7%', hours: '942.0 hrs', timestamp: '2024-10-24 09:15' },
  { id: 'RC-7740', facility: 'Rehab Center B', category: 'Therapists', status: 'Completed', ratio: '76.4%', hours: '2,105.2 hrs', timestamp: '2024-10-23 16:45' },
  { id: 'RC-6612', facility: 'Outpatient Clinic', category: 'Support Staff', status: 'Flagged', ratio: '42.1%', hours: '520.8 hrs', timestamp: '2024-10-23 14:20' },
  { id: 'RC-5591', facility: 'East Side Cardiac', category: 'Nursing Staff', status: 'Overdue', ratio: '91.8%', hours: '1,102.4 hrs', timestamp: '2024-10-23 11:05' },
  { id: 'RC-4432', facility: 'Emergency Dept', category: 'Critical Care', status: 'Completed', ratio: '98.5%', hours: '3,450.0 hrs', timestamp: '2024-10-23 08:30' },
];
