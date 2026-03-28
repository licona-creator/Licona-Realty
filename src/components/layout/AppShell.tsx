/**
 * App Shell - Main Layout Wrapper
 *
 * Combines sidebar (desktop) and bottom tab bar (mobile)
 * with the main content area. Approval queue badge visible everywhere.
 * Includes session timeout warning, global AI assistant button,
 * global search, and notifications.
 *
 * AI button positioning:
 * - On detail pages (/contacts/[id], /transactions/[id]), moved higher to avoid overlapping action buttons
 * - On list pages with FABs (/contacts, /transactions), stacked above the FAB
 * - On desktop, positioned in bottom-right corner
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

  // Detect page types for AI button positioning
  const isDetailPage = /^\/(contacts|transactions|partners)\/[a-f0-9-]+$/i.test(pathname);
  const isListPageWithFAB = pathname === '/contacts' || pathname === '/transactions';

  // Mobile AI button positioning:
  // - Detail pages: bottom 160px (clear of Edit/Delete/Back buttons)
  // - List pages with FAB: bottom 152px (above the + FAB which is at ~80px)
  // - Default: bottom 90px (above the bottom nav)
  const mobileBottom = isDetailPage ? '160px' : isListPageWithFAB ? '152px' : '90px';
  const mobileLabelBottom = isDetailPage ? '148px' : isListPageWithFAB ? '140px' : '78px';

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
        className="fixed z-[51] flex items-center justify-center w-12 h-12 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all lg:bottom-6 lg:right-6"
        style={{
          backgroundColor: BRAND.colors.accent,
          right: '20px',
          bottom: mobileBottom,
        }}
        aria-label="AI Assistant"
      >
        <Sparkles size={20} color={BRAND.colors.primary} />
      </button>
      <span
        className="fixed z-[51] text-[9px] font-montserrat font-semibold pointer-events-none lg:bottom-[14px] lg:right-[30px] text-navy/50 dark:text-white/50"
        style={{
          right: '26px',
          bottom: mobileLabelBottom,
        }}
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
