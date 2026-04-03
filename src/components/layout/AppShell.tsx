/**
 * App Shell - Main Layout Wrapper
 *
 * Mobile: AI trigger lives in the top header bar (no floating button).
 * Desktop: AI trigger is a floating button in the bottom-right corner.
 * Global search and notification bell in header on both breakpoints.
 * AI mode auto-detected from URL: System, Deal, or Contact.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { SessionTimeoutWarning } from '@/components/auth/SessionTimeoutWarning';
import { AIAssistantPanel } from '@/components/ai/AIAssistantPanel';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { BRAND } from '@/lib/brand';
import { Sparkles } from 'lucide-react';

type AIMode = 'system' | 'deal' | 'contact';

const MODE_COLORS: Record<AIMode, string> = {
  system: '#d3a971',
  deal: '#3B8BD4',
  contact: '#1D9E75',
};

interface AppShellProps {
  children: React.ReactNode;
  approvalCount?: number;
}

export function AppShell({ children, approvalCount = 0 }: AppShellProps) {
  const [showAI, setShowAI] = useState(false);
  const pathname = usePathname();

  // Client-side session monitoring: poll every 5 minutes
  // Network errors are NEVER treated as session failures (airplane mode, spotty signal)
  // Only an explicit 401 from the server triggers a redirect
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session-check');
        if (res.status === 401) {
          window.location.href = '/auth/login';
          return;
        }
        // 200 = valid, 500 = server error (retry next cycle), anything else = ignore
      } catch {
        // Network error - silently ignore, retry next cycle
      }
    };

    const interval = setInterval(checkSession, 300_000); // 5 minutes
    return () => clearInterval(interval);

    // Also check when app comes back from background (tab/app switch)
  }, []);

  // Check session when app returns to foreground
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetch('/api/auth/session-check')
          .then(res => { if (res.status === 401) window.location.href = '/auth/login'; })
          .catch(() => { /* network error - ignore */ });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Auto-detect AI mode and IDs from URL
  const { aiMode, contactId, transactionId } = useMemo(() => {
    const txMatch = pathname.match(/^\/transactions\/([a-f0-9-]+)$/i);
    if (txMatch) {
      return { aiMode: 'deal' as AIMode, contactId: null, transactionId: txMatch[1] };
    }

    const contactMatch = pathname.match(/^\/contacts\/([a-f0-9-]+)$/i);
    if (contactMatch) {
      return { aiMode: 'contact' as AIMode, contactId: contactMatch[1], transactionId: null };
    }

    return { aiMode: 'system' as AIMode, contactId: null, transactionId: null };
  }, [pathname]);

  // Close panel and reset when mode changes
  const [prevMode, setPrevMode] = useState<AIMode>(aiMode);
  useEffect(() => {
    if (aiMode !== prevMode) {
      setShowAI(false);
      setPrevMode(aiMode);
    }
  }, [aiMode, prevMode]);

  // Listen for custom event to open AI panel (from page-level buttons)
  useEffect(() => {
    const handler = () => setShowAI(true);
    window.addEventListener('open-ai-panel', handler);
    return () => window.removeEventListener('open-ai-panel', handler);
  }, []);

  const modeColor = MODE_COLORS[aiMode];

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

      {/* Mobile Top Bar - AI + Search + Notifications */}
      <div
        className="lg:hidden flex items-center justify-end gap-1 px-4 pb-2 sticky top-0 z-30"
        style={{
          backgroundColor: BRAND.colors.primary,
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        }}
      >
        <button
          onClick={() => setShowAI(true)}
          className="relative w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gold/10 active:scale-95 transition-all"
          aria-label="AI Assistant"
        >
          <Sparkles size={20} style={{ color: modeColor }} />
        </button>
        <GlobalSearch />
        <NotificationBell />
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 lg:pt-12 pb-20 lg:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav approvalCount={approvalCount} />

      {/* Desktop-only floating AI button */}
      <div className="hidden lg:block">
        <button
          onClick={() => setShowAI(true)}
          className="fixed z-[51] flex items-center justify-center w-12 h-12 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all bottom-6 right-6"
          style={{ backgroundColor: modeColor }}
          aria-label="AI Assistant"
        >
          <Sparkles size={20} color={aiMode === 'system' ? BRAND.colors.primary : '#ffffff'} />
        </button>
        <span
          className="fixed z-[51] text-[9px] font-montserrat font-semibold pointer-events-none bottom-[14px] right-[30px] text-navy/50 dark:text-white/50"
        >
          AI
        </span>
      </div>

      <AIAssistantPanel
        open={showAI}
        onClose={() => setShowAI(false)}
        mode={aiMode}
        contactId={contactId}
        transactionId={transactionId}
      />
    </div>
  );
}
