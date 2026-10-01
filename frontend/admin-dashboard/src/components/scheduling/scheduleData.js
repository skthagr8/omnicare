export const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM'];

export const CAREGIVERS = [
  { id: 'marcus', name: 'Marcus Johnson', role: 'Registered Nurse', initials: 'MJ', color: 'bg-amber-100 text-amber-800' },
  { id: 'sarah', name: 'Sarah Jenkins', role: 'Nurse Practitioner', initials: 'SJ', color: 'bg-slate-100 text-slate-600' },
  { id: 'elena', name: 'Elena Wright', role: 'Physical Therapist', initials: 'EW', color: 'bg-sky-100 text-sky-700' },
  { id: 'david', name: 'David Kim', role: 'Registered Nurse', initials: 'DK', color: 'bg-violet-100 text-violet-700' },
  { id: 'priya', name: 'Priya Sharma', role: 'Clinical Lead', initials: 'PS', color: 'bg-amber-100 text-amber-800' },
  { id: 'robert', name: 'Robert Chen', role: 'LPN', initials: 'RC', color: 'bg-slate-100 text-slate-600' },
];

export const CLIENTS = ['Eleanor Vance', 'Arthur Miller', 'Rosemary Clarke', 'Thomas Wu', 'George Wilson', 'Julian Thorne'];

export const VISITS = [
  { id: 'v1', caregiverId: 'marcus', client: 'Eleanor Vance', start: 0, span: 2, time: '8:00', type: 'Medication Admin', acuity: 'critical' },
  { id: 'v2', caregiverId: 'marcus', client: 'Arthur Miller', start: 3, span: 1, time: '10:30', type: 'Routine Assessment', acuity: 'routine' },
  { id: 'v3', caregiverId: 'sarah', client: 'Rosemary Clarke', start: 1, span: 2, time: '9:00', type: 'Physical Rehab', acuity: 'routine' },
  { id: 'v4', caregiverId: 'elena', client: 'Thomas Wu', start: 0.5, span: 1.5, time: '8:30', type: 'Wound Care', acuity: 'stable' },
  { id: 'v5', caregiverId: 'david', client: 'Julian Thorne', start: 5, span: 1.2, time: '1:00', type: 'Post-Op Monitoring', acuity: 'critical' },
  { id: 'v6', caregiverId: 'priya', client: 'George Wilson', start: 3, span: 1.5, time: '10:00', type: 'Diabetes Mgmt', acuity: 'stable' },
];

export const ACUITY_STYLES = {
  critical: { edge: 'border-l-rose-400', fill: 'bg-rose-50', text: 'text-rose-700' },
  stable: { edge: 'border-l-amber-400', fill: 'bg-amber-50', text: 'text-amber-700' },
  routine: { edge: 'border-l-emerald-400', fill: 'bg-emerald-50', text: 'text-emerald-700' },
};
