/**
 * Authenticated Layout
 *
 * Wraps all authenticated pages with the AppShell (sidebar + mobile nav).
 * One-time branded LR screen on cold load while session validates.
 * Module-level flag ensures it only runs once per browser session.
 */

'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApprovalCount } from '@/hooks/useApprovalCount';
import { LRMonogram } from '@/components/ui/LRMonogram';

// Module-level: survives component remounts, only resets on full page refresh
let sessionVerified = false;

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const approvalCount = useApprovalCount();
  const [ready, setReady] = useState(sessionVerified);

  useEffect(() => {
    // Already verified this browser session - skip entirely
    if (sessionVerified) {
      setReady(true);
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch('/api/auth/session-check');
        if (res.status === 401) {
          window.location.href = '/auth/login';
          return;
        }
      } catch {
        // Network error - proceed, middleware already validated on this request
      }
      sessionVerified = true;
      if (!cancelled) setReady(true);
    };

    // Force-proceed after 500ms regardless (AppShell polling catches real expiry)
    const timer = setTimeout(() => {
      sessionVerified = true;
      if (!cancelled) setReady(true);
    }, 500);

    check();

    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  if (!ready) {
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
