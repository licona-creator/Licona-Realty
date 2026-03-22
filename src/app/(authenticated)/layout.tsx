/**
 * Authenticated Layout
 *
 * Wraps all authenticated pages with the AppShell (sidebar + mobile nav).
 * Approval queue badge count fetched in real-time via Supabase subscription.
 * Gold badge visible on every screen at all times.
 */

'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useApprovalCount } from '@/hooks/useApprovalCount';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const approvalCount = useApprovalCount();

  return <AppShell approvalCount={approvalCount}>{children}</AppShell>;
}
