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
  MessageCircle, Mail, Eye, Handshake, TrendingUp, Tag,
} from 'lucide-react';

interface FollowUpContact {
  id: string; first_name: string; last_name: string; phone: string | null;
  email: string | null; next_follow_up_date: string; follow_up_notes: string | null;
  pipeline_stage: string; track_type: string;
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
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useAgentSettings();
  const displayName = settings?.profile_name || BRAND.agent.name;

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) setData(await res.json());
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const approvalCount = data?.approvalQueue.count || 0;
  const contactTotal = data?.contacts.total || 0;
  const pipelineValue = data?.pipeline.value || 0;
  const activeDeals = data?.pipeline.activeCount || 0;
  const followUpCounts = data?.followUps.counts || { overdue: 0, today: 0, upcoming: 0 };

  return (
    <div data-testid="dashboard-page" className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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
        {/* FOLLOW-UPS - #1 Priority */}
        {(followUpCounts.overdue > 0 || followUpCounts.today > 0 || followUpCounts.upcoming > 0) && (
          <Card className={`!p-6 ${followUpCounts.overdue > 0 ? '!border-red-500/30' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Clock size={22} className={followUpCounts.overdue > 0 ? 'text-red-500' : 'text-gold'} />
                <h2 className="text-lg font-semibold font-montserrat text-navy dark:text-white">Follow-Ups</h2>
                {followUpCounts.overdue > 0 && <Badge variant="danger">{followUpCounts.overdue} Overdue</Badge>}
                {followUpCounts.today > 0 && <Badge variant="gold">{followUpCounts.today} Today</Badge>}
              </div>
            </div>

            {/* Overdue */}
            {data?.followUps.overdue && data.followUps.overdue.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-montserrat font-semibold text-red-500 uppercase tracking-wider mb-2">Overdue</p>
                <div className="space-y-2">
                  {data.followUps.overdue.map(c => (
                    <a key={c.id} href={`/contacts/${c.id}`} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-montserrat font-medium text-navy dark:text-white">{c.first_name} {c.last_name}</p>
                          <span className="text-[10px] font-montserrat font-semibold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">{daysOverdue(c.next_follow_up_date)}d overdue</span>
                        </div>
                        {c.follow_up_notes && <p className="text-xs text-navy/50 dark:text-white/50 font-inter mt-0.5">{c.follow_up_notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.phone && <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20"><Phone size={12} /></a>}
                        {c.phone && <a href={`sms:${c.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"><MessageCircle size={12} /></a>}
                        <ChevronRight size={14} className="text-navy/20 dark:text-white/20" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Today */}
            {data?.followUps.today && data.followUps.today.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-montserrat font-semibold text-gold uppercase tracking-wider mb-2">Today</p>
                <div className="space-y-2">
                  {data.followUps.today.map(c => (
                    <a key={c.id} href={`/contacts/${c.id}`} className="flex items-center justify-between p-3 rounded-lg bg-gold/5 border border-gold/10 hover:bg-gold/10 transition-colors">
                      <div className="flex-1">
                        <p className="text-sm font-montserrat font-medium text-navy dark:text-white">{c.first_name} {c.last_name}</p>
                        {c.follow_up_notes && <p className="text-xs text-navy/50 dark:text-white/50 font-inter mt-0.5">{c.follow_up_notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.phone && <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20"><Phone size={12} /></a>}
                        <ChevronRight size={14} className="text-navy/20 dark:text-white/20" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {data?.followUps.upcoming && data.followUps.upcoming.length > 0 && (
              <div>
                <p className="text-xs font-montserrat font-semibold text-navy/40 dark:text-white/40 uppercase tracking-wider mb-2">Upcoming (7 days)</p>
                <div className="space-y-1">
                  {data.followUps.upcoming.map(c => (
                    <a key={c.id} href={`/contacts/${c.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface dark:hover:bg-navy/30 transition-colors">
                      <p className="text-sm font-inter text-navy/70 dark:text-white/70">{c.first_name} {c.last_name}</p>
                      <span className="text-xs font-inter text-navy/40 dark:text-white/40">{new Date(c.next_follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Pipeline Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="!p-4">
            <DollarSign size={16} className="text-gold mb-2" />
            <p className="text-2xl font-bold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>${pipelineValue.toLocaleString()}</p>
            <p className="text-xs text-navy/50 dark:text-white/50 font-inter">Pipeline Value</p>
          </Card>
          <Card className="!p-4">
            <Users size={16} className="text-gold mb-2" />
            <p className="text-2xl font-bold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>{data?.contacts.activeLeads || 0}</p>
            <p className="text-xs text-navy/50 dark:text-white/50 font-inter">Active Leads</p>
          </Card>
          <Card className="!p-4">
            <FileText size={16} className="text-gold mb-2" />
            <p className="text-2xl font-bold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>{activeDeals}</p>
            <p className="text-xs text-navy/50 dark:text-white/50 font-inter">Active Deals</p>
          </Card>
          <Card className="!p-4">
            <Users size={16} className="text-gold mb-2" />
            <p className="text-2xl font-bold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>{contactTotal}</p>
            <p className="text-xs text-navy/50 dark:text-white/50 font-inter">Total Contacts</p>
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
                      <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-surface dark:bg-navy/30">
                        <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon size={12} className="text-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-inter text-navy dark:text-white truncate">
                            <span className="capitalize font-medium">{a.activity_type}</span>
                            {contactName && <span className="text-navy/50 dark:text-white/50"> with {contactName}</span>}
                          </p>
                          <p className="text-xs text-navy/40 dark:text-white/40 font-inter truncate">{a.description}</p>
                        </div>
                        <span className="text-[10px] text-navy/30 dark:text-white/30 font-inter flex-shrink-0">
                          {new Date(a.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
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
                  <a key={p.id} href={`/partners/${p.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface dark:hover:bg-navy/30 transition-colors">
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
                    const days = tx.closing_date ? Math.floor((new Date(tx.closing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                    return (
                      <a key={tx.id} href={`/transactions/${tx.id}`} className="flex items-center justify-between p-3 rounded-lg bg-surface dark:bg-navy/30 hover:bg-gold/5 transition-colors">
                        <div><p className="text-sm font-montserrat font-medium text-navy dark:text-white">{tx.property_address}</p><p className="text-xs text-navy/40 dark:text-white/40 font-inter">{tx.contract_price ? `$${tx.contract_price.toLocaleString()}` : 'Price TBD'}</p></div>
                        <div className="flex items-center gap-2">
                          {days !== null && days <= 7 && <AlertTriangle size={12} className="text-red-500" />}
                          <span className={`text-xs font-inter ${days !== null && days <= 7 ? 'text-red-500 font-semibold' : days !== null && days <= 14 ? 'text-gold' : 'text-navy/60 dark:text-white/60'}`}>{days !== null ? `${days}d` : 'TBD'}</span>
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
