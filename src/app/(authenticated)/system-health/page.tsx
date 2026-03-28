/**
 * System Health Dashboard
 *
 * Full diagnostic page that checks every system component.
 * Shows animated cards with status, response times, and a summary score.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND } from '@/lib/brand';
import { Button } from '@/components/ui/Button';
import type { HealthCheckResult } from '@/app/api/health/route';
import {
  Activity,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Bot,
  MapPin,
  Globe,
  Mail,
  Calendar,
  Users,
  Loader2,
} from 'lucide-react';

interface DiagnosticCard {
  name: string;
  icon: React.ReactNode;
  ok: boolean;
  detail: string;
  responseMs?: number;
  warn?: boolean;
}

function buildCards(data: HealthCheckResult): DiagnosticCard[] {
  const { checks } = data;
  const cards: DiagnosticCard[] = [];

  // 1. Database
  cards.push({
    name: 'Database',
    icon: <Database size={18} />,
    ok: checks.database.ok,
    detail: checks.database.ok
      ? `${checks.database.contacts} contacts, ${checks.database.transactions} transactions, ${checks.database.activities} activities`
      : 'Connection failed',
    responseMs: checks.database.responseMs,
  });

  // 2. AI Assistant
  cards.push({
    name: 'AI Assistant',
    icon: <Bot size={18} />,
    ok: checks.ai.configured,
    detail: checks.ai.configured ? 'API key configured' : 'Add ANTHROPIC_API_KEY',
    warn: !checks.ai.configured,
  });

  // 3. Google Maps
  cards.push({
    name: 'Google Maps',
    icon: <MapPin size={18} />,
    ok: checks.googleMaps.configured,
    detail: checks.googleMaps.configured ? 'Places API key configured' : 'Not configured',
    warn: !checks.googleMaps.configured,
  });

  // 4. Google Account
  cards.push({
    name: 'Google Account',
    icon: <Globe size={18} />,
    ok: checks.googleOAuth.connected,
    detail: checks.googleOAuth.connected ? 'Gmail and Calendar linked' : 'Connect in Settings',
    warn: !checks.googleOAuth.connected,
  });

  // 5. Email Sync
  cards.push({
    name: 'Email Sync',
    icon: <Mail size={18} />,
    ok: !!checks.syncs.lastEmailSync,
    detail: checks.syncs.lastEmailSync
      ? `Last synced: ${new Date(checks.syncs.lastEmailSync).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
      : 'Never synced',
    warn: !checks.syncs.lastEmailSync,
  });

  // 6. Calendar Sync
  cards.push({
    name: 'Calendar Sync',
    icon: <Calendar size={18} />,
    ok: !!checks.syncs.lastCalendarSync,
    detail: checks.syncs.lastCalendarSync
      ? `Last synced: ${new Date(checks.syncs.lastCalendarSync).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
      : 'Never synced',
    warn: !checks.syncs.lastCalendarSync,
  });

  // 7. Data Quality
  const dq = checks.dataQuality;
  const dqIssues = dq.missingPhone + dq.missingEmail + dq.overdueFollowUp;
  cards.push({
    name: 'Data Quality',
    icon: <Users size={18} />,
    ok: dqIssues === 0,
    detail:
      dqIssues === 0
        ? 'All contacts have complete data'
        : `${dq.missingPhone} missing phone, ${dq.missingEmail} missing email, ${dq.overdueFollowUp} overdue follow-ups`,
    warn: dqIssues > 0,
  });

  return cards;
}

export default function SystemHealthPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncingEmail, setSyncingEmail] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function handleSync(type: 'email' | 'calendar') {
    const setter = type === 'email' ? setSyncingEmail : setSyncingCalendar;
    setter(true);
    setSyncMessage(null);
    try {
      const res = await fetch(`/api/sync/${type}`, { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      const data = await res.json();
      const label = type === 'email' ? 'emails' : 'calendar events';
      setSyncMessage(`Synced ${data.synced} ${label}`);
      // Re-run diagnostic to refresh display
      runDiagnostic();
    } catch {
      setSyncMessage(`${type === 'email' ? 'Email' : 'Calendar'} sync failed`);
    } finally {
      setter(false);
    }
  }

  async function runDiagnostic() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      const data: HealthCheckResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Diagnostic failed');
    } finally {
      setRunning(false);
    }
  }

  const cards = result ? buildCards(result) : [];
  const passingCount = cards.filter((c) => c.ok).length;

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-[12px] bg-gold/15 flex items-center justify-center">
            <Activity size={20} className="text-gold" />
          </div>
          <div>
            <h1
              className="text-2xl lg:text-3xl font-semibold text-navy dark:text-white"
              style={{ fontFamily: BRAND.fonts.playfair }}
            >
              System Health
            </h1>
            <p className="text-sm text-navy/50 dark:text-white/50 font-inter">
              Run a full diagnostic to check every system component
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Button
            variant="accent"
            size="lg"
            onClick={runDiagnostic}
            disabled={running}
          >
            {running ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Running checks...
              </>
            ) : (
              <>
                <Sparkles size={16} className="mr-2" />
                Run Full Diagnostic
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-[12px] bg-red-500/10 border border-red-500/20 mb-6">
          <div className="flex items-center gap-2">
            <XCircle size={16} className="text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400 font-inter">{error}</p>
          </div>
        </div>
      )}

      {/* Sync Result Message */}
      {syncMessage && (
        <div className="p-3 rounded-[12px] bg-gold/10 border border-gold/20 mb-6">
          <p className="text-sm text-navy dark:text-white font-inter">{syncMessage}</p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {cards.map((card, i) => (
              <motion.div
                key={card.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.3, ease: 'easeOut' }}
                className="rounded-[12px] border border-gold/15 p-4 bg-surface dark:bg-dark-card shadow-[0_2px_12px_rgba(19,34,54,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-center gap-3">
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {card.ok ? (
                      <CheckCircle size={20} className="text-green-500" />
                    ) : card.warn ? (
                      <AlertTriangle size={20} className="text-amber-500" />
                    ) : (
                      <XCircle size={20} className="text-red-500" />
                    )}
                  </div>

                  {/* Card icon + content */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-[8px] bg-gold/10 dark:bg-white/10 flex items-center justify-center text-gold">
                    {card.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-montserrat font-semibold text-navy dark:text-white">
                      {card.name}
                    </p>
                    <p className="text-xs text-navy/50 dark:text-white/50 font-inter truncate">
                      {card.detail}
                    </p>
                  </div>

                  {/* Response time */}
                  {card.responseMs !== undefined && (
                    <span className="text-xs text-navy/30 dark:text-white/30 font-mono flex-shrink-0">
                      {card.responseMs}ms
                    </span>
                  )}

                  {/* Sync Now buttons for email/calendar */}
                  {card.name === 'Email Sync' && result?.checks.googleOAuth.connected && (
                    <button
                      disabled={syncingEmail}
                      onClick={() => handleSync('email')}
                      className="text-xs text-gold font-montserrat font-medium px-3 py-1.5 rounded-[8px] border border-gold/20 hover:bg-gold/10 transition-colors disabled:opacity-50"
                    >
                      {syncingEmail ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
                      {syncingEmail ? 'Syncing...' : 'Sync Now'}
                    </button>
                  )}
                  {card.name === 'Calendar Sync' && result?.checks.googleOAuth.connected && (
                    <button
                      disabled={syncingCalendar}
                      onClick={() => handleSync('calendar')}
                      className="text-xs text-gold font-montserrat font-medium px-3 py-1.5 rounded-[8px] border border-gold/20 hover:bg-gold/10 transition-colors disabled:opacity-50"
                    >
                      {syncingCalendar ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
                      {syncingCalendar ? 'Syncing...' : 'Sync Now'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Summary bar */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: cards.length * 0.1, duration: 0.3 }}
              className="mt-6 rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              style={{ backgroundColor: BRAND.colors.primary }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-montserrat font-bold text-sm"
                  style={{
                    backgroundColor:
                      result.score >= 75
                        ? 'rgba(34, 197, 94, 0.2)'
                        : result.score >= 50
                          ? 'rgba(211, 169, 113, 0.2)'
                          : 'rgba(239, 68, 68, 0.2)',
                    color:
                      result.score >= 75
                        ? '#22C55E'
                        : result.score >= 50
                          ? '#d3a971'
                          : '#EF4444',
                  }}
                >
                  {result.score}%
                </div>
                <div>
                  <p className="text-sm font-montserrat font-semibold text-white">
                    {passingCount} of {cards.length} checks passed
                  </p>
                  <p className="text-xs text-white/50 font-inter">
                    Core services: {result.score}% operational
                  </p>
                </div>
              </div>
              <p className="text-xs text-white/40 font-inter">
                {new Date(result.timestamp).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
