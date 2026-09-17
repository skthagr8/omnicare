export const RISK_STYLES = {
  high: { badge: 'bg-rose-50 text-rose-600 border-rose-200', label: 'High Risk', color: '#B4495F' },
  medium: { badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Medium Risk', color: '#C08A2E' },
  low: { badge: 'bg-teal-50 text-teal-700 border-teal-200', label: 'Low Risk', color: '#3F8F86' },
  exempt: { badge: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Exempt', color: '#94A3B8' },
};

export const PATIENTS = [
  { uid: 'P-9821', name: 'Eleanor Vance', risk: 'high', score: 88, trend: [40, 52, 48, 63, 71, 79, 88], falls: 3, factor: 'Neurological Impairment' },
  { uid: 'P-4432', name: 'Arthur Miller', risk: 'medium', score: 42, trend: [22, 26, 24, 33, 37, 39, 42], falls: 1, factor: 'Medication Side Effects' },
  { uid: 'P-1128', name: 'Rosemary Clarke', risk: 'low', score: 12, trend: [18, 16, 15, 14, 13, 12, 12], falls: 0, factor: 'Stable Mobility' },
  { uid: 'P-1567', name: 'Julian Thorne', risk: 'high', score: 94, trend: [55, 61, 68, 74, 82, 89, 94], falls: 2, factor: 'Orthostatic Hypotension' },
  { uid: 'P-8012', name: 'Sarah Jenkins', risk: 'exempt', score: null, trend: [], falls: null, factor: null },
  { uid: 'P-8821', name: 'Thomas Wu', risk: 'low', score: 28, trend: [40, 37, 34, 32, 30, 29, 28], falls: 0, factor: 'Improving Physical Rehab' },
];

export const FILTERS = ['All', 'High', 'Medium', 'Low'];
