/**
 * Authenticated Layout
 *
 * Wraps all authenticated pages with the AppShell (sidebar + mobile nav).
 * Shows branded LR loading screen while initial session check completes.
 * Prevents flash of authenticated app in broken state.
 */

'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApprovalCount } from '@/hooks/useApprovalCount';
import { LRMonogram } from '@/components/ui/LRMonogram';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const approvalCount = useApprovalCount();
  const [authChecked, setAuthChecked] = useState(false);

  // Quick session check on mount - show branded screen while verifying
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/auth/session-check');
        if (res.status === 401) {
          window.location.href = '/auth/login';
          return;
        }
      } catch {
        // Network error on first load - proceed anyway, middleware already validated
      }
      if (!cancelled) setAuthChecked(true);
    };

    // Add a small minimum display time for the branded screen (300ms)
    const timer = setTimeout(() => {
      if (!cancelled) setAuthChecked(true);
    }, 500);

    check();

    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  if (!authChecked) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#132236' }}
      >
        <div className="animate-fade-in">
          <LRMonogram size="xl" />
        </div>
      </div>
    );
  }

  return <AppShell approvalCount={approvalCount}>{children}</AppShell>;
}
