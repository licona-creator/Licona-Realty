/**
 * App Shell - Main Layout Wrapper
 *
 * Combines sidebar (desktop) and bottom tab bar (mobile)
 * with the main content area. Approval queue badge visible everywhere.
 * Includes session timeout warning, global AI assistant button,
 * global search, and notifications.
 */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { SessionTimeoutWarning } from '@/components/auth/SessionTimeoutWarning';
import { AIAssistantPanel } from '@/components/ai/AIAssistantPanel';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { BRAND } from '@/lib/brand';
import { Sparkles } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  approvalCount?: number;
}

export function AppShell({ children, approvalCount = 0 }: AppShellProps) {
  const [showAI, setShowAI] = useState(false);
  const pathname = usePathname();

  // Auto-detect contact context from URL (/contacts/[id])
  const contactMatch = pathname.match(/^\/contacts\/([a-f0-9-]+)$/i);
  const contactId = contactMatch ? contactMatch[1] : null;

  return (
    <div className="min-h-screen bg-surface dark:bg-navy">
      <SessionTimeoutWarning />

      {/* Desktop Sidebar */}
      <Sidebar approvalCount={approvalCount} />

      {/* Top Bar (desktop) - Search + Notifications */}
      <div className="hidden lg:flex fixed top-0 right-0 z-30 items-center gap-3 px-6 py-3" style={{ left: '16rem' }}>
        <div className="flex-1" />
        <GlobalSearch />
        <NotificationBell />
      </div>

      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-end gap-2 px-4 py-2 sticky top-0 z-30 bg-surface/80 dark:bg-navy/80 backdrop-blur-sm">
        <GlobalSearch />
        <NotificationBell />
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 pb-20 lg:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav approvalCount={approvalCount} />

      {/* Global AI Assistant Button */}
      <button
        onClick={() => setShowAI(true)}
        className="fixed z-[51] flex items-center justify-center w-12 h-12 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all bottom-[90px] right-5 lg:bottom-6 lg:right-6"
        style={{ backgroundColor: BRAND.colors.accent }}
        aria-label="AI Assistant"
      >
        <Sparkles size={20} color={BRAND.colors.primary} />
      </button>
      <span
        className="fixed z-[51] text-[9px] font-montserrat font-semibold pointer-events-none bottom-[78px] right-[26px] lg:bottom-[14px] lg:right-[30px] text-navy/50 dark:text-white/50"
      >
        AI
      </span>

      <AIAssistantPanel
        open={showAI}
        onClose={() => setShowAI(false)}
        contactId={contactId}
      />
    </div>
  );
}
