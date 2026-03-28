/**
 * Gmail Inbox Component
 *
 * Displays recent emails from Gmail in a clean card format.
 * Click to expand and show full thread inline.
 * Handles not-connected state with a link to Settings.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { BRAND } from '@/lib/brand';
import { Mail, ChevronRight, Loader2, Plug } from 'lucide-react';

interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  read: boolean;
}

interface ThreadMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  isHtml: boolean;
}

function formatSender(from: string): string {
  // Extract name from "Name <email>" format
  const match = from.match(/^"?([^"<]+)"?\s*<?/);
  return match ? match[1].trim() : from;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function GmailInbox({ maxItems, compact }: { maxItems?: number; compact?: boolean }) {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await fetch(`/api/integrations/gmail/inbox?maxResults=${maxItems || 20}`);
      if (res.status === 401) {
        setNotConnected(true);
        return;
      }
      const data = await res.json();
      setEmails(data.messages || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [maxItems]);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  const loadThread = async (threadId: string) => {
    if (expandedThread === threadId) {
      setExpandedThread(null);
      return;
    }
    setExpandedThread(threadId);
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/integrations/gmail/thread/${threadId}`);
      const data = await res.json();
      setThreadMessages(data.messages || []);
    } catch {
      setThreadMessages([]);
    } finally {
      setThreadLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={18} className="animate-spin text-gold" />
        <span className="ml-2 text-xs text-navy/40 dark:text-white/40 font-inter">Loading emails...</span>
      </div>
    );
  }

  if (notConnected) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-[8px] bg-gold/5 border border-gold/10">
        <Plug size={16} className="text-gold/60" />
        <div>
          <p className="text-sm font-inter text-navy/70 dark:text-white/70">Google not connected</p>
          <a href="/settings?tab=integrations" className="text-xs text-gold hover:underline font-inter">
            Connect Google in Settings
          </a>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <p className="text-sm text-navy/40 dark:text-white/40 font-inter py-2">
        No emails found in your primary inbox.
      </p>
    );
  }

  const displayEmails = maxItems ? emails.slice(0, maxItems) : emails;

  return (
    <div className="space-y-1">
      {displayEmails.map(email => (
        <div key={email.id}>
          <button
            onClick={() => loadThread(email.threadId)}
            className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-surface dark:hover:bg-navy/30 ${
              expandedThread === email.threadId ? 'bg-surface dark:bg-navy/30' : ''
            }`}
            style={!email.read ? { borderLeft: `3px solid ${BRAND.colors.accent}` } : undefined}
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-inter truncate ${!email.read ? 'font-semibold text-navy dark:text-white' : 'text-navy/70 dark:text-white/70'}`}>
                    {formatSender(email.from)}
                  </span>
                  <span className="text-[10px] text-navy/30 dark:text-white/30 font-inter flex-shrink-0">
                    {formatDate(email.date)}
                  </span>
                </div>
                <p className={`text-xs truncate ${!email.read ? 'font-medium text-navy/80 dark:text-white/80' : 'text-navy/50 dark:text-white/50'} font-inter`}>
                  {email.subject}
                </p>
                {!compact && (
                  <p className="text-[11px] text-navy/40 dark:text-white/40 font-inter truncate mt-0.5">
                    {email.snippet}
                  </p>
                )}
              </div>
              <ChevronRight
                size={14}
                className={`text-navy/20 dark:text-white/20 transition-transform flex-shrink-0 ${
                  expandedThread === email.threadId ? 'rotate-90' : ''
                }`}
              />
            </div>
          </button>

          {/* Expanded thread */}
          {expandedThread === email.threadId && (
            <div className="ml-3 pl-3 border-l-2 border-gold/15 mb-2">
              {threadLoading ? (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 size={14} className="animate-spin text-gold" />
                  <span className="text-xs text-navy/40 dark:text-white/40 font-inter">Loading thread...</span>
                </div>
              ) : (
                <div className="space-y-3 py-2">
                  {threadMessages.map(msg => (
                    <div key={msg.id} className="p-3 rounded-lg bg-white dark:bg-navy/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-inter font-medium text-navy dark:text-white">
                          {formatSender(msg.from)}
                        </span>
                        <span className="text-[10px] text-navy/30 dark:text-white/30 font-inter">
                          {formatDate(msg.date)}
                        </span>
                      </div>
                      {msg.isHtml ? (
                        <div
                          className="text-xs font-inter text-navy/70 dark:text-white/70 prose prose-xs max-w-none overflow-hidden"
                          dangerouslySetInnerHTML={{ __html: msg.body }}
                        />
                      ) : (
                        <p className="text-xs font-inter text-navy/70 dark:text-white/70 whitespace-pre-wrap">
                          {msg.body}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Compact Gmail section for contact detail pages */
export function ContactEmailHistory({ email: contactEmail }: { email: string | null }) {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);

  useEffect(() => {
    if (!contactEmail) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/integrations/gmail/contact/${encodeURIComponent(contactEmail)}`);
        if (res.status === 401) {
          setNotConnected(true);
          return;
        }
        const data = await res.json();
        setEmails(data.messages || []);
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    })();
  }, [contactEmail]);

  if (!contactEmail) {
    return (
      <p className="text-sm text-navy/40 dark:text-white/40 font-inter">
        No email address on file
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Loader2 size={14} className="animate-spin text-gold" />
        <span className="text-xs text-navy/40 dark:text-white/40 font-inter">Loading email history...</span>
      </div>
    );
  }

  if (notConnected) {
    return (
      <a href="/settings?tab=integrations" className="text-xs text-gold hover:underline font-inter">
        Connect Google to see emails
      </a>
    );
  }

  if (emails.length === 0) {
    return (
      <p className="text-sm text-navy/40 dark:text-white/40 font-inter">
        No email history with this contact.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {emails.map(email => (
        <div key={email.id} className="p-2.5 rounded-lg bg-surface dark:bg-navy/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-inter font-medium text-navy dark:text-white truncate flex-1">
              {email.subject || '(no subject)'}
            </span>
            <span className="text-[10px] text-navy/30 dark:text-white/30 font-inter flex-shrink-0 ml-2">
              {formatDate(email.date)}
            </span>
          </div>
          <p className="text-[11px] text-navy/50 dark:text-white/50 font-inter truncate mt-0.5">
            {email.snippet}
          </p>
        </div>
      ))}
    </div>
  );
}
