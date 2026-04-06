'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Settings, LogOut, Handshake, Activity, ChevronRight,
  Upload, FlaskConical, Check, X, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { VCardImportModal } from '@/components/modals/VCardImportModal';

interface QATestResult { name: string; passed: boolean; error?: string; }
interface QAGroupResult { group: string; tests: QATestResult[]; passed: number; failed: number; }
interface QAResponse { total_tests: number; passed: number; failed: number; duration_ms: number; groups: QAGroupResult[]; all_passed: boolean; }

function QAResultsCard({ results }: { results: QAResponse }) {
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    results.groups.forEach((g, i) => { if (g.failed > 0) initial[i] = true; });
    return initial;
  });

  return (
    <div className="mt-2 border border-[#d3a971]/20 rounded-xl overflow-hidden">
      <div className={`px-4 py-3 flex items-center justify-between ${results.all_passed ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
        <div className="flex items-center gap-2">
          {results.all_passed ? <Check size={16} className="text-emerald-500" /> : <X size={16} className="text-red-500" />}
          <span className="font-montserrat text-sm font-semibold text-white">{results.passed}/{results.total_tests} passed</span>
        </div>
        <span className="text-[10px] font-inter text-white/40">{results.duration_ms}ms</span>
      </div>
      <div className="divide-y divide-white/5">
        {results.groups.map((group, gi) => (
          <div key={gi}>
            <button onClick={() => setExpandedGroups(prev => ({ ...prev, [gi]: !prev[gi] }))} className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-2">
                {group.failed === 0 ? <Check size={14} className="text-emerald-500" /> : <X size={14} className="text-red-500" />}
                <span className="font-montserrat text-xs font-medium text-white text-left">{group.group}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-inter text-white/30">{group.passed}/{group.tests.length}</span>
                {expandedGroups[gi] ? <ChevronUp size={12} className="text-white/20" /> : <ChevronDown size={12} className="text-white/20" />}
              </div>
            </button>
            {expandedGroups[gi] && (
              <div className="px-4 pb-2 space-y-1">
                {group.tests.map((test, ti) => (
                  <div key={ti} className="flex items-start gap-2 py-1">
                    {test.passed ? <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" /> : <X size={12} className="text-red-500 mt-0.5 shrink-0" />}
                    <div className="min-w-0">
                      <span className="font-inter text-[11px] text-white/60">{test.name}</span>
                      {test.error && <p className="font-inter text-[10px] text-red-500 mt-0.5 break-words">{test.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MorePage() {
  const [showSignOut, setShowSignOut] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResults, setQaResults] = useState<QAResponse | null>(null);
  const { signOut } = useAuth();
  const toast = useToast();

  async function handleQA() {
    setQaLoading(true);
    setQaResults(null);
    try {
      const res = await fetch('/api/dev/run-qa', { method: 'POST' });
      if (res.ok) {
        const data: QAResponse = await res.json();
        setQaResults(data);
        if (data.all_passed) toast.success('QA Passed', `All ${data.total_tests} tests passed.`);
        else toast.error('QA Failed', `${data.failed} of ${data.total_tests} tests failed.`);
      } else {
        toast.error('QA Failed', 'Something went wrong.');
      }
    } catch { toast.error('Error', 'Network error.'); }
    finally { setQaLoading(false); }
  }

  return (
    <div className="p-3 pt-2 pb-28 lg:p-8 lg:pb-8 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <LRMonogram size="md" />
        <div>
          <h1 className="text-lg font-montserrat font-semibold text-white">{BRAND.agent.name}</h1>
          <p className="text-xs text-white/60 font-inter">{BRAND.agent.title}</p>
        </div>
      </div>

      {/* TOOLS */}
      <p className="px-1 text-[10px] font-montserrat font-semibold text-[#d3a971] uppercase tracking-widest mb-2">Tools</p>
      <div className="space-y-1 mb-5">
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[rgba(211,169,113,0.1)] transition-colors w-full active:scale-[0.98]"
          style={{ minHeight: 44 }}
        >
          <Upload size={18} className="text-[#d3a971]" />
          <span className="font-montserrat text-sm font-medium text-white flex-1 text-left">Import Contacts</span>
          <ChevronRight size={14} className="text-white/20" />
        </button>

        <Link href="/system-health" prefetch={false} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[rgba(211,169,113,0.1)] transition-colors active:scale-[0.98]" style={{ minHeight: 44 }}>
          <Activity size={18} className="text-[#d3a971]" />
          <span className="font-montserrat text-sm font-medium text-white flex-1">System Health</span>
          <ChevronRight size={14} className="text-white/20" />
        </Link>

        <button
          type="button"
          onClick={handleQA}
          disabled={qaLoading}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[rgba(211,169,113,0.1)] transition-colors w-full disabled:opacity-50 active:scale-[0.98]"
          style={{ minHeight: 44 }}
        >
          {qaLoading ? <Loader2 size={18} className="text-[#d3a971] animate-spin" /> : <FlaskConical size={18} className="text-[#d3a971]" />}
          <span className="font-montserrat text-sm font-medium text-white flex-1 text-left">{qaLoading ? 'Running tests...' : 'Run QA Tests'}</span>
        </button>

        {qaResults && <QAResultsCard results={qaResults} />}
      </div>

      {/* BUSINESS */}
      <p className="px-1 text-[10px] font-montserrat font-semibold text-[#d3a971] uppercase tracking-widest mb-2">Business</p>
      <div className="space-y-1 mb-5">
        <Link href="/partners" prefetch={false} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[rgba(211,169,113,0.1)] transition-colors active:scale-[0.98]" style={{ minHeight: 44 }}>
          <Handshake size={18} className="text-[#d3a971]" />
          <span className="font-montserrat text-sm font-medium text-white flex-1">Partners</span>
          <ChevronRight size={14} className="text-white/20" />
        </Link>
      </div>

      {/* ACCOUNT */}
      <p className="px-1 text-[10px] font-montserrat font-semibold text-[#d3a971] uppercase tracking-widest mb-2">Account</p>
      <div className="space-y-1 mb-5">
        <Link href="/settings" prefetch={false} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[rgba(211,169,113,0.1)] transition-colors active:scale-[0.98]" style={{ minHeight: 44 }}>
          <Settings size={18} className="text-white/50" />
          <span className="font-montserrat text-sm font-medium text-white/80 flex-1">Settings</span>
          <ChevronRight size={14} className="text-white/20" />
        </Link>

        <button
          type="button"
          onClick={() => setShowSignOut(true)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/5 transition-colors w-full active:scale-[0.98]"
          style={{ minHeight: 44 }}
        >
          <LogOut size={18} className="text-red-500/60" />
          <span className="font-montserrat text-sm font-medium text-red-500/60">Sign Out</span>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-[10px] text-white/30 font-inter">{BRAND.agent.brokerage} &middot; {BRAND.agent.license}</p>
        <p className="text-[10px] text-[#d3a971]/40 font-inter mt-1">{BRAND.tagline}</p>
      </div>

      <ConfirmDialog
        open={showSignOut}
        onClose={() => setShowSignOut(false)}
        onConfirm={() => signOut()}
        title="Sign Out?"
        message="Are you sure you want to sign out of the Licona Realty Platform?"
        confirmLabel="Sign Out"
        variant="danger"
      />
      <VCardImportModal open={showImportModal} onClose={() => setShowImportModal(false)} onSuccess={() => {}} />
    </div>
  );
}
