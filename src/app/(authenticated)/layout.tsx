/**
 * Authenticated Layout
 *
 * Wraps all authenticated pages with the AppShell (sidebar + mobile nav).
 * Approval queue badge count visible on every screen.
 */

import { AppShell } from '@/components/layout/AppShell';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In production, approvalCount fetched server-side from Supabase
  return <AppShell approvalCount={0}>{children}</AppShell>;
}
