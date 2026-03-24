/**
 * MFA (Multi-Factor Authentication) Utilities
 *
 * TOTP-based MFA using Supabase Auth MFA.
 * MFA is REQUIRED - not optional - enforced on first login.
 * No SMS-based MFA (vulnerable to SIM swapping).
 *
 * MFA re-prompt required for high-risk actions:
 * - DocuSign sends
 * - Bulk contact exports
 * - Record deletion
 * - Security settings changes
 * - Accessing approval history log
 */

import { createClient } from '@/lib/supabase/client';

export type MFAStatus = 'not_enrolled' | 'enrolled_unverified' | 'verified';

/**
 * Check the current user's MFA enrollment status.
 */
export async function getMFAStatus(): Promise<MFAStatus> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error || !data) {
    return 'not_enrolled';
  }

  const totpFactors = data.totp || [];

  if (totpFactors.length === 0) {
    return 'not_enrolled';
  }

  // Check if any factor is verified
  const verifiedFactor = totpFactors.find(
    (f) => f.status === 'verified'
  );

  return verifiedFactor ? 'verified' : 'enrolled_unverified';
}

/**
 * Enroll the user in TOTP MFA.
 * Returns the TOTP URI (for QR code) and secret.
 */
export async function enrollMFA() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Licona Realty Authenticator',
  });

  if (error) {
    throw new Error(`MFA enrollment failed: ${error.message}`);
  }

  return {
    factorId: data.id,
    totpUri: data.totp.uri,
    totpSecret: data.totp.secret,
    qrCode: data.totp.qr_code,
  };
}

/**
 * Verify MFA enrollment with a TOTP code from the authenticator app.
 */
export async function verifyMFAEnrollment(factorId: string, code: string) {
  const supabase = createClient();

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError) {
    throw new Error(`MFA challenge failed: ${challengeError.message}`);
  }

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (error) {
    throw new Error(`MFA verification failed: ${error.message}`);
  }

  return data;
}

/**
 * Create an MFA challenge for re-authentication on high-risk actions.
 * Returns the challenge ID for verification.
 */
export async function createMFAChallenge() {
  const supabase = createClient();

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totpFactor = factors?.totp?.find((f) => f.status === 'verified');

  if (!totpFactor) {
    throw new Error('No verified MFA factor found');
  }

  const { data: challenge, error } = await supabase.auth.mfa.challenge({
    factorId: totpFactor.id,
  });

  if (error) {
    throw new Error(`MFA challenge creation failed: ${error.message}`);
  }

  return {
    factorId: totpFactor.id,
    challengeId: challenge.id,
  };
}

/**
 * Verify an MFA challenge (for re-authentication on high-risk actions).
 */
export async function verifyMFAChallenge(
  factorId: string,
  challengeId: string,
  code: string
) {
  const supabase = createClient();

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });

  if (error) {
    throw new Error(`MFA verification failed: ${error.message}`);
  }

  return true;
}

/**
 * Check if the current session has a verified MFA assurance level.
 * Returns true if the user has completed MFA verification in this session.
 */
export async function hasVerifiedMFA(): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (error) return false;

  return data.currentLevel === 'aal2';
}

/**
 * List of high-risk actions that require MFA re-prompt.
 */
export const MFA_REQUIRED_ACTIONS = [
  'docusign_send',
  'bulk_export',
  'record_delete',
  'security_settings_change',
  'approval_history_access',
  'account_lockout_change',
] as const;

export type MFARequiredAction = (typeof MFA_REQUIRED_ACTIONS)[number];
