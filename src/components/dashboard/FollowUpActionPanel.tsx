'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { BRAND } from '@/lib/brand';
import {
  Phone, MessageCircle, Copy, Check, ChevronRight,
  Lightbulb, Clock, X,
} from 'lucide-react';

interface FollowUpContact {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  next_follow_up_date: string;
  follow_up_notes: string | null;
  pipeline_stage: string;
  track_type: string;
}

interface SuggestData {
  suggestion: string;
  draftMessage: string;
  daysSinceContact: number;
  lastActivity: {
    id: string;
    activity_type: string;
    direction: string | null;
    description: string;
    activity_date: string;
  } | null;
  contact: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
    pipeline_stage: string;
    track_type: string;
    lead_source: string | null;
    language_preference: string | null;
    location_preference: string | null;
    budget: string | null;
    follow_up_notes: string | null;
    next_follow_up_date: string | null;
    last_contact_date: string | null;
  };
  partnerName: string | null;
  outboundCount: number;
}

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-600',
  contacted: 'bg-purple-500/10 text-purple-600',
  qualifying: 'bg-amber-500/10 text-amber-600',
  nurturing: 'bg-teal-500/10 text-teal-600',
  showing: 'bg-orange-500/10 text-orange-600',
  offer: 'bg-pink-500/10 text-pink-600',
  under_contract: 'bg-green-500/10 text-green-600',
  closing: 'bg-gold/10 text-gold',
  closed: 'bg-emerald-500/10 text-emerald-600',
  lost: 'bg-red-500/10 text-red-600',
  on_hold: 'bg-gray-500/10 text-gray-600',
};

const selectClassName = `w-full px-3 py-2.5 rounded-[8px] bg-white dark:bg-dark-card border border-gold/15 text-navy dark:text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all duration-200 appearance-none min-h-[44px]`;

interface FollowUpActionPanelProps {
  contact: FollowUpContact;
  onComplete: (contactId: string) => void;
  onClose: () => void;
}

export function FollowUpActionPanel({ contact, onComplete, onClose }: FollowUpActionPanelProps) {
  const toast = useToast();
  const [suggestData, setSuggestData] = useState<SuggestData | null>(null);
  const [loadingSuggest, setLoadingSuggest] = useState(true);
  const [copied, setCopied] = useState(false);

  // Form state
  const [activityType, setActivityType] = useState('text');
  const [direction, setDirection] = useState('outbound');
  const [description, setDescription] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSuggestion = useCallback(async () => {
    setLoadingSuggest(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/suggest`);
      if (res.ok) {
        const data: SuggestData = await res.json();
        setSuggestData(data);
        // Pre-fill description with template
        const dayLabel = data.daysSinceContact >= 0 ? `Day ${data.daysSinceContact}` : '';
        setDescription(`${dayLabel} follow-up ${activityType} sent.`.trim());
      }
    } catch {
      // Suggestion is non-critical
    } finally {
      setLoadingSuggest(false);
    }
  }, [contact.id, activityType]);

  useEffect(() => {
    fetchSuggestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  function setQuickDate(offset: string) {
    const now = new Date();
    if (offset === '+2d') now.setDate(now.getDate() + 2);
    else if (offset === '+1w') now.setDate(now.getDate() + 7);
    else if (offset === '+1m') now.setMonth(now.getMonth() + 1);
    else if (offset === 'none') {
      setNextFollowUpDate('');
      return;
    }
    setNextFollowUpDate(now.toISOString().split('T')[0]);
  }

  async function handleCopyDraft() {
    if (!suggestData?.draftMessage) return;
    try {
      await navigator.clipboard.writeText(suggestData.draftMessage);
      setCopied(true);
      toast.success('Copied', 'Draft message copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy Failed', 'Could not copy to clipboard.');
    }
  }

  async function handleLogAndComplete() {
    if (!description.trim()) {
      toast.error('Required', 'Please describe what happened.');
      return;
    }

    setSaving(true);
    try {
      // 1. Create activity
      const activityRes = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contact.id,
          activity_type: activityType,
          direction,
          description: description.trim(),
          activity_date: new Date().toISOString(),
        }),
      });

      if (!activityRes.ok) {
        const errData = await activityRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to log activity');
      }

      // 2. Update contact follow-up date and last_contact_date
      const contactUpdate: Record<string, string | null> = {
        last_contact_date: new Date().toISOString().split('T')[0],
      };
      if (nextFollowUpDate) {
        contactUpdate.next_follow_up_date = nextFollowUpDate;
      } else {
        contactUpdate.next_follow_up_date = null;
      }

      const contactRes = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactUpdate),
      });

      if (!contactRes.ok) {
        const errData = await contactRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update contact');
      }

      toast.success('Logged!', `Follow-up with ${contact.first_name} recorded.`);
      onComplete(contact.id);
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  const sd = suggestData;
  const stageColor = STAGE_COLORS[contact.pipeline_stage] || STAGE_COLORS.new;

  return (
    <div className="border-t border-gold/15 pt-4 mt-2 space-y-4 animate-in slide-in-from-top-2 duration-200">
      {/* SECTION A - Contact Context */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={`/contacts/${contact.id}`}
            className="text-base font-semibold text-navy dark:text-white hover:text-gold transition-colors inline-flex items-center gap-1"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            {contact.first_name} {contact.last_name}
            <ChevronRight size={14} className="text-gold" />
          </a>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-[10px] font-montserrat font-semibold px-2 py-0.5 rounded-full capitalize ${stageColor}`}>
              {contact.pipeline_stage.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] font-montserrat font-semibold uppercase px-2 py-0.5 rounded-full bg-gold/10 text-gold">
              {contact.track_type}
            </span>
            {sd?.contact.lead_source && (
              <span className="text-[10px] text-navy/40 dark:text-white/40 font-inter">
                via {sd.contact.lead_source}
              </span>
            )}
          </div>

          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="text-xs text-navy/50 dark:text-white/50 font-inter mt-1 block hover:text-gold">
              {contact.phone}
            </a>
          )}

          {sd?.partnerName && (
            <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-0.5">
              Referred by {sd.partnerName}
            </p>
          )}

          {contact.follow_up_notes && (
            <p className="text-xs text-navy/50 dark:text-white/50 font-inter mt-1 italic">
              &ldquo;{contact.follow_up_notes}&rdquo;
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-navy/5 dark:hover:bg-white/5 text-navy/30 dark:text-white/30 hover:text-navy dark:hover:text-white transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Last Activity & Days Since Contact */}
      {!loadingSuggest && sd && (
        <div className="flex items-center gap-3 flex-wrap text-xs font-inter">
          {sd.daysSinceContact >= 0 && (
            <span className={`flex items-center gap-1 ${sd.daysSinceContact > 7 ? 'text-red-500' : 'text-navy/50 dark:text-white/50'}`}>
              <Clock size={10} />
              {sd.daysSinceContact === 0 ? 'Contacted today' : `${sd.daysSinceContact}d since last contact`}
            </span>
          )}
          {sd.lastActivity && (
            <span className="text-navy/40 dark:text-white/40 truncate">
              Last: {sd.lastActivity.activity_type} {sd.lastActivity.direction ? `(${sd.lastActivity.direction})` : ''} - &ldquo;{sd.lastActivity.description.substring(0, 60)}{sd.lastActivity.description.length > 60 ? '...' : ''}&rdquo;
            </span>
          )}
        </div>
      )}

      {/* SECTION B - Smart Suggestion */}
      {!loadingSuggest && sd && (
        <div className="p-3 rounded-lg bg-gold/5 border border-gold/15">
          <div className="flex items-start gap-2">
            <Lightbulb size={14} className="text-gold flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-montserrat font-semibold text-gold mb-0.5">Suggested Action</p>
              <p className="text-sm font-inter text-navy/70 dark:text-white/70">{sd.suggestion}</p>
            </div>
          </div>
          {sd.draftMessage && (
            <div className="mt-2 p-2 rounded bg-white dark:bg-navy/30 border border-gold/10">
              <p className="text-xs text-navy/40 dark:text-white/40 font-inter mb-1">Draft message:</p>
              <p className="text-sm font-inter text-navy dark:text-white">{sd.draftMessage}</p>
            </div>
          )}
        </div>
      )}

      {loadingSuggest && (
        <div className="p-3 rounded-lg bg-gold/5 border border-gold/15 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-navy/50 dark:text-white/50 font-inter">Loading suggestion...</span>
        </div>
      )}

      {/* SECTION C - Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        {contact.phone ? (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-[8px] border-2 border-gold text-gold font-montserrat font-semibold text-sm hover:bg-gold/10 transition-colors min-h-[44px]"
          >
            <Phone size={14} />
            Call
          </a>
        ) : (
          <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-[8px] border-2 border-navy/10 text-navy/30 dark:text-white/30 font-montserrat font-semibold text-sm min-h-[44px] cursor-not-allowed">
            <Phone size={14} />
            Call
          </div>
        )}
        {contact.phone ? (
          <a
            href={`sms:${contact.phone}`}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-[8px] bg-navy dark:bg-gold/90 text-white dark:text-navy font-montserrat font-semibold text-sm hover:opacity-90 transition-opacity min-h-[44px]"
          >
            <MessageCircle size={14} />
            Text
          </a>
        ) : (
          <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-[8px] bg-navy/10 text-navy/30 dark:text-white/30 font-montserrat font-semibold text-sm min-h-[44px] cursor-not-allowed">
            <MessageCircle size={14} />
            Text
          </div>
        )}
        <button
          onClick={handleCopyDraft}
          disabled={!sd?.draftMessage}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-[8px] border border-gold/30 text-navy/70 dark:text-white/70 font-montserrat font-semibold text-sm hover:bg-gold/10 transition-colors min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy Draft'}
        </button>
      </div>

      {/* SECTION D - Log and Complete */}
      <div className="space-y-3 p-3 rounded-lg bg-surface dark:bg-navy/20 border border-gold/10">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-montserrat font-semibold text-navy/50 dark:text-white/50 mb-1 uppercase tracking-wider">Type</label>
            <select
              value={activityType}
              onChange={e => setActivityType(e.target.value)}
              className={selectClassName}
              disabled={saving}
            >
              <option value="text">Text</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="note">Note</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-montserrat font-semibold text-navy/50 dark:text-white/50 mb-1 uppercase tracking-wider">Direction</label>
            <select
              value={direction}
              onChange={e => setDirection(e.target.value)}
              className={selectClassName}
              disabled={saving}
            >
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-montserrat font-semibold text-navy/50 dark:text-white/50 mb-1 uppercase tracking-wider">What happened</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className={`${selectClassName} resize-none`}
            placeholder="Describe what happened..."
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-[10px] font-montserrat font-semibold text-navy/50 dark:text-white/50 mb-1 uppercase tracking-wider">Next follow-up</label>
          <input
            type="date"
            value={nextFollowUpDate}
            onChange={e => setNextFollowUpDate(e.target.value)}
            className={selectClassName}
            disabled={saving}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1.5">
            <button
              type="button"
              onClick={() => setQuickDate('+2d')}
              className="text-[11px] font-inter font-medium py-1.5 px-2 rounded-md bg-gold/10 text-gold hover:bg-gold/20 transition-colors min-h-[32px]"
              disabled={saving}
            >
              +2 days
            </button>
            <button
              type="button"
              onClick={() => setQuickDate('+1w')}
              className="text-[11px] font-inter font-medium py-1.5 px-2 rounded-md bg-gold/10 text-gold hover:bg-gold/20 transition-colors min-h-[32px]"
              disabled={saving}
            >
              +1 week
            </button>
            <button
              type="button"
              onClick={() => setQuickDate('+1m')}
              className="text-[11px] font-inter font-medium py-1.5 px-2 rounded-md bg-gold/10 text-gold hover:bg-gold/20 transition-colors min-h-[32px]"
              disabled={saving}
            >
              +1 month
            </button>
            <button
              type="button"
              onClick={() => setQuickDate('none')}
              className="text-[11px] font-inter font-medium py-1.5 px-2 rounded-md bg-navy/5 dark:bg-white/5 text-navy/50 dark:text-white/50 hover:bg-navy/10 dark:hover:bg-white/10 transition-colors min-h-[32px]"
              disabled={saving}
            >
              No follow-up
            </button>
          </div>
        </div>

        <Button
          variant="accent"
          className="w-full !py-3 min-h-[44px]"
          onClick={handleLogAndComplete}
          loading={saving}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Log & Set Next Follow-Up'}
        </Button>

        {/* SECTION E - Skip */}
        <button
          onClick={onClose}
          className="w-full text-center text-xs text-navy/40 dark:text-white/40 font-inter hover:text-navy/60 dark:hover:text-white/60 transition-colors py-1"
          disabled={saving}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
