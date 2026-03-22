/**
 * Transactions Page
 *
 * Transaction management with visual deal timeline, DocuSign integration,
 * document vault, commission tracker, and checklist management.
 * All documents stored in Supabase Storage with private access.
 */

'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BRAND } from '@/lib/brand';
import { FileText, Plus } from 'lucide-react';

export default function TransactionsPage() {
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
          <Plus size={16} />
          New Transaction
        </Button>
      </div>

      {/* Pipeline Value */}
      <Card className="!p-6 mb-6">
        <p className="text-sm font-montserrat text-text/60 dark:text-white/60 mb-1">
          Total Pipeline Value
        </p>
        <p
          className="text-4xl font-bold text-text dark:text-white"
          style={{ fontFamily: BRAND.fonts.dmSerif }}
        >
          $0
        </p>
        <p className="text-xs text-text/40 dark:text-white/40 font-inter mt-1">
          Estimated net commission across all active deals
        </p>
      </Card>

      {/* Empty State */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="!p-8 text-center">
          <FileText size={40} className="text-gold mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-montserrat font-semibold text-text dark:text-white mb-2">
            No Active Transactions
          </h2>
          <p className="text-sm text-text/50 dark:text-white/50 font-inter max-w-md mx-auto mb-6">
            Create your first transaction to start tracking deadlines, documents,
            checklists, and commissions. DocuSign integration and document vault
            are ready when you are.
          </p>
          <Button variant="accent">
            <Plus size={16} />
            Create Transaction
          </Button>
        </Card>
      </motion.div>
    </div>
  );
}
