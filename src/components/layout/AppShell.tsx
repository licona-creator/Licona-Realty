/**
 * App Shell - Main Layout Wrapper
 *
 * Mobile: AI trigger lives in the top header bar (no floating button).
 * Desktop: AI trigger is a floating button in the bottom-right corner.
 * Global search and notification bell in header on both breakpoints.
 */

'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const router = useRouter();

  // Client-side session monitoring: poll every 60 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/session-check');
        if (res.ok) {
          const data = await res.json();
          if (!data.valid) {
            router.push(`/auth/session-expired?reason=${data.reason || 'timeout'}`);
          }
        }
      } catch {
        // Network error, skip this check
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [router]);

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
          className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gold/10 active:scale-95 transition-all"
          aria-label="AI Assistant"
        >
          <Sparkles size={20} style={{ color: BRAND.colors.accent }} />
        </button>
        <GlobalSearch />
        <NotificationBell />
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 pb-20 lg:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav approvalCount={approvalCount} />

      {/* Desktop-only floating AI button */}
      <div className="hidden lg:block">
        <button
          onClick={() => setShowAI(true)}
          className="fixed z-[51] flex items-center justify-center w-12 h-12 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all bottom-6 right-6"
          style={{ backgroundColor: BRAND.colors.accent }}
          aria-label="AI Assistant"
        >
          <Sparkles size={20} color={BRAND.colors.primary} />
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
        contactId={contactId}
      />
    </div>
  );
}
