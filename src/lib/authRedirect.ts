export type AuthPlatform = 'coach' | 'athlete';

const COACH_URL = 'https://app.dynabolic.co';
const ATHLETE_URL = 'https://dynabolic.co';

/**
 * Returns the correct auth redirect URL for Supabase auth emails
 * (signup verification, magic link, password reset), based on the
 * platform (coach panel vs athlete app) that initiated the request.
 *
 * On localhost / Lovable preview hosts we stay on the current origin
 * so that dev flows keep working.
 */
export function getAuthRedirectUrl(
  platform: AuthPlatform,
  path: string = '/auth/callback'
): string {
  if (typeof window === 'undefined') {
    const base = platform === 'athlete' ? ATHLETE_URL : COACH_URL;
    return `${base}${path}`;
  }

  const host = window.location.hostname;
  const isDev =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.lovable.app') ||
    host.endsWith('.lovableproject.com');

  if (isDev) return `${window.location.origin}${path}`;

  const base = platform === 'athlete' ? ATHLETE_URL : COACH_URL;
  return `${base}${path}`;
}
