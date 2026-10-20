import { PORTAL, SESSION_COOKIE, type Role } from './portal';

const REFRESH_DAYS = 7; // matches refresh_token_expire_days on the backend

export function startSession(access: string, refresh: string, role: Role): void {
  try {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  } catch {
    /* storage unavailable */
  }
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${SESSION_COOKIE}=${role}; path=/; max-age=${REFRESH_DAYS * 86400}; SameSite=Lax${secure}`;
}

export function endSession(): void {
  try {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  } catch {
    /* ignore */
  }
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export { PORTAL };