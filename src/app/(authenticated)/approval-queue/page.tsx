/**
 * Approval Queue Page
 *
 * HIGHEST PRIORITY non-negotiable feature.
 * Nothing external ever sends without agent approval.
 * Items sorted by urgency: DocuSign first, campaigns second,
 * social media third, relationship messages fourth.
 *
 * Swipe right to approve, swipe left to edit (mobile).
 * Gold badge count visible on every screen.
 */

'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { BRAND } from '@/lib/brand';
import { CheckCircle, Clock, Filter } from 'lucide-react';

export default function ApprovalQueuePage() {
  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CheckCircle size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-text dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Approval Queue
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Filter size={16} />
            Filter
          </Button>
        </div>
      </div>

      {/* Empty State */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="!p-8 text-center">
          <div className="flex justify-center mb-4">
            <LRMonogram size="lg" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock size={18} className="text-gold" />
            <h2 className="text-lg font-montserrat font-semibold text-text dark:text-white">
              All Clear
            </h2>
          </div>
          <p className="text-sm text-text/50 dark:text-white/50 font-inter max-w-md mx-auto">
            No items are waiting for your review. When campaigns, social posts,
            DocuSign sends, or scheduled messages are ready, they will appear
            here for your approval before anything goes out.
          </p>
          <p className="text-xs text-text/30 dark:text-white/30 font-inter mt-4">
            Nothing external ever sends without your explicit approval.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
