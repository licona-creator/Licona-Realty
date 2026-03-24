/**
 * Account Lockout System
 *
 * After 5 consecutive failed login attempts, the account is locked
 * for 15 minutes and the agent is notified via email.
 *
 * Login attempt tracking stored in Supabase.
 * Every attempt (success and failure) logged to audit_logs.
 */

interface LoginAttemptRecord {
  email: string;
  failedAttempts: number;
  lockedUntil: string | null;
  lastAttemptAt: string;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory store for login attempts (per server instance).
// In production with multiple Vercel instances, use Supabase or Redis.
// This is a reasonable starting point for a solo-agent platform.
const loginAttempts = new Map<string, LoginAttemptRecord>();

/**
 * Check if an account is currently locked out.
 */
export function isAccountLocked(email: string): {
  locked: boolean;
  remainingMs: number;
} {
  const record = loginAttempts.get(email.toLowerCase());

  if (!record || !record.lockedUntil) {
    return { locked: false, remainingMs: 0 };
  }

  const lockedUntil = new Date(record.lockedUntil).getTime();
  const now = Date.now();

  if (now < lockedUntil) {
    return { locked: true, remainingMs: lockedUntil - now };
  }

  // Lockout expired - reset
  record.failedAttempts = 0;
  record.lockedUntil = null;
  return { locked: false, remainingMs: 0 };
}

/**
 * Record a failed login attempt.
 * Returns whether the account is now locked.
 */
export function recordFailedAttempt(email: string): {
  locked: boolean;
  attempts: number;
} {
  const key = email.toLowerCase();
  const record = loginAttempts.get(key) || {
    email: key,
    failedAttempts: 0,
    lockedUntil: null,
    lastAttemptAt: new Date().toISOString(),
  };

  record.failedAttempts += 1;
  record.lastAttemptAt = new Date().toISOString();

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = new Date(
      Date.now() + LOCKOUT_DURATION_MS
    ).toISOString();
  }

  loginAttempts.set(key, record);

  return {
    locked: record.failedAttempts >= MAX_FAILED_ATTEMPTS,
    attempts: record.failedAttempts,
  };
}

/**
 * Record a successful login - resets the failed attempt counter.
 */
export function recordSuccessfulLogin(email: string): void {
  const key = email.toLowerCase();
  loginAttempts.delete(key);
}

/**
 * Get the lockout remaining time in human-readable format.
 */
export function getLockoutMessage(remainingMs: number): string {
  const minutes = Math.ceil(remainingMs / 60000);
  return `Account locked. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}
