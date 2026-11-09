import { apiClient } from '../services/api';

// FastAPI returns `detail` as a string, or as a list of { msg } objects for validation errors.
export function apiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((d) => d?.msg).filter(Boolean);
    if (msgs.length) return msgs.join(' ');
  }
  if (err && !err.response) return 'Unable to reach the server. Check your connection and try again.';
  return fallback;
}

// Backend statuses -> directory badge statuses.
const STATUS_MAP = { pending: 'invited', accepted: 'active', expired: 'expired' };

function toDirectoryRow(item, organizationName) {
  const [firstName = '', ...rest] = (item.full_name || '').trim().split(/\s+/);
  return {
    id: item.id,
    firstName,
    lastName: rest.join(' '),
    email: item.caregiver_email,
    org: item.organization_name || organizationName || '',
    certificationIds: item.certifications || [],
    verificationSource: item.verification_source || '',
    status: STATUS_MAP[item.status] || 'invited',
    invitedAt: item.created_at?.slice(0, 10),
  };
}

/** GET /api/auth/invitations -> { organizationName, caregivers } */
export async function listCaregiverInvitations() {
  const { data } = await apiClient.get('/auth/invitations');
  return {
    organizationName: data.organization_name || '',
    caregivers: (data.invitations || []).map((item) => toDirectoryRow(item, data.organization_name)),
  };
}

/**
 * POST /api/auth/send-invitation-email. The caregiver joins the admin's own
 * organisation (the backend decides this), so no org id is sent.
 */
export async function sendCaregiverInvitation(form) {
  const { data } = await apiClient.post('/auth/send-invitation-email', {
    caregiver_email: form.email.trim().toLowerCase(),
    full_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
    verification_source: form.verificationSource.trim(),
    certifications: form.certificationIds,
  });
  return data;
}
