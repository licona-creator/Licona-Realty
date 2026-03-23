/**
 * Reusable Integration Card Component
 *
 * Displays integration status with honest indicators,
 * configuration panel, test buttons, and setup instructions.
 */

'use client';

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BRAND } from '@/lib/brand';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
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
  const config = STATUS_CONFIG[status];

  async function handleTest() {
    if (!onTest) return;
    setTesting(true);
    try {
      await onTest();
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-[8px] bg-navy/5 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-montserrat font-semibold text-text">{name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${config.dotClass}`} />
            <span className="text-xs font-inter" style={{ color: config.color }}>
              {config.label}
            </span>
            {lastVerified && (
              <span className="text-[10px] text-text/30 font-inter">
                Last verified: {lastVerified}
              </span>
            )}
          </div>
          {statusDetails}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onTest && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                'Test Connection'
              )}
            </Button>
          )}
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text/30 hover:text-gold transition-colors p-1"
              title="View Documentation"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-text/40 hover:text-gold transition-colors p-1"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {status === 'error' && errorMessage && (
        <div className="mt-3 p-3 rounded-[8px] bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-600 font-inter">{errorMessage}</p>
        </div>
      )}

      {/* Expandable Configuration Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-gold-15">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
