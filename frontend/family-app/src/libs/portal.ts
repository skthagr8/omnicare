export type Role = 'admin' | 'caregiver' | 'family';

const raw = process.env.NEXT_PUBLIC_PORTAL;
if (raw !== 'admin' && raw !== 'caregiver' && raw !== 'family') {
  throw new Error('NEXT_PUBLIC_PORTAL must be one of: admin, caregiver, family');
}

export const PORTAL: Role = raw;
export const SESSION_COOKIE = `omnicare_${PORTAL}_session`;