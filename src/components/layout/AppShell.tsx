/**
 * App Shell — Main Layout Wrapper
 *
 * Combines sidebar (desktop) and bottom tab bar (mobile)
 * with the main content area. Approval queue badge visible everywhere.
 */

'use client';

import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  children: React.ReactNode;
  approvalCount?: number;
}

export function AppShell({ children, approvalCount = 0 }: AppShellProps) {
  return (
    <div className="min-h-screen bg-surface dark:bg-navy">
      {/* Desktop Sidebar */}
      <Sidebar approvalCount={approvalCount} />

      {/* Main Content */}
      <main className="lg:ml-64 pb-20 lg:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav approvalCount={approvalCount} />
    </div>
  );
}
