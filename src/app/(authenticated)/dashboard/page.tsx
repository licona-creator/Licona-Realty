'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { BRAND } from '@/lib/brand';
import { useAgentSettings } from '@/hooks/useAgentSettings';
import {
  CheckCircle, Users, FileText, Calendar, Shield, Zap, AlertTriangle,
  Clock, DollarSign, ArrowRight, ChevronRight, Phone, PhoneCall,
  MessageCircle, Mail, Eye, Handshake, TrendingUp, Tag, Check,
  Send, Copy, Sparkles, Heart, ChevronDown,
} from 'lucide-react';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

interface FollowUpContact {
  id: string; first_name: string; last_name: string; phone: string | null;
  email: string | null; next_follow_up_date: string; follow_up_notes: string | null;
  pipeline_stage: string; track_type: string; engagement_temperature: string | null;
  disc_type: string | null; disc_secondary: string | null; disc_confidence: string | null;
  silence_meaning: string | null;
  last_activity_type: string | null; last_activity_date: string | null;
  last_activity_direction: string | null; last_activity_description: string | null;
  deal_value: number | null; deal_name: string | null;
}

interface UpcomingEvent {
  id: string; description: string; activity_date: string;
  contact_id: string;
  contacts?: { first_name: string; last_name: string } | null;
}

interface RecentActivity {
  id: string; activity_type: string; direction: string | null;
  description: string; activity_date: string;
  contacts?: { first_name: string; last_name: string } | null;
}

interface PartnerStat {
  id: string; first_name: string; last_name: string | null;
  total_leads_sent: number; total_closings: number; total_revenue_generated: number;
}

interface DashboardData {
  followUps: {
    overdue: FollowUpContact[]; today: FollowUpContact[]; upcoming: FollowUpContact[];
    counts: { overdue: number; today: number; upcoming: number };
  };
  recentActivities: RecentActivity[];
  partners: PartnerStat[];
  approvalQueue: {
    items: Array<{ id: string; item_type: string; subject: string; urgency_level: number; is_overdue: boolean; created_at: string }>;
    count: number; hasOverdue: boolean;
  };
  contacts: { total: number; activeLeads: number; byTrack: Record<string, number>; byStage: Record<string, number> };
  pipeline: {
    value: number; activeCount: number; urgentClosings: number;
    transactions: Array<{ id: string; property_address: string; status: string; contract_price: number | null; closing_date: string | null }>;
    upcomingClosings: Array<{ id: string; property_address: string; status: string; contract_price: number | null; closing_date: string | null }>;
  };
  schedule: { todayBookings: Array<{ id: string; meeting_type: string; visitor_name: string; scheduled_time: string }>; count: number };
  intelligence: { alerts: Array<{ category: string; message: string; severity: string; action_path: string | null }>; count: number };
  commissionYTD?: number;
  commissionProjected?: number;
}

interface CampaignMessageDue {
  enrollment_id: string;
  campaign_name: string;
  contact_id: string;
  contact_name: string;
  message_content: string;
  current_step: number;
}

interface NurtureMilestone {
  type: 'birthday' | 'holiday' | 'post_close' | 'gone_quiet';
  contact?: {
    id: string; first_name: string; last_name: string;
    disc_type: string | null; language_preference: string;
    phone: string | null;
  };
  // birthday
  birthday_date?: string;
  days_until?: number;
  turning_age?: number | null;
  // holiday
  name?: string;
  name_es?: string;
  date?: string;
  // post_close
  property_address?: string;
  milestone_type?: string;
  milestone_label?: string;
  days_since_close?: number;
  // gone_quiet
  last_activity_date?: string | null;
  days_silent?: number;
  suggested_action?: string;
  // generated
  message?: string;
  recommended_channel?: string;
}

interface MilestonesData {
  milestones: NurtureMilestone[];
  birthday_count_this_week: number;
  post_close_overdue: number;
  post_close_due_soon: number;
}

const ACTIVITY_ICONS: Record<string, typeof PhoneCall> = {
  call: PhoneCall, text: MessageCircle, email: Mail, note: FileText,
  showing: Eye, meeting: Users, status_change: Tag, document: FileText, other: Clock,
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatItemType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function daysOverdue(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
}

function getSmartSuggestion(c: FollowUpContact): string {
  const disc = c.disc_type;
  const firstName = c.first_name;

  // No activity history
  if (!c.last_activity_date) {
    return 'No contact history yet. Start with a text introducing yourself.';
  }

  const daysSince = Math.floor((Date.now() - new Date(c.last_activity_date).getTime()) / (1000 * 60 * 60 * 24));
  const d = daysSince < 1 ? 1 : daysSince;
  const wasInbound = c.last_activity_direction === 'inbound';
  const wasOutbound = c.last_activity_direction === 'outbound';
  const lastType = c.last_activity_type;

  // 30+ days silent - use silence_meaning if available
  if (d > 30) {
    if (c.silence_meaning) return c.silence_meaning;
    const longSilence: Record<string, string> = {
      D: '30+ days silent. One final direct message with a reason. If nothing, move on.',
      I: '30+ days silent. Warm personal re-engage. Ask about them, not business.',
      S: '30+ days silent. They may be avoiding conflict. Send pure value, zero ask.',
      C: '30+ days cold. Share fresh data for their area. They come back when ready.',
    };
    return longSilence[disc || ''] || 'Been a while. Quick check-in to see if anything has changed.';
  }

  // They reached out to us
  if (wasInbound) {
    const inbound: Record<string, string> = {
      D: `They reached out ${d} days ago. Respond fast, D types hate waiting.`,
      I: `They messaged you ${d} days ago. Match their energy, respond warmly.`,
      S: `They reached out ${d} days ago. They took a step, acknowledge it gently.`,
      C: `They contacted you ${d} days ago. Respond with the data they probably asked for.`,
    };
    return inbound[disc || ''] || `${firstName} reached out ${d} days ago. Respond today.`;
  }

  // We reached out recently - avoid over-following-up
  if (wasOutbound && d <= 3) {
    return `You reached out ${d} ${d === 1 ? 'day' : 'days'} ago. Give it a bit more time.`;
  }

  // We reached out 3+ days ago via text
  if (wasOutbound && d > 3 && lastType === 'text') {
    const textMap: Record<string, string> = {
      D: `Texted ${d} days ago, no reply. Try a direct call, keep it under 2 minutes.`,
      I: `Texted ${d} days ago. Try calling, they prefer real conversation.`,
      S: `Texted ${d} days ago. Send something valuable, no ask. Market data for their area.`,
      C: `Texted ${d} days ago. Send a detailed email with data they can review on their own.`,
    };
    return textMap[disc || ''] || `Texted ${d} days ago. Try a different channel, call or email.`;
  }

  // We reached out 3+ days ago via call
  if (wasOutbound && d > 3 && lastType === 'call') {
    const callMap: Record<string, string> = {
      D: `Called ${d} days ago. Text them something specific. One sentence.`,
      I: `Called ${d} days ago. Try a friendly text, keep it light.`,
      S: `Called ${d} days ago. Text to check in, no pressure.`,
      C: `Called ${d} days ago. Follow up with an email, put details in writing.`,
    };
    return callMap[disc || ''] || `Called ${d} days ago. Try texting instead.`;
  }

  // We reached out 3+ days ago via email
  if (wasOutbound && d > 3 && lastType === 'email') {
    const emailMap: Record<string, string> = {
      D: `Emailed ${d} days ago. Call them directly, skip the inbox.`,
      I: `Emailed ${d} days ago. Text something personal, emails get lost.`,
      S: `Emailed ${d} days ago. Give them space, send another value-add next week.`,
      C: `Emailed ${d} days ago. They may be reviewing. Send a follow-up email referencing the first.`,
    };
    return emailMap[disc || ''] || `Emailed ${d} days ago. Try calling or texting.`;
  }

  // Generic outbound fallback
  if (wasOutbound && d > 3) {
    return `Last contact ${d} days ago. Try a different approach this time.`;
  }

  return `Check in with ${firstName}. See where they are at.`;
}

function getDefaultSnoozeDays(disc: string | null): number {
  if (disc === 'D' || disc === 'I') return 1;
  if (disc === 'C') return 7;
  return 3;
}

const TEMP_COLORS: Record<string, string> = { hot: '#e74c3c', warm: '#d3a971', cool: '#3498db', cold: '#95a5a6' };
const DISC_COLORS: Record<string, string> = { D: '#c0392b', I: '#d3a971', S: '#27ae60', C: '#2980b9' };
const ACTIVITY_EMOJI: Record<string, string> = { call: '\u{1F4DE}', text: '\u{1F4F1}', email: '\u{1F4E7}', note: '\u{1F4DD}', showing: '\u{1F3E0}', meeting: '\u{1F91D}' };

function formatMoney(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return m % 1 === 0 ? `$${m}M` : `$${m.toFixed(1)}M`;
  }
  if (v >= 1_000) {
    const k = v / 1_000;
    return k % 1 === 0 ? `$${k}K` : `$${k.toFixed(1)}K`;
  }
  return `$${v.toLocaleString()}`;
}

function formatSnoozeDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

type CardAction = null | 'done' | 'snooze' | 'skip';

interface FollowUpsData {
  overdue: FollowUpContact[];
  today: FollowUpContact[];
  tomorrow: FollowUpContact[];
  counts: { overdue: number; today: number; tomorrow: number };
  nextFuture: { name: string; date: string } | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedToday, setCompletedToday] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [activeAction, setActiveAction] = useState<Record<string, CardAction>>({});
  const [doneForm, setDoneForm] = useState<Record<string, { type: string; note: string }>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [campaignMessages, setCampaignMessages] = useState<CampaignMessageDue[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [documentAlerts, setDocumentAlerts] = useState<Array<{ transactionId: string; address: string; daysToClose: number; percentComplete: number; cmrUploaded: number; cmrTotal: number; missingCount: number; urgency: 'red' | 'amber' }>>([]);
  const { settings } = useAgentSettings();
  const [intelStats, setIntelStats] = useState<{ profiled: number; total: number; ready: number }>({ profiled: 0, total: 0, ready: 0 });
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [milestonesData, setMilestonesData] = useState<MilestonesData | null>(null);
  const [dismissedMilestones, setDismissedMilestones] = useState<Set<string>>(new Set());
  const [exitingMilestones, setExitingMilestones] = useState<Set<string>>(new Set());
  const [milestoneLoading, setMilestoneLoading] = useState<Record<string, boolean>>({});
  const [copiedMilestones, setCopiedMilestones] = useState<Set<string>>(new Set());
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const displayName = settings?.profile_name || BRAND.agent.name;

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, fuRes, campRes, eventsRes, googleRes, docAlertRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/dashboard/follow-ups'),
        fetch('/api/dashboard/campaign-messages'),
        fetch('/api/dashboard/upcoming-events'),
        fetch('/api/auth/google/status'),
        fetch('/api/dashboard/document-alerts'),
      ]);
      if (dashRes.ok) setData(await dashRes.json());
      if (fuRes.ok) {
        const fuData = await fuRes.json();
        setFollowUps(fuData);
      }
      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaignMessages(campData.messages || []);
      }
      if (eventsRes.ok) {
        const evData = await eventsRes.json();
        setUpcomingEvents(evData.events || []);
      }
      if (googleRes.ok) {
        const gData = await googleRes.json();
        setGoogleConnected(gData.connected || false);
      }
      if (docAlertRes.ok) {
        const daData = await docAlertRes.json();
        setDocumentAlerts(daData.alerts || []);
      }
      // Fetch intelligence stats
      try {
        const intelRes = await fetch('/api/dashboard/intelligence-stats');
        if (intelRes.ok) {
          const iData = await intelRes.json();
          setIntelStats(iData);
        }
      } catch { /* empty */ }
      // Fetch milestones
      try {
        const msRes = await fetch('/api/dashboard/milestones');
        if (msRes.ok) {
          const msData = await msRes.json();
          setMilestonesData(msData);
        }
      } catch { /* empty */ }
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const dismissCard = useCallback((contactId: string) => {
    setExitingIds(prev => new Set(prev).add(contactId));
    setTimeout(() => {
      setDismissedIds(prev => new Set(prev).add(contactId));
      setExitingIds(prev => { const n = new Set(prev); n.delete(contactId); return n; });
      setActiveAction(prev => { const n = { ...prev }; delete n[contactId]; return n; });
      setCompletedToday(prev => prev + 1);
    }, 200);
  }, []);

  const handleAction = useCallback(async (contactId: string, body: Record<string, unknown>) => {
    setActionLoading(prev => ({ ...prev, [contactId]: true }));
    try {
      const res = await fetch(`/api/contacts/${contactId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const result = await res.json();
        return result;
      }
    } catch { /* empty */ }
    finally { setActionLoading(prev => ({ ...prev, [contactId]: false })); }
    return null;
  }, []);

  const dismissMilestone = useCallback((key: string) => {
    setExitingMilestones(prev => new Set(prev).add(key));
    setTimeout(() => {
      setDismissedMilestones(prev => new Set(prev).add(key));
      setExitingMilestones(prev => { const n = new Set(prev); n.delete(key); return n; });
    }, 200);
  }, []);

  const handleMilestoneAction = useCallback(async (
    key: string,
    action: 'sent' | 'skip',
    contactId: string,
    milestoneType: 'birthday' | 'post_close',
    milestoneLabel: string,
    message?: string
  ) => {
    setMilestoneLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch('/api/dashboard/milestones/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          contact_id: contactId,
          milestone_type: milestoneType,
          milestone_label: milestoneLabel,
          message: message ? message.slice(0, 60) : undefined,
        }),
      });
      if (res.ok) {
        dismissMilestone(key);
        return true;
      }
    } catch { /* empty */ }
    finally { setMilestoneLoading(prev => ({ ...prev, [key]: false })); }
    return false;
  }, [dismissMilestone]);

  const approvalCount = data?.approvalQueue?.count || 0;
  const contactTotal = data?.contacts?.total || 0;
  const pipelineValue = data?.pipeline?.value || 0;
  const activeDeals = data?.pipeline?.activeCount || 0;
  const fuOverdue = (followUps?.overdue || []).filter(c => !dismissedIds.has(c.id));
  const fuToday = (followUps?.today || []).filter(c => !dismissedIds.has(c.id));
  const fuTomorrow = (followUps?.tomorrow || []).filter(c => !dismissedIds.has(c.id));
  const overdueCount = fuOverdue.length;
  const hasFollowUps = fuOverdue.length > 0 || fuToday.length > 0 || fuTomorrow.length > 0;
  const nextFuture = followUps?.nextFuture || null;

  // Milestones
  function getMilestoneKey(m: NurtureMilestone, idx: number): string {
    if (m.type === 'birthday' && m.contact) return `bday-${m.contact.id}`;
    if (m.type === 'post_close' && m.contact) return `pc-${m.contact.id}-${m.milestone_type}`;
    if (m.type === 'holiday') return `hol-${m.name}`;
    if (m.type === 'gone_quiet' && m.contact) return `gq-${m.contact.id}`;
    return `ms-${idx}`;
  }

  const allMilestones = (milestonesData?.milestones || []).filter(
    (m, i) => !dismissedMilestones.has(getMilestoneKey(m, i))
  );
  const visibleMilestones = showAllMilestones ? allMilestones : allMilestones.slice(0, 8);
  const hasMilestones = allMilestones.length > 0;

  // Count contacts for holidays
  const contactCountForHoliday = (milestonesData?.milestones || []).filter(
    m => m.type !== 'holiday'
  ).length;
  const totalContactsCount = milestonesData?.milestones
    ? (milestonesData.milestones.filter(m => m.contact).length)
    : 0;

  // Birthday + post-close stat pill
  const nurtureThisWeek = (milestonesData?.birthday_count_this_week || 0) + (milestonesData?.post_close_due_soon || 0);

  if (loading) return <DashboardSkeleton />;

  return (
    <div data-testid="dashboard-page" className="p-3 pt-2 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.playfair }}>
            {getGreeting()}, {displayName.split(' ')[0]}
          </h1>
          <p className="text-sm text-navy/50 dark:text-white/50 font-inter mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} &middot; {BRAND.tagline}
          </p>
        </div>
        <LRMonogram size="md" />
      </div>

      <div className="space-y-6">
        {/* Mobile-only: compact metric pills row */}
        <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden scrollbar-hide">
          <div className="flex-shrink-0 px-3 py-2 rounded-full bg-gold/10 border border-gold/20">
            <span className="text-xs font-montserrat font-semibold text-navy dark:text-white">{formatMoney(pipelineValue)}</span>
          </div>
          <div className="flex-shrink-0 px-3 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
            <span className="text-xs font-montserrat font-semibold text-navy dark:text-white">{data?.contacts.activeLeads || 0} Leads</span>
          </div>
          <div className="flex-shrink-0 px-3 py-2 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="text-xs font-montserrat font-semibold text-navy dark:text-white">{activeDeals} {activeDeals === 1 ? 'Deal' : 'Deals'}</span>
          </div>
          <div className="flex-shrink-0 px-3 py-2 rounded-full bg-surface dark:bg-navy/50 border border-navy/10 dark:border-white/10">
            <span className="text-xs font-montserrat font-semibold text-navy dark:text-white">{contactTotal} Contacts</span>
          </div>
          {nurtureThisWeek > 0 && (
            <div className="flex-shrink-0 px-3 py-2 rounded-full bg-gold/10 border border-gold/20">
              <span className="text-xs font-montserrat font-semibold text-navy dark:text-white">{'\uD83C\uDF82'} {nurtureThisWeek} this week</span>
            </div>
          )}
        </div>

        {/* Mobile-only: urgent closing banners */}
        {data?.pipeline.upcomingClosings && data.pipeline.upcomingClosings.length > 0 && (
          <div className="space-y-2 lg:hidden">
            {data.pipeline.upcomingClosings.map(tx => {
              const days = tx.closing_date ? Math.floor((new Date(tx.closing_date + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
              if (days === null || days > 14) return null;
              const isUrgent = days <= 7;
              const closingDateStr = tx.closing_date ? new Date(tx.closing_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '';
              return (
                <a
                  key={tx.id}
                  href={`/transactions/${tx.id}`}
                  className="flex items-center gap-3 p-3 rounded-[8px] transition-colors min-h-[44px] touch-row"
                  style={{
                    backgroundColor: isUrgent ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
                    border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.3)'}`,
                  }}
                >
                  <AlertTriangle size={16} className={isUrgent ? 'text-red-500 flex-shrink-0' : 'text-yellow-500 flex-shrink-0'} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-montserrat font-semibold ${isUrgent ? 'text-red-600' : 'text-yellow-700 dark:text-yellow-400'}`}>
                      {days < 0 ? `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} overdue` : days === 0 ? 'Closing today' : `Closing in ${days} ${days === 1 ? 'day' : 'days'}`}
                    </p>
                    <p className="text-xs font-inter text-navy/70 dark:text-white/70 truncate">
                      {tx.property_address} {closingDateStr && `- ${closingDateStr}`}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-navy/30 dark:text-white/30 flex-shrink-0" />
                </a>
              );
            })}
          </div>
        )}

        {/* Document Alerts - CMR Required */}
        {documentAlerts.length > 0 && (
          <div className="space-y-2">
            {documentAlerts.map(alert => {
              const isRed = alert.urgency === 'red';
              return (
                <a
                  key={alert.transactionId}
                  href={`/transactions/${alert.transactionId}`}
                  className="flex items-center gap-3 p-3 rounded-[8px] transition-colors min-h-[44px]"
                  style={{
                    backgroundColor: isRed ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
                    border: `1px solid ${isRed ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.3)'}`,
                  }}
                >
                  <AlertTriangle size={16} className={isRed ? 'text-red-500 flex-shrink-0' : 'text-amber-500 flex-shrink-0'} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-montserrat font-semibold ${isRed ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                      {alert.address}: {alert.cmrUploaded} of {alert.cmrTotal} broker-required documents collected
                    </p>
                    <p className="text-xs font-inter text-navy/70 dark:text-white/70">
                      {alert.daysToClose < 0 ? `${Math.abs(alert.daysToClose)} ${Math.abs(alert.daysToClose) === 1 ? 'day' : 'days'} overdue` : alert.daysToClose === 0 ? 'Closing today' : `Closing in ${alert.daysToClose} ${alert.daysToClose === 1 ? 'day' : 'days'}`}. {alert.missingCount} CMR-required {alert.missingCount === 1 ? 'doc' : 'docs'} still needed for payment.
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-navy/30 dark:text-white/30 flex-shrink-0" />
                </a>
              );
            })}
          </div>
        )}

        {/* FOLLOW-UPS - Morning Briefing */}
        <Card className={`!p-4 sm:!p-6 ${overdueCount > 0 ? '!border-red-500/30 !bg-red-500/[0.02]' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Clock size={22} className={overdueCount > 0 ? 'text-red-500' : 'text-gold'} />
              <h2 className="text-lg font-semibold font-montserrat text-navy dark:text-white">Follow-Ups</h2>
              {overdueCount > 0 && <span className="text-[10px] font-montserrat font-semibold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">{overdueCount} overdue</span>}
            </div>
            {completedToday > 0 && (
              <span className="flex items-center gap-1 text-xs font-montserrat font-semibold text-green-600">
                <Check size={12} />
                {completedToday} done
              </span>
            )}
          </div>

          {hasFollowUps ? (
            <div className="space-y-4">
              {/* Sections: Overdue, Today, Tomorrow */}
              {[
                { label: 'OVERDUE', items: fuOverdue, color: '#e74c3c', borderColor: 'border-l-red-500' },
                { label: 'TODAY', items: fuToday, color: '#d3a971', borderColor: 'border-l-gold' },
                { label: 'TOMORROW', items: fuTomorrow, color: '#132236', borderColor: 'border-l-navy' },
              ].filter(s => s.items.length > 0).map(section => (
                <div key={section.label}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-montserrat font-bold tracking-wider" style={{ color: section.color }}>{section.label}</span>
                    <span className="text-[10px] font-montserrat font-semibold px-1.5 py-0.5 rounded-full" style={{ color: section.color, backgroundColor: `${section.color}15` }}>{section.items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {section.items.map(c => {
                      const isExiting = exitingIds.has(c.id);
                      const currentAction = activeAction[c.id] || null;
                      const isLoading = actionLoading[c.id] || false;
                      const form = doneForm[c.id] || { type: 'text', note: '' };
                      const suggestion = getSmartSuggestion(c);
                      const daysSinceActivity = c.last_activity_date ? Math.max(1, Math.floor((Date.now() - new Date(c.last_activity_date).getTime()) / (1000 * 60 * 60 * 24))) : null;
                      const actEmoji = ACTIVITY_EMOJI[c.last_activity_type || ''] || '';
                      const dirArrow = c.last_activity_direction === 'inbound' ? '\u2190' : '\u2192';

                      return (
                        <div
                          key={c.id}
                          className={`rounded-lg border-l-2 ${section.borderColor} border border-navy/5 dark:border-white/5 bg-surface dark:bg-navy/30 overflow-hidden`}
                          style={{
                            transition: 'transform 200ms ease-out, opacity 200ms ease-out',
                            transform: isExiting ? 'translateX(-100%)' : 'translateX(0)',
                            opacity: isExiting ? 0 : 1,
                          }}
                        >
                          {/* Default card */}
                          {!currentAction && (
                            <div className="p-3">
                              <div className="flex items-start gap-3">
                                <a href={`/contacts/${c.id}`} className="flex items-start gap-2.5 flex-1 min-w-0">
                                  <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-montserrat font-semibold text-gold">{c.first_name[0]}{c.last_name[0]}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {/* Line 1: Name + badges */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-sm font-montserrat font-medium text-navy dark:text-white">{c.first_name} {c.last_name}</span>
                                      {c.engagement_temperature && (
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TEMP_COLORS[c.engagement_temperature] || '#95a5a6' }} title={c.engagement_temperature} />
                                      )}
                                      {c.disc_type && (
                                        <span className="text-[10px] font-montserrat font-bold flex-shrink-0" style={{ color: DISC_COLORS[c.disc_type] || '#95a5a6' }}>{c.disc_type}{c.disc_secondary || ''}</span>
                                      )}
                                    </div>
                                    {/* Line 2: Due indicator */}
                                    {section.label === 'OVERDUE' && (
                                      <p className="text-xs font-inter mt-0.5" style={{ color: '#e74c3c' }}>{daysOverdue(c.next_follow_up_date)} {daysOverdue(c.next_follow_up_date) === 1 ? 'day' : 'days'} overdue</p>
                                    )}
                                    {section.label === 'TODAY' && (
                                      <p className="text-xs font-inter mt-0.5" style={{ color: '#d3a971' }}>Due today</p>
                                    )}
                                    {section.label === 'TOMORROW' && (
                                      <p className="text-xs font-inter mt-0.5" style={{ color: '#132236' }}>Due tomorrow</p>
                                    )}
                                    {/* Line 3: Last activity context */}
                                    {c.last_activity_type ? (
                                      <p className="text-xs font-inter text-navy/35 dark:text-white/35 mt-0.5">{actEmoji} {c.last_activity_type} {dirArrow} {daysSinceActivity} {daysSinceActivity === 1 ? 'day' : 'days'} ago</p>
                                    ) : (
                                      <p className="text-xs font-inter text-navy/25 dark:text-white/25 mt-0.5">No previous contact</p>
                                    )}
                                    {/* Line 4: Deal indicator */}
                                    {c.deal_value && c.deal_value > 0 && (
                                      <p className="text-xs font-inter mt-0.5" style={{ color: '#d3a971' }}>{formatMoney(c.deal_value)} deal{c.deal_name ? ` - ${c.deal_name}` : ''}</p>
                                    )}
                                    {/* Line 5: DISC suggestion */}
                                    <p className="text-xs font-inter text-navy/40 dark:text-white/40 mt-1 italic line-clamp-2">{suggestion}</p>
                                  </div>
                                </a>
                                {/* Action buttons */}
                                <div className="flex items-center gap-1.5 flex-shrink-0 pt-1">
                                  <button type="button" onClick={() => { setActiveAction(prev => ({ ...prev, [c.id]: 'done' })); setDoneForm(prev => ({ ...prev, [c.id]: { type: 'text', note: '' } })); }} className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#27ae60' }} title="Done"><Check size={16} color="#fff" /></button>
                                  <button type="button" onClick={() => setActiveAction(prev => ({ ...prev, [c.id]: 'snooze' }))} className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#d3a971' }} title="Snooze"><Clock size={16} color="#fff" /></button>
                                  <button type="button" onClick={() => setActiveAction(prev => ({ ...prev, [c.id]: 'skip' }))} className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#95a5a6' }} title="Skip"><ArrowRight size={16} color="#fff" /></button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* DONE form */}
                          {currentAction === 'done' && (
                            <div className="p-3 space-y-2.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {['call', 'text', 'email', 'note'].map(t => (
                                  <button key={t} type="button" onClick={() => setDoneForm(prev => ({ ...prev, [c.id]: { ...form, type: t } }))} className={`px-3 py-1.5 rounded-full text-xs font-montserrat font-semibold transition-colors capitalize ${form.type === t ? 'bg-navy text-white dark:bg-gold dark:text-navy' : 'bg-navy/5 dark:bg-white/10 text-navy/60 dark:text-white/60'}`}>{t}</button>
                                ))}
                              </div>
                              <input type="text" placeholder="Quick note..." value={form.note} onChange={e => setDoneForm(prev => ({ ...prev, [c.id]: { ...form, note: e.target.value } }))} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-navy/10 dark:border-white/10 text-sm font-inter text-navy dark:text-white placeholder:text-navy/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                              <div className="flex items-center gap-3">
                                <button type="button" disabled={isLoading} onClick={async () => {
                                  const result = await handleAction(c.id, { action: 'done', activity_type: form.type, note: form.note || undefined });
                                  if (result) {
                                    const dateStr = result.next_follow_up_date ? formatSnoozeDate(result.next_follow_up_date) : '';
                                    dismissCard(c.id);
                                    const el = document.getElementById('fu-toast');
                                    if (el) { el.textContent = `Logged. Next: ${dateStr}`; el.classList.remove('opacity-0'); setTimeout(() => el.classList.add('opacity-0'), 2500); }
                                  }
                                }} className="px-4 py-2 rounded-lg text-xs font-montserrat font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#27ae60' }}>{isLoading ? 'Saving...' : 'Save'}</button>
                                <button type="button" onClick={() => setActiveAction(prev => ({ ...prev, [c.id]: null }))} className="text-xs font-inter text-navy/40 dark:text-white/40 hover:text-navy dark:hover:text-white">Cancel</button>
                              </div>
                            </div>
                          )}

                          {/* SNOOZE pills */}
                          {currentAction === 'snooze' && (
                            <div className="p-3 space-y-2.5">
                              <p className="text-xs font-montserrat font-semibold text-navy/60 dark:text-white/60">Snooze {c.first_name}</p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                {[{ label: 'Tomorrow', days: 1 }, { label: '3 Days', days: 3 }, { label: '1 Week', days: 7 }, { label: '2 Weeks', days: 14 }].map(opt => (
                                  <button key={opt.days} type="button" disabled={isLoading} onClick={async () => {
                                    const result = await handleAction(c.id, { action: 'snooze', snooze_days: opt.days });
                                    if (result) {
                                      const dateStr = result.next_follow_up_date ? formatSnoozeDate(result.next_follow_up_date) : '';
                                      dismissCard(c.id);
                                      const el = document.getElementById('fu-toast');
                                      if (el) { el.textContent = `Snoozed until ${dateStr}`; el.classList.remove('opacity-0'); setTimeout(() => el.classList.add('opacity-0'), 2500); }
                                    }
                                  }} className={`py-2.5 rounded-lg text-xs font-montserrat font-semibold transition-colors disabled:opacity-50 ${opt.days === getDefaultSnoozeDays(c.disc_type) ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-navy/5 dark:bg-white/10 text-navy/60 dark:text-white/60'}`}>{opt.label}</button>
                                ))}
                              </div>
                              <button type="button" onClick={() => setActiveAction(prev => ({ ...prev, [c.id]: null }))} className="text-xs font-inter text-navy/40 dark:text-white/40 hover:text-navy dark:hover:text-white">Cancel</button>
                            </div>
                          )}

                          {/* SKIP confirmation */}
                          {currentAction === 'skip' && (
                            <div className="p-3 space-y-2.5">
                              <p className="text-xs font-montserrat font-semibold text-navy/60 dark:text-white/60">Remove follow-up for {c.first_name}?</p>
                              <div className="flex items-center gap-2">
                                <button type="button" disabled={isLoading} onClick={async () => {
                                  const result = await handleAction(c.id, { action: 'skip', skip_type: '30days' });
                                  if (result) { dismissCard(c.id); const el = document.getElementById('fu-toast'); if (el) { el.textContent = 'Pushed 30 days'; el.classList.remove('opacity-0'); setTimeout(() => el.classList.add('opacity-0'), 2500); } }
                                }} className="flex-1 py-2.5 rounded-lg text-xs font-montserrat font-semibold border border-gold/30 text-gold disabled:opacity-50">30 Days</button>
                                <button type="button" disabled={isLoading} onClick={async () => {
                                  const result = await handleAction(c.id, { action: 'skip', skip_type: 'remove' });
                                  if (result !== null) { dismissCard(c.id); const el = document.getElementById('fu-toast'); if (el) { el.textContent = 'Follow-up removed'; el.classList.remove('opacity-0'); setTimeout(() => el.classList.add('opacity-0'), 2500); } }
                                }} className="flex-1 py-2.5 rounded-lg text-xs font-montserrat font-semibold border border-red-500/30 text-red-500 disabled:opacity-50">Remove</button>
                              </div>
                              <button type="button" onClick={() => setActiveAction(prev => ({ ...prev, [c.id]: null }))} className="text-xs font-inter text-navy/40 dark:text-white/40 hover:text-navy dark:hover:text-white">Cancel</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 gap-2">
              <Check size={24} className="text-gold" />
              <p className="text-sm font-montserrat font-semibold text-navy dark:text-white">All caught up</p>
              {nextFuture ? (
                <p className="text-xs font-inter text-navy/40 dark:text-white/40">Next follow-up: {nextFuture.name} on {formatSnoozeDate(nextFuture.date)}</p>
              ) : (
                <p className="text-xs font-inter text-navy/40 dark:text-white/40">No follow-ups scheduled</p>
              )}
            </div>
          )}

          {/* Inline toast */}
          <div id="fu-toast" className="opacity-0 transition-opacity duration-300 mt-3 text-center text-xs font-montserrat font-semibold text-green-600" />
        </Card>

        {/* NURTURE SECTION */}
        {hasMilestones && (
          <Card className="!p-4 sm:!p-6">
            <div className="flex items-center gap-3 mb-4">
              <Heart size={22} style={{ color: '#d3a971' }} />
              <h2 className="text-lg font-semibold font-montserrat text-navy dark:text-white">Nurture</h2>
              {(milestonesData?.post_close_overdue || 0) > 0 && (
                <span className="text-[10px] font-montserrat font-semibold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                  {milestonesData?.post_close_overdue} overdue
                </span>
              )}
            </div>

            <div className="space-y-2">
              {visibleMilestones.map((m, idx) => {
                const key = getMilestoneKey(m, idx);
                const isExiting = exitingMilestones.has(key);
                const isLoading = milestoneLoading[key] || false;

                // BIRTHDAY CARD
                if (m.type === 'birthday' && m.contact) {
                  const daysLabel = m.days_until === 0 ? 'Today!' : m.days_until === 1 ? 'Tomorrow' : `In ${m.days_until} days`;
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-navy/5 dark:border-white/5 bg-surface dark:bg-navy/30 overflow-hidden"
                      style={{
                        transition: 'transform 200ms ease-out, opacity 200ms ease-out',
                        transform: isExiting ? 'translateX(-100%)' : 'translateX(0)',
                        opacity: isExiting ? 0 : 1,
                      }}
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm">{'\uD83C\uDF82'}</span>
                              <a href={`/contacts/${m.contact.id}`} className="text-sm font-montserrat font-medium text-navy dark:text-white hover:text-gold transition-colors">
                                {m.contact.first_name}&apos;s birthday
                              </a>
                              <span
                                className="text-[10px] font-montserrat font-semibold px-1.5 py-0.5 rounded-full"
                                style={{
                                  color: m.days_until === 0 ? '#d3a971' : '#132236',
                                  backgroundColor: m.days_until === 0 ? 'rgba(211,169,113,0.15)' : 'transparent',
                                }}
                              >
                                {daysLabel}
                              </span>
                            </div>
                            {m.message && (
                              <div className="mt-2 p-3 rounded-lg text-sm font-inter text-navy/70 dark:text-white/70" style={{ backgroundColor: '#f4f4f4' }}>
                                <span className="dark:text-navy/70">{m.message}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {!copiedMilestones.has(key) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    try { navigator.clipboard.writeText(m.message || ''); } catch { /* empty */ }
                                    setCopiedMilestones(prev => new Set(prev).add(key));
                                    const el = document.getElementById('nurture-toast');
                                    if (el) { el.textContent = 'Copied to clipboard'; el.classList.remove('opacity-0'); setTimeout(() => el.classList.add('opacity-0'), 2500); }
                                  }}
                                  className="px-4 py-2 rounded-lg text-xs font-montserrat font-semibold text-white min-h-[44px]"
                                  style={{ backgroundColor: '#d3a971' }}
                                >
                                  Copy
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={async () => {
                                    const ok = await handleMilestoneAction(key, 'sent', m.contact!.id, 'birthday', 'Birthday message', m.message);
                                    if (ok) {
                                      const el = document.getElementById('nurture-toast');
                                      if (el) { el.textContent = 'Logged'; el.classList.remove('opacity-0'); setTimeout(() => el.classList.add('opacity-0'), 2500); }
                                    }
                                  }}
                                  className="px-4 py-2 rounded-lg text-xs font-montserrat font-semibold text-white disabled:opacity-50 min-h-[44px]"
                                  style={{ backgroundColor: '#27ae60' }}
                                >
                                  {isLoading ? 'Saving...' : 'Mark Sent'}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={async () => {
                                  const ok = await handleMilestoneAction(key, 'skip', m.contact!.id, 'birthday', 'Birthday message');
                                  if (ok) {
                                    const el = document.getElementById('nurture-toast');
                                    if (el) { el.textContent = 'Skipped'; el.classList.remove('opacity-0'); setTimeout(() => el.classList.add('opacity-0'), 2500); }
                                  }
                                }}
                                className="px-4 py-2 rounded-lg text-xs font-montserrat font-semibold text-navy/40 dark:text-white/40 bg-navy/5 dark:bg-white/10 disabled:opacity-50 min-h-[44px]"
                              >
                                Skip
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // POST-CLOSE CARD
                if (m.type === 'post_close' && m.contact) {
                  const isOverdue = (m.days_until ?? 0) < 0;
                  const daysLabel = isOverdue
                    ? 'Overdue'
                    : m.days_until === 0
                      ? 'Due today'
                      : `In ${m.days_until} days`;
                  const shortAddr = m.property_address
                    ? (m.property_address.length > 40 ? m.property_address.slice(0, 40) + '...' : m.property_address)
                    : '';

                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-navy/5 dark:border-white/5 bg-surface dark:bg-navy/30 overflow-hidden"
                      style={{
                        transition: 'transform 200ms ease-out, opacity 200ms ease-out',
                        transform: isExiting ? 'translateX(-100%)' : 'translateX(0)',
                        opacity: isExiting ? 0 : 1,
                        borderLeft: isOverdue ? '3px solid #e74c3c' : undefined,
                      }}
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm">{'\uD83C\uDFE0'}</span>
                              <a href={`/contacts/${m.contact.id}`} className="text-sm font-montserrat font-medium text-navy dark:text-white hover:text-gold transition-colors">
                                {m.contact.first_name}
                              </a>
                              <span className="text-xs font-inter text-navy/50 dark:text-white/50">- {m.milestone_label}</span>
                            </div>
                            {shortAddr && (
                              <p className="text-xs font-inter text-navy/40 dark:text-white/40 mt-0.5">{shortAddr}</p>
                            )}
                            <span
                              className="text-[10px] font-montserrat font-semibold mt-0.5 inline-block"
                              style={{ color: isOverdue ? '#e74c3c' : m.days_until === 0 ? '#d3a971' : '#132236' }}
                            >
                              {daysLabel}
                            </span>
                            {m.message && (
                              <div className="mt-2 p-3 rounded-lg text-sm font-inter text-navy/70 dark:text-white/70" style={{ backgroundColor: '#f4f4f4' }}>
                                <span className="dark:text-navy/70">{m.message}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {!copiedMilestones.has(key) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    try { navigator.clipboard.writeText(m.message || ''); } catch { /* empty */ }
                                    setCopiedMilestones(prev => new Set(prev).add(key));
                                    const el = document.getElementById('nurture-toast');
                                    if (el) { el.textContent = 'Copied to clipboard'; el.classList.remove('opacity-0'); setTimeout(() => el.classList.add('opacity-0'), 2500); }
                                  }}
                                  className="px-4 py-2 rounded-lg text-xs font-montserrat font-semibold text-white min-h-[44px]"
                                  style={{ backgroundColor: '#d3a971' }}
                                >
                                  Copy
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={async () => {
                                    const ok = await handleMilestoneAction(key, 'sent', m.contact!.id, 'post_close', m.milestone_label || '', m.message);
                                    if (ok) {
                                      const el = document.getElementById('nurture-toast');
                                      if (el) { el.textContent = 'Logged'; el.classList.remove('opacity-0'); setTimeout(() => el.classList.add('opacity-0'), 2500); }
                                    }
                                  }}
                                  className="px-4 py-2 rounded-lg text-xs font-montserrat font-semibold text-white disabled:opacity-50 min-h-[44px]"
                                  style={{ backgroundColor: '#27ae60' }}
                                >
                                  {isLoading ? 'Saving...' : 'Mark Sent'}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={async () => {
                                  const ok = await handleMilestoneAction(key, 'skip', m.contact!.id, 'post_close', m.milestone_label || '');
                                  if (ok) {
                                    const el = document.getElementById('nurture-toast');
                                    if (el) { el.textContent = 'Skipped'; el.classList.remove('opacity-0'); setTimeout(() => el.classList.add('opacity-0'), 2500); }
                                  }
                                }}
                                className="px-4 py-2 rounded-lg text-xs font-montserrat font-semibold text-navy/40 dark:text-white/40 bg-navy/5 dark:bg-white/10 disabled:opacity-50 min-h-[44px]"
                              >
                                Skip
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // HOLIDAY CARD
                if (m.type === 'holiday') {
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-navy/5 dark:border-white/5 bg-surface dark:bg-navy/30 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{'\uD83D\uDCC5'}</span>
                        <span className="text-sm font-montserrat font-medium text-navy dark:text-white">{m.name}</span>
                        <span className="text-[10px] font-montserrat font-semibold text-navy/50 dark:text-white/50">In {m.days_until} days</span>
                      </div>
                      <p className="text-xs font-inter text-navy/40 dark:text-white/40 mt-1 ml-6">
                        {totalContactsCount > 0 ? `${totalContactsCount} contacts to reach out to` : 'Holiday reminder'}
                      </p>
                    </div>
                  );
                }

                // GONE QUIET CARD
                if (m.type === 'gone_quiet' && m.contact) {
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-navy/5 dark:border-white/5 bg-surface dark:bg-navy/30 p-3"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">{'\u26A0\uFE0F'}</span>
                        <a href={`/contacts/${m.contact.id}`} className="text-sm font-montserrat font-medium text-navy dark:text-white hover:text-gold transition-colors">
                          {m.contact.first_name}
                        </a>
                        <span className="text-xs font-inter text-navy/40 dark:text-white/40">- {m.days_silent} days since last contact</span>
                      </div>
                      {m.suggested_action && (
                        <p className="text-xs font-inter text-navy/50 dark:text-white/50 mt-1 ml-6 italic">{m.suggested_action}</p>
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>

            {/* View all toggle */}
            {allMilestones.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllMilestones(prev => !prev)}
                className="flex items-center gap-1 mt-3 text-xs font-montserrat font-semibold text-gold hover:underline"
              >
                {showAllMilestones ? 'Show less' : `View all (${allMilestones.length})`}
                <ChevronDown size={12} className={`transition-transform ${showAllMilestones ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Nurture toast */}
            <div id="nurture-toast" className="opacity-0 transition-opacity duration-300 mt-3 text-center text-xs font-montserrat font-semibold text-green-600" />
          </Card>
        )}

        {/* Upcoming Events */}
        <Card className="!p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar size={22} className="text-gold" />
            <h2 className="text-lg font-semibold font-montserrat text-navy dark:text-white">Upcoming Events</h2>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map(ev => {
                const evDate = new Date(ev.activity_date);
                const contactName = ev.contacts ? `${ev.contacts.first_name} ${ev.contacts.last_name}` : '';
                return (
                  <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface dark:bg-navy/30">
                    <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Calendar size={12} className="text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-montserrat font-medium text-navy dark:text-white truncate">{ev.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-navy/50 dark:text-white/50 font-inter">
                          {evDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {evDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {contactName && (
                          <a href={`/contacts/${ev.contact_id}`} className="text-xs text-gold font-inter hover:underline truncate">
                            {contactName}
                          </a>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-navy/20 dark:text-white/20 flex-shrink-0 mt-1" />
                  </div>
                );
              })}
            </div>
          ) : googleConnected ? (
            <p className="text-sm text-navy/50 dark:text-white/50 font-inter">No upcoming events. Events sync from Google Calendar every 6 hours.</p>
          ) : (
            <p className="text-sm text-navy/50 dark:text-white/50 font-inter">
              Connect Google in <a href="/settings?tab=integrations" className="text-gold hover:underline">Settings</a> to see calendar events.
            </p>
          )}
        </Card>

        {/* Campaign Messages Due */}
        {campaignMessages.length > 0 && (
          <Card className="!p-6">
            <div className="flex items-center gap-3 mb-4">
              <Send size={22} className="text-gold" />
              <h2 className="text-lg font-semibold font-montserrat text-navy dark:text-white">Campaign Messages Due</h2>
              <Badge variant="gold">{campaignMessages.length}</Badge>
            </div>
            <div className="space-y-2">
              {campaignMessages.map(msg => (
                <div key={msg.enrollment_id} className="rounded-lg border border-gold/10 bg-gold/[0.03]">
                  <button
                    onClick={() => setExpandedCampaignId(prev => prev === msg.enrollment_id ? null : msg.enrollment_id)}
                    className="w-full p-3 text-left hover:bg-gold/5 transition-colors rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-montserrat font-medium text-navy dark:text-white">{msg.contact_name}</p>
                        <p className="text-xs text-navy/50 dark:text-white/50 font-inter">{msg.campaign_name} - Step {msg.current_step}</p>
                      </div>
                      <ChevronRight size={14} className={`text-navy/20 dark:text-white/20 transition-transform ${expandedCampaignId === msg.enrollment_id ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                  {expandedCampaignId === msg.enrollment_id && (
                    <div className="px-3 pb-3 space-y-2">
                      <div className="p-3 rounded-lg bg-surface dark:bg-navy/30">
                        <p className="text-sm font-inter text-navy/70 dark:text-white/70 whitespace-pre-wrap">{msg.message_content}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(msg.message_content)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] bg-gold/10 text-gold text-xs font-montserrat font-medium hover:bg-gold/20 transition-colors"
                        >
                          <Copy size={12} /> Copy
                        </button>
                        <button
                          onClick={async () => {
                            await fetch('/api/campaigns/enroll', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ enrollment_id: msg.enrollment_id, action: 'advance' }),
                            });
                            fetchDashboard();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] bg-navy text-white dark:bg-gold dark:text-navy text-xs font-montserrat font-medium hover:opacity-90 transition-colors"
                        >
                          <Check size={12} /> Log and Advance
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Pipeline Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="!p-3 lg:!p-4 min-h-[80px]">
            <DollarSign size={16} className="text-gold mb-1 lg:mb-2" />
            <p className="text-lg lg:text-2xl font-bold text-navy dark:text-white truncate" style={{ fontFamily: BRAND.fonts.dmSerif }}>{formatMoney(pipelineValue)}</p>
            <p className="text-[10px] lg:text-xs text-navy/50 dark:text-white/50 font-inter">Pipeline Value</p>
          </Card>
          <Card className="!p-3 lg:!p-4 min-h-[80px]">
            <Users size={16} className="text-gold mb-1 lg:mb-2" />
            <p className="text-lg lg:text-2xl font-bold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>{data?.contacts.activeLeads || 0}</p>
            <p className="text-[10px] lg:text-xs text-navy/50 dark:text-white/50 font-inter">Active Leads</p>
          </Card>
          <Card className="!p-3 lg:!p-4 min-h-[80px]">
            <FileText size={16} className="text-gold mb-1 lg:mb-2" />
            <p className="text-lg lg:text-2xl font-bold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>{activeDeals}</p>
            <p className="text-[10px] lg:text-xs text-navy/50 dark:text-white/50 font-inter">Active Deals</p>
          </Card>
          <Card className="!p-3 lg:!p-4 min-h-[80px]">
            <Users size={16} className="text-gold mb-1 lg:mb-2" />
            <p className="text-lg lg:text-2xl font-bold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>{contactTotal}</p>
            <p className="text-[10px] lg:text-xs text-navy/50 dark:text-white/50 font-inter">Total Contacts</p>
          </Card>
        </div>

        {/* Income Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="!p-3 lg:!p-4 min-h-[80px]">
            <DollarSign size={16} className="text-green-500 mb-1 lg:mb-2" />
            <p className="text-lg lg:text-2xl font-bold text-navy dark:text-white truncate" style={{ fontFamily: BRAND.fonts.dmSerif }}>{formatMoney(data?.commissionYTD || 0)}</p>
            <p className="text-[10px] lg:text-xs text-navy/50 dark:text-white/50 font-inter">YTD Income (Net)</p>
          </Card>
          <Card className="!p-3 lg:!p-4 min-h-[80px]">
            <TrendingUp size={16} className="text-gold mb-1 lg:mb-2" />
            <p className="text-lg lg:text-2xl font-bold text-navy dark:text-white truncate" style={{ fontFamily: BRAND.fonts.dmSerif }}>{formatMoney(data?.commissionProjected || 0)}</p>
            <p className="text-[10px] lg:text-xs text-navy/50 dark:text-white/50 font-inter">Projected (Active)</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {/* Recent Activity */}
          <div className="xl:col-span-2">
            <Card className="!p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={18} className="text-gold" />
                <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70">Recent Activity</h3>
              </div>
              {data?.recentActivities && data.recentActivities.length > 0 ? (
                <div className="space-y-2">
                  {data.recentActivities.map(a => {
                    const Icon = ACTIVITY_ICONS[a.activity_type] || Clock;
                    const contactName = a.contacts ? `${a.contacts.first_name} ${a.contacts.last_name}` : '';
                    return (
                      <div key={a.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface dark:bg-navy/30">
                        <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon size={12} className="text-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-inter font-medium text-navy dark:text-white capitalize truncate">{a.activity_type}</p>
                            <span className="text-[10px] text-navy/30 dark:text-white/30 font-inter flex-shrink-0 whitespace-nowrap">
                              {new Date(a.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {contactName && <p className="text-xs text-navy/60 dark:text-white/60 font-inter truncate">{contactName}</p>}
                          <p className="text-xs text-navy/40 dark:text-white/40 font-inter truncate">{a.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-navy/50 dark:text-white/50 font-inter">No activities logged yet. Go to a contact and log your first activity.</p>
              )}
            </Card>
          </div>

          {/* Partner Performance */}
          <Card className="!p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Handshake size={18} className="text-gold" />
                <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70">Partners</h3>
              </div>
              <a href="/partners" className="text-xs text-gold font-montserrat hover:underline">View All</a>
            </div>
            {data?.partners && data.partners.length > 0 ? (
              <div className="space-y-3">
                {data.partners.map(p => (
                  <a key={p.id} href={`/partners/${p.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface dark:hover:bg-navy/30 transition-colors touch-row">
                    <div>
                      <p className="text-sm font-montserrat font-medium text-navy dark:text-white">{p.first_name} {p.last_name || ''}</p>
                      <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter">{p.total_leads_sent} leads, {p.total_closings} closings</p>
                    </div>
                    <span className="text-xs font-inter text-gold font-medium">${(p.total_revenue_generated || 0).toLocaleString()}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-navy/50 dark:text-white/50 font-inter">No referral partners yet. <a href="/partners" className="text-gold hover:underline">Add one</a></p>
            )}
          </Card>

          {/* Approval Queue */}
          <div className="md:col-span-2 xl:col-span-3">
            <Card variant="approval" className="!p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle size={22} className="text-gold" />
                  <h2 className="text-lg font-semibold font-montserrat text-navy dark:text-white">Approval Queue</h2>
                  {approvalCount > 0 && <Badge count={approvalCount} variant="gold" />}
                  {data?.approvalQueue.hasOverdue && <Badge variant="danger">Overdue</Badge>}
                </div>
                <a href="/approval-queue" className="text-sm text-gold font-montserrat font-medium hover:underline flex items-center gap-1">View All <ArrowRight size={14} /></a>
              </div>
              {approvalCount > 0 ? (
                <div className="space-y-2">
                  {data!.approvalQueue.items.slice(0, 3).map(item => (
                    <a key={item.id} href="/approval-queue" className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-navy/30 hover:bg-white dark:hover:bg-navy/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {item.is_overdue && <AlertTriangle size={14} className="text-red-500" />}
                        <div><p className="text-sm font-montserrat font-medium text-navy dark:text-white">{item.subject || formatItemType(item.item_type)}</p><p className="text-xs text-navy/40 dark:text-white/40 font-inter">{formatItemType(item.item_type)}</p></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.urgency_level === 1 ? 'danger' : item.urgency_level === 2 ? 'warning' : 'navy'}>P{item.urgency_level}</Badge>
                        <ChevronRight size={14} className="text-navy/30 dark:text-white/30" />
                      </div>
                    </a>
                  ))}
                </div>
              ) : <p className="text-sm text-navy/50 dark:text-white/50 font-inter">No items waiting for your review.</p>}
            </Card>
          </div>

          {/* Upcoming Closings */}
          {data?.pipeline.upcomingClosings && data.pipeline.upcomingClosings.length > 0 && (
            <div className="md:col-span-2 xl:col-span-3">
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={18} className="text-gold" />
                  <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70">Upcoming Closings (Next 30 Days)</h3>
                  <Badge count={data.pipeline.upcomingClosings.length} variant="gold" />
                </div>
                <div className="space-y-2">
                  {data.pipeline.upcomingClosings.map(tx => {
                    const days = tx.closing_date ? Math.floor((new Date(tx.closing_date + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                    return (
                      <a key={tx.id} href={`/transactions/${tx.id}`} className="flex items-center justify-between p-3 rounded-lg bg-surface dark:bg-navy/30 hover:bg-gold/5 transition-colors touch-row">
                        <div><p className="text-sm font-montserrat font-medium text-navy dark:text-white">{tx.property_address}</p><p className="text-xs text-navy/40 dark:text-white/40 font-inter">{tx.contract_price ? `$${tx.contract_price.toLocaleString()}` : 'Price TBD'}</p></div>
                        <div className="flex items-center gap-2">
                          {days !== null && days <= 7 && <AlertTriangle size={12} className="text-red-500" />}
                          <span className={`text-xs font-inter ${days !== null && days <= 7 ? 'text-red-500 font-semibold' : days !== null && days <= 14 ? 'text-gold' : 'text-navy/60 dark:text-white/60'}`}>{days !== null ? (days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`) : 'TBD'}</span>
                          <ChevronRight size={14} className="text-navy/30 dark:text-white/30" />
                        </div>
                      </a>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* Contact Intelligence */}
          <Card className="!p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} style={{ color: '#d3a971' }} />
              <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70">Contact Intelligence</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(19,34,54,0.1)" strokeWidth="4" />
                  <circle
                    cx="32" cy="32" r="28" fill="none" stroke="#d3a971" strokeWidth="4"
                    strokeDasharray={`${(intelStats.total > 0 ? intelStats.profiled / intelStats.total : 0) * 175.93} 175.93`}
                    strokeLinecap="round"
                    transform="rotate(-90 32 32)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-montserrat font-bold text-navy dark:text-white">{intelStats.profiled}/{intelStats.total}</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs text-navy/50 dark:text-white/50 font-inter">contacts profiled</p>
                {intelStats.ready > 0 && (
                  <p className="text-xs font-inter mt-1" style={{ color: '#d3a971' }}>{intelStats.ready} ready for analysis</p>
                )}
                {intelStats.ready > 0 && (
                  <button
                    type="button"
                    disabled={enrichingAll}
                    onClick={async () => {
                      setEnrichingAll(true);
                      try {
                        const res = await fetch('/api/ai/enrich-all', { method: 'POST' });
                        if (res.ok) {
                          const result = await res.json();
                          const count = result.enriched || result.results?.length || 0;
                          setIntelStats(prev => ({ ...prev, profiled: prev.profiled + count, ready: Math.max(0, prev.ready - count) }));
                        }
                      } catch { /* empty */ } finally {
                        setEnrichingAll(false);
                      }
                    }}
                    className="mt-2 px-3 py-1.5 rounded-full text-[11px] font-montserrat font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#d3a971' }}
                  >
                    {enrichingAll ? 'Analyzing...' : 'Run Analysis'}
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Security */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={18} className="text-green-500" />
              <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70">Security Status</h3>
            </div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /><p className="text-sm text-navy/70 dark:text-white/70 font-inter">All systems secure</p></div>
            <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-2">MFA active &middot; RLS enforced &middot; PII encrypted</p>
          </Card>

          {/* Intelligence */}
          {data?.intelligence.alerts && data.intelligence.alerts.length > 0 && (
            <div className="md:col-span-2">
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={18} className="text-gold" />
                  <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70">Intelligence</h3>
                </div>
                <div className="space-y-2">
                  {data.intelligence.alerts.map((alert, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface dark:bg-navy/30">
                      {alert.severity === 'urgent' ? <AlertTriangle size={14} className="text-red-500 mt-0.5" /> : <Zap size={14} className="text-blue-500 mt-0.5" />}
                      <div><p className="text-sm font-inter text-navy dark:text-white">{alert.message}</p><p className="text-[10px] text-navy/40 dark:text-white/40 font-inter mt-0.5">{alert.category.replace(/_/g, ' ')}</p></div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
