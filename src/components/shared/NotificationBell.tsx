'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { Badge } from '@/components/ui/Badge';

interface Notification {
  id: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data: { notifications: Notification[] } = await res.json();
        setNotifications(data.notifications);
      }
    } catch {
      // Silently handle fetch errors
    }
  }, []);

  // Fetch on mount and poll every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  async function markAllRead() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true }),
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch {
      // Silently handle errors
    } finally {
      setIsLoading(false);
    }
  }

  function handleNotificationClick(notification: Notification) {
    if (notification.link) {
      window.location.href = notification.link;
    }
    setIsOpen(false);
  }

  const unreadCount = notifications.length;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative p-2 rounded-lg transition-colors hover:bg-white/10"
        style={{ color: BRAND.colors.gold }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5">
            <Badge count={unreadCount} variant="gold" />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl shadow-lg border z-50"
          style={{
            backgroundColor: 'var(--lr-depth-1)',
            borderColor: 'rgba(255,255,255,0.06)',
            boxShadow: BRAND.design.shadow.dark,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: BRAND.colors.gold + '20' }}
          >
            <h3
              className="text-sm font-semibold"
              style={{
                color: '#ffffff',
                fontFamily: BRAND.fonts.montserrat,
              }}
            >
              Notifications
            </h3>
            {unreadCount > 0 && (
              <Badge count={unreadCount} variant="navy" />
            )}
          </div>

          {/* Notification list */}
          {notifications.length === 0 ? (
            <div
              className="px-4 py-8 text-center text-sm"
              style={{
                color: '#9ca3af',
                fontFamily: BRAND.fonts.inter,
              }}
            >
              No unread notifications
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-white/5"
                  style={{ borderColor: BRAND.colors.gold + '10' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-sm font-medium truncate"
                      style={{
                        color: '#ffffff',
                        fontFamily: BRAND.fonts.inter,
                      }}
                    >
                      {notification.title}
                    </p>
                    <span
                      className="text-xs whitespace-nowrap flex-shrink-0"
                      style={{ color: '#9ca3af' }}
                    >
                      {timeAgo(notification.created_at)}
                    </span>
                  </div>
                  <p
                    className="text-xs mt-0.5 line-clamp-2"
                    style={{
                      color: '#6b7280',
                      fontFamily: BRAND.fonts.inter,
                    }}
                  >
                    {notification.message}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          {unreadCount > 0 && (
            <div
              className="px-4 py-2.5 border-t"
              style={{ borderColor: BRAND.colors.gold + '20' }}
            >
              <button
                onClick={markAllRead}
                disabled={isLoading}
                className="w-full text-center text-xs font-semibold py-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-50"
                style={{
                  color: BRAND.colors.gold,
                  fontFamily: BRAND.fonts.montserrat,
                }}
              >
                {isLoading ? 'Marking...' : 'Mark all read'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
