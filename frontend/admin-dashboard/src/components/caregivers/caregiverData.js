export const CERTIFICATION_OPTIONS = [
  { id: 'dementia', label: 'Dementia Care' },
  { id: 'parkinsons', label: "Parkinson's Care" },
  { id: 'post-stroke', label: 'Post-Stroke Rehab' },
  { id: 'wound-care', label: 'Wound Care' },
  { id: 'diabetes-mgmt', label: 'Diabetes Management' },
  { id: 'post-op', label: 'Post-Op Monitoring' },
];

export const CAREGIVER_STATUS_STYLES = {
  invited: { label: 'Invited', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  inactive: { label: 'Inactive', className: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
};

export const ORG_OPTIONS = ['Central Hospital', 'North Campus', 'South Wing', 'Remote Care Team'];

export const INITIAL_CAREGIVERS = [
  {
    id: 'CG-1042',
    firstName: 'Sarah',
    lastName: 'Jenkins',
    email: 'sarah.jenkins@omnicare.io',
    org: 'Central Hospital',
    certificationIds: ['dementia', 'post-op'],
    verificationSource: 'HR-00231 · Verified 2026-02-11',
    status: 'active',
    invitedAt: '2026-02-10',
  },
  {
    id: 'CG-1088',
    firstName: 'Marcus',
    lastName: 'James',
    email: 'marcus.james@omnicare.io',
    org: 'North Campus',
    certificationIds: ['parkinsons'],
    verificationSource: 'HR-00287 · Verified 2026-03-02',
    status: 'active',
    invitedAt: '2026-03-01',
  },
  {
    id: 'CG-1103',
    firstName: 'Elena',
    lastName: 'Wong',
    email: 'elena.wong@omnicare.io',
    org: 'South Wing',
    certificationIds: ['post-stroke', 'wound-care'],
    verificationSource: 'HR-00299 · Verified 2026-03-18',
    status: 'invited',
    invitedAt: '2026-03-19',
  },
];

export function getCertificationLabels(certificationIds) {
  return certificationIds.map(
    (id) => CERTIFICATION_OPTIONS.find((option) => option.id === id)?.label ?? id,
  );
}
