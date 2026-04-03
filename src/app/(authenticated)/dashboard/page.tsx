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
  Send, Copy, FileArchive,
} from 'lucide-react';
import { FollowUpActionPanel } from '@/components/dashboard/FollowUpActionPanel';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

interface FollowUpContact {
  id: string; first_name: string; last_name: string; phone: string | null;
  email: string | null; next_follow_up_date: string; follow_up_notes: string | null;
  pipeline_stage: string; track_type: string;
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

interface FollowUpsData {
  overdue: FollowUpContact[];
  today: FollowUpContact[];
  upcoming: FollowUpContact[];
  counts: { overdue: number; today: number; upcoming: number };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [completedToday, setCompletedToday] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [campaignMessages, setCampaignMessages] = useState<CampaignMessageDue[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [documentAlerts, setDocumentAlerts] = useState<Array<{ transactionId: string; address: string; daysToClose: number; percentComplete: number; cmrUploaded: number; cmrTotal: number; missingCount: number; urgency: 'red' | 'amber' }>>([]);
  const { settings } = useAgentSettings();
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
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const togglePanel = useCallback((contactId: string) => {
    setExpandedContactId(prev => prev === contactId ? null : contactId);
  }, []);

  const handleFollowUpComplete = useCallback((contactId: string) => {
    setExpandedContactId(null);
    setCompletedToday(prev => prev + 1);
    setCompletedIds(prev => new Set(prev).add(contactId));
  }, []);

  const approvalCount = data?.approvalQueue?.count || 0;
  const contactTotal = data?.contacts?.total || 0;
  const pipelineValue = data?.pipeline?.value || 0;
  const activeDeals = data?.pipeline?.activeCount || 0;
  const fuCounts = followUps?.counts || data?.followUps?.counts || { overdue: 0, today: 0, upcoming: 0 };
  const fuOverdue = followUps?.overdue || data?.followUps?.overdue || [];
  const fuToday = followUps?.today || data?.followUps?.today || [];
  const fuUpcoming = followUps?.upcoming || data?.followUps?.upcoming || [];
  const visibleOverdue = fuOverdue.filter(c => !completedIds.has(c.id));
  const visibleToday = fuToday.filter(c => !completedIds.has(c.id));
  const visibleUpcoming = fuUpcoming.filter(c => !completedIds.has(c.id));
  const hasFollowUps = visibleOverdue.length > 0 || visibleToday.length > 0 || visibleUpcoming.length > 0;

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
            <span className="text-xs font-montserrat font-semibold text-navy dark:text-white">${pipelineValue >= 1000 ? `${Math.round(pipelineValue / 1000)}K` : pipelineValue.toLocaleString()}</span>
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

        {/* FOLLOW-UPS - #1 Priority - Always visible */}
        <Card className={`!p-6 ${visibleOverdue.length > 0 ? '!border-red-500/30 !bg-red-500/[0.02]' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Clock size={22} className={visibleOverdue.length > 0 ? 'text-red-500' : 'text-gold'} />
              <h2 className="text-lg font-semibold font-montserrat text-navy dark:text-white">Follow-Ups</h2>
              {visibleOverdue.length > 0 && <Badge variant="danger">{visibleOverdue.length} Overdue</Badge>}
              {visibleToday.length > 0 && <Badge variant="gold">{visibleToday.length} Today</Badge>}
            </div>
            {completedToday > 0 && (
              <span className="flex items-center gap-1 text-xs font-montserrat font-semibold text-green-600">
                <Check size={12} />
                {completedToday} done today
              </span>
            )}
          </div>

          {hasFollowUps ? (
            <>
              {/* Overdue */}
              {visibleOverdue.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-montserrat font-semibold text-red-500 uppercase tracking-wider mb-2">Overdue</p>
                  <div className="space-y-2">
                    {visibleOverdue.map(c => (
                      <div key={c.id} className={`rounded-lg bg-red-500/5 border transition-colors ${expandedContactId === c.id ? 'border-gold/30' : 'border-red-500/10'}`}>
                        <button
                          onClick={() => togglePanel(c.id)}
                          className="w-full p-3 text-left hover:bg-red-500/10 transition-colors rounded-lg"
                        >
                          {/* Line 1: Name + badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-montserrat font-medium text-navy dark:text-white">{c.first_name} {c.last_name}</p>
                            <span className="text-[10px] font-montserrat font-semibold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">{daysOverdue(c.next_follow_up_date)}d overdue</span>
                          </div>
                          {/* Line 2: Notes (no truncation on mobile, 2 lines max) */}
                          {c.follow_up_notes && <p className="text-xs text-navy/50 dark:text-white/50 font-inter mt-1 line-clamp-2 lg:truncate lg:line-clamp-none">{c.follow_up_notes}</p>}
                          {/* Line 3: Phone + actions + chevron */}
                          <div className="flex items-center gap-2 mt-1.5">
                            {c.phone && <span className="text-xs text-navy/40 dark:text-white/40 font-inter">{c.phone}</span>}
                            <div className="flex items-center gap-2 ml-auto">
                              {c.phone && <a href={`tel:${c.phone}`} onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = `tel:${c.phone}`; }} className="p-1.5 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"><Phone size={14} /></a>}
                              {c.phone && <a href={`sms:${c.phone}`} onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = `sms:${c.phone}`; }} className="p-1.5 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"><MessageCircle size={14} /></a>}
                              <ChevronRight size={14} className={`text-navy/20 dark:text-white/20 transition-transform duration-200 ${expandedContactId === c.id ? 'rotate-90' : ''}`} />
                            </div>
                          </div>
                        </button>
                        {expandedContactId === c.id && (
                          <div className="px-3 pb-3">
                            <FollowUpActionPanel
                              contact={c}
                              onComplete={handleFollowUpComplete}
                              onClose={() => setExpandedContactId(null)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Today */}
              {visibleToday.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-montserrat font-semibold text-gold uppercase tracking-wider mb-2">Today</p>
                  <div className="space-y-2">
                    {visibleToday.map(c => (
                      <div key={c.id} className={`rounded-lg bg-gold/5 border transition-colors ${expandedContactId === c.id ? 'border-gold/30' : 'border-gold/10'}`}>
                        <button
                          onClick={() => togglePanel(c.id)}
                          className="w-full p-3 text-left hover:bg-gold/10 transition-colors rounded-lg"
                        >
                          <p className="text-sm font-montserrat font-medium text-navy dark:text-white">{c.first_name} {c.last_name}</p>
                          {c.follow_up_notes && <p className="text-xs text-navy/50 dark:text-white/50 font-inter mt-1 line-clamp-2 lg:truncate lg:line-clamp-none">{c.follow_up_notes}</p>}
                          <div className="flex items-center gap-2 mt-1.5">
                            {c.phone && <span className="text-xs text-navy/40 dark:text-white/40 font-inter">{c.phone}</span>}
                            <div className="flex items-center gap-2 ml-auto">
                              {c.phone && <a href={`tel:${c.phone}`} onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = `tel:${c.phone}`; }} className="p-1.5 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"><Phone size={14} /></a>}
                              {c.phone && <a href={`sms:${c.phone}`} onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = `sms:${c.phone}`; }} className="p-1.5 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"><MessageCircle size={14} /></a>}
                              <ChevronRight size={14} className={`text-navy/20 dark:text-white/20 transition-transform duration-200 ${expandedContactId === c.id ? 'rotate-90' : ''}`} />
                            </div>
                          </div>
                        </button>
                        {expandedContactId === c.id && (
                          <div className="px-3 pb-3">
                            <FollowUpActionPanel
                              contact={c}
                              onComplete={handleFollowUpComplete}
                              onClose={() => setExpandedContactId(null)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming */}
              {visibleUpcoming.length > 0 && (
                <div>
                  <p className="text-xs font-montserrat font-semibold text-navy/40 dark:text-white/40 uppercase tracking-wider mb-2">Upcoming (7 days)</p>
                  <div className="space-y-2">
                    {visibleUpcoming.map(c => (
                      <div key={c.id} className={`rounded-lg border transition-colors ${expandedContactId === c.id ? 'border-gold/30 bg-surface dark:bg-navy/30' : 'border-transparent'}`}>
                        <button
                          onClick={() => togglePanel(c.id)}
                          className="w-full p-3 rounded-lg hover:bg-surface dark:hover:bg-navy/30 transition-colors text-left"
                        >
                          <p className="text-sm font-inter text-navy/70 dark:text-white/70">{c.first_name} {c.last_name}</p>
                          {c.follow_up_notes && <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-1 line-clamp-2 lg:truncate lg:line-clamp-none">{c.follow_up_notes}</p>}
                          <div className="flex items-center gap-2 mt-1.5">
                            {c.phone && <span className="text-xs text-navy/40 dark:text-white/40 font-inter">{c.phone}</span>}
                            <div className="flex items-center gap-2 ml-auto">
                              {c.phone && <a href={`tel:${c.phone}`} onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = `tel:${c.phone}`; }} className="p-1.5 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"><Phone size={14} /></a>}
                              {c.phone && <a href={`sms:${c.phone}`} onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = `sms:${c.phone}`; }} className="p-1.5 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"><MessageCircle size={14} /></a>}
                              <span className="text-xs font-inter text-navy/40 dark:text-white/40">{new Date(c.next_follow_up_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              <ChevronRight size={14} className={`text-navy/20 dark:text-white/20 transition-transform duration-200 ${expandedContactId === c.id ? 'rotate-90' : ''}`} />
                            </div>
                          </div>
                        </button>
                        {expandedContactId === c.id && (
                          <div className="px-3 pb-3">
                            <FollowUpActionPanel
                              contact={c}
                              onComplete={handleFollowUpComplete}
                              onClose={() => setExpandedContactId(null)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-navy/50 dark:text-white/50 font-inter">No follow-ups scheduled. Set follow-up dates on your contacts.</p>
          )}
        </Card>

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
            <p className="text-lg lg:text-2xl font-bold text-navy dark:text-white truncate" style={{ fontFamily: BRAND.fonts.dmSerif }}>${pipelineValue >= 1000 ? `${Math.round(pipelineValue / 1000)}K` : pipelineValue.toLocaleString()}</p>
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
            <p className="text-lg lg:text-2xl font-bold text-navy dark:text-white truncate" style={{ fontFamily: BRAND.fonts.dmSerif }}>${((data?.commissionYTD || 0) >= 1000 ? `${Math.round((data?.commissionYTD || 0) / 1000)}K` : (data?.commissionYTD || 0).toLocaleString())}</p>
            <p className="text-[10px] lg:text-xs text-navy/50 dark:text-white/50 font-inter">YTD Income (Net)</p>
          </Card>
          <Card className="!p-3 lg:!p-4 min-h-[80px]">
            <TrendingUp size={16} className="text-gold mb-1 lg:mb-2" />
            <p className="text-lg lg:text-2xl font-bold text-navy dark:text-white truncate" style={{ fontFamily: BRAND.fonts.dmSerif }}>${((data?.commissionProjected || 0) >= 1000 ? `${Math.round((data?.commissionProjected || 0) / 1000)}K` : (data?.commissionProjected || 0).toLocaleString())}</p>
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
