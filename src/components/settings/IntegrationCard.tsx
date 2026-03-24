/**
 * Reusable Integration Card Component
 *
 * Displays integration status with honest indicators,
 * configuration panel, test buttons, and setup instructions.
 * Entire card header is clickable to expand/collapse.
 */

'use client';

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ChevronDown,
  ExternalLink,
  Check,
  X,
} from 'lucide-react';

export type IntegrationStatus =
  | 'connected'
  | 'partial'
  | 'pending'
  | 'not_connected'
  | 'error';

const STATUS_CONFIG: Record<
  IntegrationStatus,
  { color: string; label: string; dotClass: string }
> = {
  connected: { color: '#22C55E', label: 'Connected', dotClass: 'bg-green-500' },
  partial: { color: '#F59E0B', label: 'Setup Required', dotClass: 'bg-amber-500' },
  pending: { color: '#3B82F6', label: 'Pending Approval', dotClass: 'bg-blue-500' },
  not_connected: { color: '#9CA3AF', label: 'Not Connected', dotClass: 'bg-gray-400' },
  error: { color: '#EF4444', label: 'Error', dotClass: 'bg-red-500' },
};

interface IntegrationCardProps {
  name: string;
  icon: ReactNode;
  status: IntegrationStatus;
  lastVerified?: string;
  errorMessage?: string;
  docsUrl?: string;
  onTest?: () => Promise<void>;
  children: ReactNode;
  statusDetails?: ReactNode;
}

export function IntegrationCard({
  name,
  icon,
  status,
  lastVerified,
  errorMessage,
  docsUrl,
  onTest,
  children,
  statusDetails,
}: IntegrationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; responseMs?: number } | null>(null);
  const config = STATUS_CONFIG[status];

  async function handleTest(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onTest) return;
    setTesting(true);
    setTestResult(null);
    const start = Date.now();
    try {
      await onTest();
      const elapsed = Date.now() - start;
      if (status === 'connected') {
        setTestResult({ ok: true, message: `Connection verified - response: ${elapsed}ms`, responseMs: elapsed });
      } else if (status === 'not_connected') {
        setTestResult({ ok: false, message: 'Not configured - add API key in Settings to connect' });
      } else {
        setTestResult({ ok: true, message: 'Connection verified' });
      }
    } catch {
      setTestResult({ ok: false, message: 'Connection failed - check credentials and try again' });
    } finally {
      setTesting(false);
      // Auto-restore button after 4 seconds
      setTimeout(() => setTestResult(null), 4000);
    }
  }

  return (
    <Card>
      {/* Clickable Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 text-left cursor-pointer group"
      >
        <div className="w-10 h-10 rounded-[8px] bg-gold/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-montserrat font-semibold text-navy dark:text-white">{name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${config.dotClass}`} />
            <span className="text-xs font-inter" style={{ color: config.color }}>
              {config.label}
            </span>
            {lastVerified && (
              <span className="text-[10px] text-navy/30 dark:text-white/30 font-inter">
                Last verified: {lastVerified}
              </span>
            )}
          </div>
          {statusDetails}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!expanded && (
            <span className="text-xs text-gold font-montserrat font-medium hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Configure
            </span>
          )}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-navy/40 dark:text-white/40 group-hover:text-gold transition-colors p-1"
          >
            <ChevronDown size={18} />
          </motion.div>
        </div>
      </button>

      {/* Action buttons row (outside the clickable header) */}
      <div className="flex items-center gap-2 mt-2 ml-14 flex-wrap">
        {onTest && !testResult && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? (
              <>
                <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin mr-1.5" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
        )}
        {testResult && (
          <div className="flex items-center gap-1.5 px-2 py-1">
            {testResult.ok ? (
              <Check size={16} className="text-green-500 flex-shrink-0" />
            ) : (
              <X size={16} className="text-red-500 flex-shrink-0" />
            )}
            <span
              className="text-xs font-inter"
              style={{ color: testResult.ok ? '#10b981' : '#ef4444' }}
            >
              {testResult.message}
            </span>
          </div>
        )}
        {docsUrl && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gold hover:underline font-inter px-2 py-1"
          >
            Docs <ExternalLink size={10} />
          </a>
        )}
      </div>

      {/* Error Message */}
      {status === 'error' && errorMessage && (
        <div className="mt-3 p-3 rounded-[8px] bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-600 dark:text-red-400 font-inter">{errorMessage}</p>
        </div>
      )}

      {/* Expandable Configuration Panel */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="mt-4 pt-4 border-t border-gold/15 dark:border-white/10">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
