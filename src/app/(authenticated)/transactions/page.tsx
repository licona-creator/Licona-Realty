/**
 * Transactions Page
 *
 * Transaction management with visual deal timeline, DocuSign integration,
 * document vault, commission tracker, and checklist management.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BRAND } from '@/lib/brand';
import type { Transaction } from '@/types/database';
import {
  FileText, Plus, DollarSign, CalendarDays, CheckSquare,
  Clock, AlertTriangle, ChevronRight, Users,
} from 'lucide-react';

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: '#3B82F6' },
  contacted: { label: 'Contacted', color: '#8B5CF6' },
  qualifying: { label: 'Qualifying', color: '#F59E0B' },
  showing: { label: 'Showing', color: '#F97316' },
  offer: { label: 'Offer', color: '#EC4899' },
  under_contract: { label: 'Under Contract', color: '#22C55E' },
  closing: { label: 'Closing', color: BRAND.colors.accent },
  closed: { label: 'Closed', color: '#10B981' },
  lost: { label: 'Lost', color: '#EF4444' },
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [closedValue, setClosedValue] = useState(0);
  const [filter, setFilter] = useState<string>('active');

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setPipelineValue(data.pipelineValue || 0);
        setClosedValue(data.closedValue || 0);
      }
    } catch {
      // Empty state
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const filtered = transactions.filter(t => {
    if (filter === 'active') return !['closed', 'lost'].includes(t.status);
    if (filter === 'closed') return t.status === 'closed';
    return true;
  });

  const getDaysUntilClose = (date: string | null) => {
    if (!date) return null;
    return Math.floor((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-text dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Transactions
          </h1>
        </div>
        <Button variant="accent" size="sm">
          <Plus size={16} className="mr-1" />
          New Transaction
        </Button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="!p-4">
          <DollarSign size={16} className="text-gold mb-2" />
          <p
            className="text-2xl font-bold text-text dark:text-white"
            style={{ fontFamily: BRAND.fonts.dmSerif }}
          >
            ${pipelineValue.toLocaleString()}
          </p>
          <p className="text-xs text-text/50 dark:text-white/50 font-inter">Pipeline Value</p>
        </Card>
        <Card className="!p-4">
          <DollarSign size={16} className="text-green-500 mb-2" />
          <p
            className="text-2xl font-bold text-text dark:text-white"
            style={{ fontFamily: BRAND.fonts.dmSerif }}
          >
            ${closedValue.toLocaleString()}
          </p>
          <p className="text-xs text-text/50 dark:text-white/50 font-inter">Net Commission (Closed)</p>
        </Card>
        <Card className="!p-4">
          <FileText size={16} className="text-blue-500 mb-2" />
          <p
            className="text-2xl font-bold text-text dark:text-white"
            style={{ fontFamily: BRAND.fonts.dmSerif }}
          >
            {transactions.filter(t => !['closed', 'lost'].includes(t.status)).length}
          </p>
          <p className="text-xs text-text/50 dark:text-white/50 font-inter">Active Deals</p>
        </Card>
        <Card className="!p-4">
          <CheckSquare size={16} className="text-gold mb-2" />
          <p
            className="text-2xl font-bold text-text dark:text-white"
            style={{ fontFamily: BRAND.fonts.dmSerif }}
          >
            {transactions.filter(t => t.status === 'closed').length}
          </p>
          <p className="text-xs text-text/50 dark:text-white/50 font-inter">Closed This Year</p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {['active', 'closed', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-montserrat font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-navy text-white dark:bg-gold dark:text-navy'
                : 'bg-surface dark:bg-navy/50 text-text/60'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(tx => {
            const days = getDaysUntilClose(tx.closing_date);
            const stage = STAGE_LABELS[tx.status] || STAGE_LABELS.new;
            const completedItems = (tx.checklist || []).filter(c => c.is_completed).length;
            const totalItems = (tx.checklist || []).length;

            return (
              <Card key={tx.id} className="!p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-montserrat font-semibold text-text dark:text-white text-sm">
                        {tx.property_address}
                      </h3>
                      <Badge
                        variant={tx.status === 'closed' ? 'success' : tx.status === 'lost' ? 'danger' : 'gold'}
                      >
                        {stage.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-text/50 dark:text-white/50 font-inter">
                      {tx.property_city}{tx.property_state ? `, ${tx.property_state}` : ''} {tx.property_zip || ''}
                    </p>

                    <div className="flex items-center gap-4 mt-2">
                      {tx.contract_price && (
                        <span className="text-xs font-inter text-text/60 dark:text-white/60 flex items-center gap-1">
                          <DollarSign size={10} />
                          ${tx.contract_price.toLocaleString()}
                        </span>
                      )}
                      {tx.closing_date && (
                        <span className={`text-xs font-inter flex items-center gap-1 ${
                          days !== null && days <= 7 ? 'text-red-500' : days !== null && days <= 14 ? 'text-gold' : 'text-text/60 dark:text-white/60'
                        }`}>
                          {days !== null && days <= 7 && <AlertTriangle size={10} />}
                          <CalendarDays size={10} />
                          {days !== null ? `${days}d to close` : tx.closing_date}
                        </span>
                      )}
                      {totalItems > 0 && (
                        <span className="text-xs font-inter text-text/60 dark:text-white/60 flex items-center gap-1">
                          <CheckSquare size={10} />
                          {completedItems}/{totalItems}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-text/30 dark:text-white/30 mt-1" />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="!p-8 text-center">
          <FileText size={40} className="text-gold mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-montserrat font-semibold text-text dark:text-white mb-2">
            No {filter === 'all' ? '' : filter} Transactions
          </h2>
          <p className="text-sm text-text/50 dark:text-white/50 font-inter max-w-md mx-auto mb-6">
            Create your first transaction to start tracking deadlines, documents,
            checklists, and commissions.
          </p>
          <Button variant="accent">
            <Plus size={16} className="mr-1" />
            Create Transaction
          </Button>
        </Card>
      )}
    </div>
  );
}
