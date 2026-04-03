/**
 * Apple PWA Install Prompt
 *
 * Shows a dismissable banner in Safari (non-standalone) prompting users
 * to add the app to their home screen. Apple-only: uses navigator.standalone.
 * Dismissed state persisted in localStorage.
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Share } from 'lucide-react';
import { BRAND } from '@/lib/brand';

const DISMISSED_KEY = 'pwa-install-dismissed';

export function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show in mobile Safari when NOT already in standalone PWA mode
    const isStandalone =
      ('standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (isStandalone) return;

    // Only show on iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return;

    // Check if already dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return;

    setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+4rem)] left-3 right-3 z-[60] rounded-[12px] p-4 shadow-lg animate-fade-in"
      style={{ backgroundColor: BRAND.colors.primary, border: `1px solid ${BRAND.colors.accent}30` }}
    >
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-white/40 hover:text-white touch-icon"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: BRAND.colors.accent }}
        >
          <span className="text-sm font-bold" style={{ color: BRAND.colors.primary }}>LR</span>
        </div>
        <div>
          <p className="text-sm font-montserrat font-semibold text-white">
            Add to Home Screen
          </p>
          <p className="text-xs text-white/60 font-inter mt-0.5 leading-relaxed">
            Tap <Share size={12} className="inline text-white/80 mx-0.5 -mt-0.5" /> below, then &ldquo;Add to Home Screen&rdquo; for the full app experience.
          </p>
        </div>
      </div>
    </div>
  );
}
