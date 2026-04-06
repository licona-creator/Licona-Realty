'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BRAND } from '@/lib/brand';
import { NewTransactionModal } from '@/components/modals/NewTransactionModal';
import type { Transaction } from '@/types/database';
import { useRouter } from 'next/navigation';
import { DealListSkeleton } from '@/components/ui/Skeleton';
import { useTransactions } from '@/hooks/useTransactions';
import { formatMoney } from '@/lib/format';
import {
  FileText, Plus, ChevronRight, User,
} from 'lucide-react';
import { getDisplayName } from '@/lib/format';

const STATUS_PRIORITY: Record<string, number> = {
  clear_to_close: 1,
  option_period: 2,
  inspection: 3,
  appraisal: 4,
  active: 5,
  new: 6,
  closed: 10,
  cancelled: 11,
  lost: 12,
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: '#3B82F6' },
  option_period: { label: 'Option', color: '#F59E0B' },
  inspection: { label: 'Inspection', color: '#8B5CF6' },
  appraisal: { label: 'Appraisal', color: '#F97316' },
  clear_to_close: { label: 'Clear to Close', color: '#10B981' },
  closed: { label: 'Closed', color: '#22C55E' },
  cancelled: { label: 'Cancelled', color: '#EF4444' },
  lost: { label: 'Lost', color: '#EF4444' },
  new: { label: 'New', color: '#3B82F6' },
};

type TransactionWithContact = Transaction & {
  contacts?: { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
};

function urgencySort(a: TransactionWithContact, b: TransactionWithContact): number {
  const aActive = !['closed', 'cancelled', 'lost'].includes(a.status);
  const bActive = !['closed', 'cancelled', 'lost'].includes(b.status);
  if (aActive && !bActive) return -1;
  if (!aActive && bActive) return 1;

  if (aActive && bActive) {
    // Sort by closing date soonest first
    if (a.closing_date && b.closing_date) {
      const comp = a.closing_date.localeCompare(b.closing_date);
      if (comp !== 0) return comp;
    }
    if (a.closing_date && !b.closing_date) return -1;
    if (!a.closing_date && b.closing_date) return 1;

    // Then by status priority
    return (STATUS_PRIORITY[a.status] || 99) - (STATUS_PRIORITY[b.status] || 99);
  }

  // Both inactive - closed first
  return (STATUS_PRIORITY[a.status] || 99) - (STATUS_PRIORITY[b.status] || 99);
}

export default function TransactionsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<string>('active');
  const [showNewTransaction, setShowNewTransaction] = useState(false);

  const { transactions: rawTransactions, isLoading: loading, error: fetchErrorObj, mutate } = useTransactions();
  const transactions = rawTransactions as unknown as TransactionWithContact[];
  const fetchError = fetchErrorObj ? (fetchErrorObj as Error).message : null;

  const filtered = useMemo(() => {
    let list = transactions.filter(t => {
      if (filter === 'active') return !['closed', 'lost', 'cancelled'].includes(t.status);
      if (filter === 'closed') return t.status === 'closed';
      return true;
    });
    return list.sort(urgencySort);
  }, [transactions, filter]);

  if (loading) return <DealListSkeleton />;

  return (
    <div className="p-3 pt-2 pb-28 lg:p-8 lg:pb-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-[#d3a971]" />
          <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: BRAND.fonts.playfair }}>
            Deals
          </h1>
        </div>
        <Button variant="accent" size="sm" onClick={() => setShowNewTransaction(true)}>
          <Plus size={16} className="mr-1" />
          New Deal
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 mb-4">
        {['active', 'closed', 'all'].map(f => (
          <button
            type="button"
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-montserrat font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-[#d3a971] text-[#132236] font-semibold'
                : 'border border-[#d3a971]/30 text-[#d3a971]/70'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Error */}
      {fetchError && (
        <div className="mb-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400 font-inter">{fetchError}</p>
          <button type="button" onClick={() => mutate()} className="text-xs text-red-500 hover:underline font-inter mt-1">Try again</button>
        </div>
      )}

      {/* Deal List */}
      {filtered.length > 0 ? (
        <div className="space-y-2 stagger-children">
          {filtered.map(tx => {
            const days = tx.closing_date
              ? Math.floor((new Date(tx.closing_date + 'T00:00:00').getTime() - Date.now()) / 86400000)
              : null;
            const badge = STATUS_BADGE[tx.status] || STATUS_BADGE.new;
            const completedItems = (tx.checklist || []).filter((c: { is_completed?: boolean }) => c.is_completed).length;
            const totalItems = (tx.checklist || []).length;
            const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
            const daysColor = days !== null && days <= 7 ? '#ef4444' : days !== null && days <= 14 ? '#f59e0b' : '#d3a971';
            const isActive = !['closed', 'cancelled', 'lost'].includes(tx.status);

            return (
              <div
                key={tx.id}
                className="rounded-2xl p-3 cursor-pointer active:bg-[rgba(255,255,255,0.03)] transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
                onClick={() => router.push(`/transactions/${tx.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-montserrat font-semibold text-sm text-white truncate">
                        {tx.property_address}
                      </h3>
                      <span
                        className="text-[9px] font-montserrat font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: badge.color + '1A', color: badge.color }}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {tx.contacts && (
                        <span className="text-xs font-inter text-white/50 flex items-center gap-1">
                          <User size={10} />
                          {getDisplayName(tx.contacts)}
                        </span>
                      )}
                      {tx.contract_price && (
                        <span className="text-xs font-inter text-white/50">
                          {formatMoney(tx.contract_price)}
                        </span>
                      )}
                      {isActive && days !== null && (
                        <span
                          className="text-[10px] font-montserrat font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: daysColor + '1A', color: daysColor }}
                        >
                          {days >= 0 ? `${days}d` : `${Math.abs(days)}d overdue`}
                        </span>
                      )}
                    </div>

                    {/* Doc progress bar */}
                    {isActive && totalItems > 0 && (
                      <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-[#d3a971] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-white/20 flex-shrink-0 mt-1 ml-2" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="!p-8 text-center">
          <FileText size={40} className="text-[#d3a971] mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-montserrat font-semibold text-white mb-2">
            No {filter === 'all' ? '' : filter} Deals
          </h2>
          <p className="text-sm text-white/50 font-inter max-w-md mx-auto mb-6">
            Create your first deal to start tracking deadlines, documents, and commissions.
          </p>
          <Button variant="accent" onClick={() => setShowNewTransaction(true)}>
            <Plus size={16} className="mr-1" />
            Create Deal
          </Button>
        </Card>
      )}

      <NewTransactionModal
        open={showNewTransaction}
        onClose={() => setShowNewTransaction(false)}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
