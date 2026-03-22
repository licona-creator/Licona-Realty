/**
 * CSRF Protection
 *
 * Uses the double-submit cookie pattern for CSRF protection
 * on all state-changing operations.
 *
 * In Next.js App Router, server actions and API routes already
 * have some CSRF protection via SameSite cookies. This adds an
 * additional layer with explicit token validation.
 */

import { v4 as uuidv4 } from 'uuid';

const CSRF_COOKIE_NAME = 'licona_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a new CSRF token.
 */
export function generateCSRFToken(): string {
  return uuidv4();
}

/**
 * Validate a CSRF token from the request headers against the cookie.
 * Returns true if the token is valid.
 */
export function validateCSRFToken(request: Request): boolean {
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  const cookieHeader = request.headers.get('cookie') || '';

  // Extract CSRF token from cookie
  const cookieMatch = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith(`${CSRF_COOKIE_NAME}=`));

  if (!cookieMatch || !headerToken) {
    return false;
  }

  const cookieToken = cookieMatch.split('=')[1]?.trim();
  return cookieToken === headerToken && headerToken.length > 0;
}

/**
 * Get the CSRF cookie name for client-side reading.
 */
export const CSRF_CONFIG = {
  cookieName: CSRF_COOKIE_NAME,
  headerName: CSRF_HEADER_NAME,
} as const;
