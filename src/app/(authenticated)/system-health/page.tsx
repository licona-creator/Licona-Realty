/**
 * System Health Diagnostics Page
 *
 * Real-time diagnostic dashboard that checks all platform subsystems.
 * Calls GET /api/health and displays results with animated cards.
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND } from '@/lib/brand';
import { Card } from '@/components/ui/Card';
import {
  Activity, CheckCircle, XCircle, Database, Bot, Map, Shield,
  Mail, Calendar, FileSignature, Loader2, Clock,
} from 'lucide-react';

interface CheckResult {
  ok: boolean;
  detail: string;
  ms: number;
}

interface HealthData {
  status: string;
  score: number;
  passing: number;
  total: number;
  timestamp: string;
  checks: Record<string, CheckResult>;
}

const CHECK_DISPLAY: Record<string, { label: string; icon: typeof Database }> = {
  database_contacts: { label: 'Database (Contacts)', icon: Database },
  database_transactions: { label: 'Database (Transactions)', icon: Database },
  database_activities: { label: 'Database (Activities)', icon: Database },
  database_partners: { label: 'Database (Partners)', icon: Database },
  ai_assistant: { label: 'AI Assistant (Anthropic)', icon: Bot },
  google_maps: { label: 'Google Maps', icon: Map },
  google_oauth: { label: 'Google OAuth', icon: Shield },
  gmail: { label: 'Gmail', icon: Mail },
  calendar: { label: 'Google Calendar', icon: Calendar },
  docusign: { label: 'DocuSign', icon: FileSignature },
};

export default function SystemHealthPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibleChecks, setVisibleChecks] = useState<string[]>([]);

  const runDiagnostic = useCallback(async () => {
    setLoading(true);
    setHealthData(null);
    setVisibleChecks([]);

    try {
      const res = await fetch('/api/health');
      const data: HealthData = await res.json();
      setHealthData(data);

      // Stagger card appearance
      const keys = Object.keys(data.checks);
      for (let i = 0; i < keys.length; i++) {
        await new Promise(r => setTimeout(r, 120));
        setVisibleChecks(prev => [...prev, keys[i]]);
      }

      // Save to localStorage
      localStorage.setItem('licona-health-last', JSON.stringify({
        timestamp: data.timestamp,
        score: data.score,
        passing: data.passing,
        total: data.total,
      }));
    } catch {
      setHealthData({
        status: 'error',
        score: 0,
        passing: 0,
        total: 0,
        timestamp: new Date().toISOString(),
        checks: { connection: { ok: false, detail: 'Could not reach health endpoint', ms: 0 } },
      });
      setVisibleChecks(['connection']);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND.colors.primary }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Activity size={28} className="text-gold" />
          <h1
            className="text-2xl lg:text-3xl font-semibold text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            System Health
          </h1>
        </div>
        <p className="text-sm text-white/50 font-inter mb-8">
          Run a full diagnostic on all platform subsystems
        </p>

        {/* Run Button */}
        <button
          onClick={runDiagnostic}
          disabled={loading}
          className="w-full sm:w-auto px-8 py-3.5 rounded-[8px] font-montserrat font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 mb-8"
          style={{
            backgroundColor: BRAND.colors.accent,
            color: BRAND.colors.primary,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <Activity size={16} />
              Run Full Diagnostic
            </>
          )}
        </button>

        {/* Results */}
        <AnimatePresence>
          {healthData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {Object.entries(healthData.checks).map(([key, check]) => {
                const display = CHECK_DISPLAY[key] || { label: key.replace(/_/g, ' '), icon: Activity };
                const Icon = display.icon;
                const isVisible = visibleChecks.includes(key);

                return (
                  <AnimatePresence key={key}>
                    {isVisible && (
                      <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                      >
                        <Card className="!p-4 !bg-[#1a2535] !border-gold/10">
                          <div className="flex items-center gap-3">
                            {check.ok ? (
                              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle size={20} className="text-red-500 flex-shrink-0" />
                            )}
                            <Icon size={16} className="text-gold/60 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-montserrat font-medium text-white">
                                {display.label}
                              </p>
                              <p className="text-xs font-inter text-white/50 truncate">
                                {check.detail}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono text-white/30 flex-shrink-0">
                              {check.ms}ms
                            </span>
                          </div>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                );
              })}

              {/* Summary */}
              {visibleChecks.length === Object.keys(healthData.checks).length && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <Card className="!p-6 !bg-[#1a2535] !border-gold/20 mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-montserrat font-semibold text-white">
                        {healthData.passing} of {healthData.total} systems operational
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-montserrat font-semibold ${
                          healthData.score === 100
                            ? 'bg-green-500/20 text-green-400'
                            : healthData.score >= 60
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {healthData.score}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/40">
                      <Clock size={12} />
                      <span className="text-xs font-inter">
                        Last checked: {new Date(healthData.timestamp).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
