/**
 * Session Timeout Warning
 *
 * Tracks user inactivity client-side. Displays a subtle top banner
 * at 1hr 50min of inactivity. Redirects to login at 2 hours.
 * Clicking "Stay logged in" pings the server to refresh last_active_at.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BRAND } from '@/lib/brand';

const WARNING_MS = 110 * 60 * 1000; // 1hr 50min
const EXPIRE_MS = 120 * 60 * 1000; // 2hr
const CHECK_INTERVAL = 15_000; // check every 15s

export function SessionTimeoutWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const lastActivityRef = useRef(Date.now());

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
  }, []);

  const keepAlive = useCallback(async () => {
    try {
      await fetch('/api/health', { method: 'GET' });
    } catch {
      // ignore
    }
    resetActivity();
  }, [resetActivity]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) =>
      window.addEventListener(e, resetActivity, { passive: true })
    );

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= EXPIRE_MS) {
        window.location.href = '/auth/login?reason=session_expired';
        return;
      }

      if (elapsed >= WARNING_MS) {
        setShowWarning(true);
        setSecondsLeft(Math.max(0, Math.ceil((EXPIRE_MS - elapsed) / 1000)));
      }
    }, CHECK_INTERVAL);

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetActivity));
      clearInterval(interval);
    };
  }, [resetActivity]);

  // Countdown ticker when warning is visible
  useEffect(() => {
    if (!showWarning) return;
    const tick = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, Math.ceil((EXPIRE_MS - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        window.location.href = '/auth/login?reason=session_expired';
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [showWarning]);

  if (!showWarning) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-inter"
      style={{ backgroundColor: BRAND.colors.primary, borderBottom: `1px solid ${BRAND.colors.accent}` }}
    >
      <span className="text-white/80">
        Session expires in {mins}:{secs.toString().padStart(2, '0')}
      </span>
      <button
        onClick={keepAlive}
        className="px-3 py-1 rounded-[6px] text-xs font-montserrat font-semibold transition-colors duration-200"
        style={{
          backgroundColor: BRAND.colors.accent,
          color: BRAND.colors.primary,
        }}
      >
        Stay logged in
      </button>
    </div>
  );
}
