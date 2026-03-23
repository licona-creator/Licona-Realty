/**
 * Approval Queue Page
 *
 * HIGHEST PRIORITY non-negotiable feature.
 * Nothing external ever sends without agent approval.
 * Items sorted by urgency: DocuSign first (1), campaigns (2),
 * social media (3), relationship messages (4).
 *
 * Approve: one tap - goes out exactly as drafted
 * Edit: opens full message editor with voice engine active
 * Discard: removed permanently - optional reason
 *
 * Overdue items flagged in yellow - never auto-send.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { ContentEditor } from '@/components/approval/ContentEditor';
import { BRAND } from '@/lib/brand';
import { VOICE_TONE_PROFILES } from '@/lib/voice/engine';
import type { ApprovalQueueItem } from '@/types/database';
import {
  CheckCircle, Clock, Filter, Check, Edit2, Trash2,
  Mail, Share2, FileSignature, Calendar, Heart, Gift,
  MessageCircle, Star,
} from 'lucide-react';

// Icon map for item types
const itemTypeIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  campaign_email: Mail,
  social_post: Share2,
  docusign: FileSignature,
  scheduling_confirmation: Calendar,
  testimonial_request: Star,
  holiday_message: Gift,
  birthday_message: Gift,
  anniversary_message: Heart,
  referral_ask: MessageCircle,
  mortgage_results_email: Mail,
  auto_response: MessageCircle,
  review_response: Star,
  gbp_post: Share2,
};

const itemTypeLabels: Record<string, string> = {
  campaign_email: 'Campaign Email',
  social_post: 'Social Post',
  docusign: 'DocuSign',
  scheduling_confirmation: 'Scheduling',
  testimonial_request: 'Testimonial Request',
  holiday_message: 'Holiday Message',
  birthday_message: 'Birthday Message',
  anniversary_message: 'Anniversary Message',
  referral_ask: 'Referral Ask',
  mortgage_results_email: 'Mortgage Results',
  auto_response: 'Auto Response',
  review_response: 'Review Response',
  gbp_post: 'Google Business Post',
};

export default function ApprovalQueuePage() {
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/approval-queue');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      // Silently fail - will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleApprove(id: string) {
    const res = await fetch(`/api/approval-queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  }

  async function handleEditApprove(id: string, content: string, toneMode: string) {
    const res = await fetch(`/api/approval-queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit_approve', content, tone_mode: toneMode }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setEditingId(null);
    }
  }

  async function handleDiscard(id: string) {
    const res = await fetch(`/api/approval-queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'discard' }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  }

  const filteredItems = filter === 'all'
    ? items
    : items.filter((item) => item.item_type === filter);

  const uniqueTypes = [...new Set(items.map((i) => i.item_type))];

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CheckCircle size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Approval Queue
          </h1>
          <Badge count={items.length} variant="gold" />
        </div>
      </div>

      {/* Filter Tabs */}
      {uniqueTypes.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-montserrat font-medium whitespace-nowrap transition-all
              ${filter === 'all' ? 'bg-navy text-gold' : 'bg-white dark:bg-dark-card text-navy/50 border border-gold/15'}`}
          >
            All ({items.length})
          </button>
          {uniqueTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-montserrat font-medium whitespace-nowrap transition-all
                ${filter === type ? 'bg-navy text-gold' : 'bg-white dark:bg-dark-card text-navy/50 border border-gold/15'}`}
            >
              {itemTypeLabels[type] || type} ({items.filter((i) => i.item_type === type).length})
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
        </div>
      )}

      {/* Items */}
      <AnimatePresence mode="popLayout">
        {filteredItems.map((item) => {
          const Icon = itemTypeIcons[item.item_type] || Mail;
          const isEditing = editingId === item.id;
          const toneProfile = VOICE_TONE_PROFILES[item.tone_mode];

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              layout
              className="mb-3"
            >
              <Card
                variant="approval"
                className={`!p-4 ${item.is_overdue ? '!border-l-amber-500' : ''}`}
              >
                {/* Item Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-gold" />
                    <span className="text-xs font-montserrat font-semibold text-navy/70 dark:text-white/70 uppercase tracking-wider">
                      {itemTypeLabels[item.item_type] || item.item_type}
                    </span>
                    {item.is_overdue && (
                      <Badge label="Overdue" variant="warning" />
                    )}
                    <span className="text-[10px] text-navy/30 dark:text-white/30 font-inter">
                      {toneProfile?.label}
                    </span>
                  </div>
                  {item.scheduled_time && (
                    <span className="text-xs text-navy/40 dark:text-white/40 font-inter flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(item.scheduled_time).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Subject */}
                {item.subject && (
                  <p className="text-sm font-montserrat font-semibold text-navy dark:text-white mb-2">
                    {item.subject}
                  </p>
                )}

                {/* Content Preview / Editor */}
                {isEditing ? (
                  <ContentEditor
                    initialContent={item.content}
                    initialToneMode={item.tone_mode}
                    onSave={(content, toneMode) =>
                      handleEditApprove(item.id, content, toneMode)
                    }
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="bg-white dark:bg-navy/30 rounded-[8px] p-3 mb-3 border border-gold/15/50">
                      <p className="text-sm text-navy/80 dark:text-white/80 font-inter whitespace-pre-wrap leading-relaxed">
                        {item.content}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => handleApprove(item.id)}
                      >
                        <Check size={14} />
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(item.id)}
                      >
                        <Edit2 size={14} />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDiscard(item.id)}
                        className="!text-red-500/60 hover:!text-red-500"
                      >
                        <Trash2 size={14} />
                        Discard
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
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
              <h2 className="text-lg font-montserrat font-semibold text-navy dark:text-white">
                All Clear
              </h2>
            </div>
            <p className="text-sm text-navy/50 dark:text-white/50 font-inter max-w-md mx-auto">
              No items are waiting for your review. When campaigns, social posts,
              DocuSign sends, or scheduled messages are ready, they will appear
              here for your approval before anything goes out.
            </p>
            <p className="text-xs text-navy/30 dark:text-white/30 font-inter mt-4">
              Nothing external ever sends without your explicit approval.
            </p>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
