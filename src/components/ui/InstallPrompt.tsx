/**
 * PWA Install Prompt + Notification Permission
 *
 * Shows a dismissable banner prompting users to:
 * 1. Add to Home Screen (iOS/Android/Desktop)
 * 2. Enable push notifications
 *
 * Dismissed state persisted in localStorage.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Share, Bell } from 'lucide-react';
import { BRAND } from '@/lib/brand';

const INSTALL_DISMISSED_KEY = 'pwa-install-dismissed';
const INSTALL_DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const NOTIF_DISMISSED_KEY = 'pwa-notif-dismissed';
const NOTIF_DISMISSED_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [showInstall, setShowInstall] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      ('standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches;

    // Check install dismissed
    const installDismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
    const installExpired = installDismissed ? Date.now() - parseInt(installDismissed) > INSTALL_DISMISSED_DURATION : true;

    if (!isStandalone && installExpired) {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setIsIOS(ios);
      if (ios) {
        setShowInstall(true);
      }
    }

    // Listen for Android/Desktop install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      if (!isStandalone && installExpired) {
        setShowInstall(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check notification permission
    const notifDismissed = localStorage.getItem(NOTIF_DISMISSED_KEY);
    const notifExpired = notifDismissed ? Date.now() - parseInt(notifDismissed) > NOTIF_DISMISSED_DURATION : true;
    if ('Notification' in window && Notification.permission === 'default' && notifExpired) {
      // Show after a delay so it doesn't stack with install prompt
      const timer = setTimeout(() => {
        if (!showInstall) setShowNotif(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  function dismissInstall() {
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    setShowInstall(false);
    // Show notification prompt after install dismiss
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => setShowNotif(true), 500);
    }
  }

  async function handleInstallClick() {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      deferredPrompt.current = null;
    }
    dismissInstall();
  }

  async function handleEnableNotifications() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (vapidKey) {
          const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKey,
          });
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription }),
          });
        }
      }
    } catch {
      // User denied or error - ignore
    }
    setShowNotif(false);
  }

  function dismissNotif() {
    localStorage.setItem(NOTIF_DISMISSED_KEY, String(Date.now()));
    setShowNotif(false);
  }

  if (showInstall) {
    return (
      <div
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-3 right-3 z-[60] rounded-2xl p-4 shadow-lg animate-fade-in"
        style={{ backgroundColor: BRAND.colors.accent }}
      >
        <button
          onClick={dismissInstall}
          className="absolute top-3 right-3 text-navy/40 hover:text-navy"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: BRAND.colors.primary }}
          >
            <span className="text-sm font-bold text-gold font-montserrat">LR</span>
          </div>
          <div>
            <p className="text-sm font-montserrat font-semibold text-navy">
              Install Licona Realty
            </p>
            {isIOS ? (
              <p className="text-xs text-navy/70 font-inter mt-0.5 leading-relaxed">
                Tap <Share size={12} className="inline text-navy/80 mx-0.5 -mt-0.5" /> below, then &ldquo;Add to Home Screen&rdquo; for the full app experience.
              </p>
            ) : (
              <div className="mt-2">
                <button
                  onClick={handleInstallClick}
                  className="bg-navy text-gold font-montserrat font-semibold text-xs rounded-xl px-4 py-2 active:scale-[0.97] transition-transform"
                >
                  Add to Home Screen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showNotif) {
    return (
      <div
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-3 right-3 z-[60] rounded-2xl p-4 shadow-lg animate-fade-in"
        style={{ backgroundColor: BRAND.colors.primary, border: `1px solid ${BRAND.colors.accent}30` }}
      >
        <button
          onClick={dismissNotif}
          className="absolute top-3 right-3 text-white/40 hover:text-white"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center flex-shrink-0">
            <Bell size={18} className="text-gold" />
          </div>
          <div>
            <p className="text-sm font-montserrat font-semibold text-white">
              Enable notifications
            </p>
            <p className="text-xs text-white/60 font-inter mt-0.5">
              Never miss a follow-up or closing deadline.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleEnableNotifications}
                className="bg-gold text-navy font-montserrat font-semibold text-xs rounded-xl px-4 py-2 active:scale-[0.97] transition-transform"
              >
                Turn On
              </button>
              <button
                onClick={dismissNotif}
                className="text-white/50 font-montserrat text-xs px-3 py-2"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
