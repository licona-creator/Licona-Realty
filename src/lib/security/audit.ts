/**
 * Audit Logging System
 *
 * Records every security-relevant action to the immutable audit_logs table.
 * Uses the service role key (server-side only) to insert logs.
 *
 * Logged events:
 * - Every login attempt (successful and failed) with IP and user agent
 * - Every data access event
 * - Every export
 * - Every document send
 * - Every approval action
 * - MFA setup, verify, and failures
 * - Record creation, updates, deletion
 * - Settings changes
 *
 * PII is NEVER included in audit log details. Only resource IDs.
 * Audit logs are retained for 2 years, then auto-purged.
 */

import type { AuditAction } from '@/types/database';

interface AuditLogEntry {
  userId: string | null;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  details?: string;         // Never contains PII
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Write an audit log entry. Server-side only.
 * Uses the admin client (service role) to bypass RLS for inserts.
 */
export async function writeAuditLog(entry: AuditLogEntry) {
  // Dynamic import to avoid bundling server code in client
  const { createAdminClient } = await import('@/lib/supabase/server');

  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from('audit_logs').insert({
      user_id: entry.userId,
      action: entry.action,
      resource_type: entry.resourceType || null,
      resource_id: entry.resourceId || null,
      details: entry.details || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
    });

    if (error) {
      // Use console.error here since the PII-safe logger might not
      // be available in all server contexts, and audit log failures
      // are critical enough to log directly (no PII in audit entries)
      console.error('[AUDIT] Failed to write audit log:', error.message);
    }
  } catch (err) {
    console.error('[AUDIT] Audit logging error:', err);
  }
}

/**
 * Extract IP address from request headers.
 * Vercel sets x-forwarded-for; fallback to x-real-ip.
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Extract user agent from request headers.
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}
