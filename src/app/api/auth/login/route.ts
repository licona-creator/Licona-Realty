/**
 * Login API Route
 *
 * Server-side login handler that:
 * 1. Checks account lockout status
 * 2. Validates credentials via Supabase Auth
 * 3. Records all attempts to the audit log
 * 4. Tracks failed attempts for lockout
 * 5. Checks MFA enrollment status for redirect
 *
 * Generic error messages prevent user enumeration.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import {
  isAccountLocked,
  recordFailedAttempt,
  recordSuccessfulLogin,
  getLockoutMessage,
} from '@/lib/auth/lockout';
import { validateEmail } from '@/lib/security/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      return NextResponse.json(
        { error: 'Invalid email format.' },
        { status: 400 }
      );
    }

    const sanitizedEmail = emailResult.sanitized;
    const ip = getClientIP(request);
    const ua = getUserAgent(request);

    // Check lockout
    const lockout = isAccountLocked(sanitizedEmail);
    if (lockout.locked) {
      await writeAuditLog({
        userId: null,
        action: 'login_failed',
        details: 'Account locked - attempt during lockout period',
        ipAddress: ip,
        userAgent: ua,
      });

      return NextResponse.json(
        { error: getLockoutMessage(lockout.remainingMs) },
        { status: 429 }
      );
    }

    // Attempt login
    const supabase = await createServerSupabaseClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password,
    });

    if (authError || !data.user) {
      // Record failed attempt
      const result = recordFailedAttempt(sanitizedEmail);

      await writeAuditLog({
        userId: null,
        action: 'login_failed',
        details: result.locked
          ? `Account locked after ${result.attempts} failed attempts`
          : `Failed login attempt ${result.attempts}/${5}`,
        ipAddress: ip,
        userAgent: ua,
      });

      // Generic error to prevent user enumeration
      if (result.locked) {
        return NextResponse.json(
          { error: 'Too many failed attempts. Account locked for 15 minutes.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Successful login — reset lockout counter
    recordSuccessfulLogin(sanitizedEmail);

    await writeAuditLog({
      userId: data.user.id,
      action: 'login',
      details: 'Successful login',
      ipAddress: ip,
      userAgent: ua,
    });

    // Check MFA enrollment
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasMFA = factors?.totp?.some((f) => f.status === 'verified');

    return NextResponse.json({
      success: true,
      mfaRequired: hasMFA,
      mfaSetupRequired: !hasMFA,
      redirectTo: hasMFA ? '/auth/mfa-verify' : '/auth/mfa-setup',
    });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
