export const DIAGNOSIS_STYLES = {
  Dementia: 'bg-violet-50 text-violet-700',
  "Parkinson's": 'bg-emerald-50 text-emerald-700',
  'Post-Stroke': 'bg-sky-50 text-sky-700',
  'General Geriatric': 'bg-stone-100 text-stone-600',
};

export const ACUITY_STYLES = {
  high: 'bg-rose-500',
  medium: 'bg-amber-400',
  low: 'bg-emerald-500',
};

export const CAREGIVER_STATUS_STYLES = {
  available: { dot: 'bg-emerald-500', label: 'Available' },
  'en-route': { dot: 'bg-amber-500', label: 'En-route' },
  'in-service': { dot: 'bg-sky-500', label: 'In-service' },
  emergency: { dot: 'bg-rose-500', label: 'Emergency' },
};

export const PATIENTS = [
  { id: 'P-9821', name: 'Eleanor Vance', dateOfBirth: '1946-05-12', diagnosis: 'Dementia', acuity: 'high', caregiver: 'Sarah Jenkins', initials: 'SJ', caregiverStatus: 'in-service' },
  { id: 'P-4432', name: 'Arthur Miller', dateOfBirth: '1942-10-27', diagnosis: "Parkinson's", acuity: 'medium', caregiver: 'Marcus James', initials: 'MJ', caregiverStatus: 'available' },
  { id: 'P-1128', name: 'Rosemary Clarke', dateOfBirth: '1951-02-08', diagnosis: 'Post-Stroke', acuity: 'low', caregiver: 'Elena Wong', initials: 'EW', caregiverStatus: 'in-service' },
  { id: 'P-1567', name: 'Julian Thorne', dateOfBirth: '1939-11-19', diagnosis: 'General Geriatric', acuity: 'high', caregiver: 'David Kim', initials: 'DK', caregiverStatus: 'emergency' },
  { id: 'P-8012', name: 'Sarah Jenkins', dateOfBirth: '1948-07-23', diagnosis: 'Dementia', acuity: 'medium', caregiver: 'Renee Patel', initials: 'RP', caregiverStatus: 'en-route' },
  { id: 'P-8821', name: 'Thomas Wu', dateOfBirth: '1954-03-15', diagnosis: 'Post-Stroke', acuity: 'low', caregiver: 'Nina Foster', initials: 'NF', caregiverStatus: 'available' },
  { id: 'P-7204', name: 'Margaret Chen', dateOfBirth: '1937-09-02', diagnosis: "Parkinson's", acuity: 'high', caregiver: 'Sarah Jenkins', initials: 'SJ', caregiverStatus: 'in-service' },
];

export function getAge(dateOfBirth, asOf = new Date()) {
  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  let age = asOf.getFullYear() - birthDate.getFullYear();
  const birthdayPassed = asOf.getMonth() > birthDate.getMonth() || (asOf.getMonth() === birthDate.getMonth() && asOf.getDate() >= birthDate.getDate());
  if (!birthdayPassed) age -= 1;
  return age;
}
