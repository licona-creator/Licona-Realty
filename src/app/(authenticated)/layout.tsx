/**
 * Authenticated Layout
 *
 * Wraps all authenticated pages with the AppShell (sidebar + mobile nav).
 * Session validation handled by server middleware and AppShell polling.
 */

'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useApprovalCount } from '@/hooks/useApprovalCount';
import { InstallPrompt } from '@/components/ui/InstallPrompt';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const approvalCount = useApprovalCount();

  return (
    <AppShell approvalCount={approvalCount}>
      {children}
      <InstallPrompt />
    </AppShell>
  );
}
