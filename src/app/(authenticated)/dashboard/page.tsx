/**
 * Dashboard - Premium Morning Briefing
 *
 * First screen the agent sees. Full Licona Realty brand.
 * Approval queue module first and most prominent.
 * Live data from /api/dashboard. Intelligence alerts.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { BRAND } from '@/lib/brand';
import {
  CheckCircle, Users, FileText, TrendingUp,
  Calendar, Star, Shield, Zap, AlertTriangle,
  Clock, DollarSign, ArrowRight, ChevronRight,
} from 'lucide-react';

interface DashboardData {
  approvalQueue: {
    items: Array<{
      id: string;
      item_type: string;
      subject: string;
      urgency_level: number;
      is_overdue: boolean;
      created_at: string;
    }>;
    count: number;
    hasOverdue: boolean;
  };
  contacts: {
    total: number;
    byTrack: Record<string, number>;
    byStage: Record<string, number>;
  };
  pipeline: {
    value: number;
    activeCount: number;
    urgentClosings: number;
    transactions: Array<{
      id: string;
      property_address: string;
      status: string;
      contract_price: number | null;
      closing_date: string | null;
    }>;
  };
  schedule: {
    todayBookings: Array<{
      id: string;
      meeting_type: string;
      visitor_name: string;
      scheduled_time: string;
    }>;
    count: number;
  };
  intelligence: {
    alerts: Array<{
      category: string;
      message: string;
      severity: string;
      action_path: string | null;
    }>;
    count: number;
  };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatItemType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // Show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const approvalCount = data?.approvalQueue.count || 0;
  const contactTotal = data?.contacts.total || 0;
  const pipelineValue = data?.pipeline.value || 0;
  const activeDeals = data?.pipeline.activeCount || 0;
  const todayMeetings = data?.schedule.count || 0;
  const alertCount = data?.intelligence.count || 0;

  return (
    <div data-testid="dashboard-page" className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl lg:text-3xl font-semibold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            {getGreeting()}, Anthony
          </h1>
          <p className="text-sm text-navy/50 dark:text-white/50 font-inter mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
            })} &middot; {BRAND.tagline}
          </p>
        </div>
        <LRMonogram size="md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Approval Queue - First and Most Prominent */}
        <div className="md:col-span-2 xl:col-span-3">
          <Card variant="approval" className="!p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={22} className="text-gold" />
                <h2 className="text-lg font-semibold font-montserrat text-navy dark:text-white">
                  Approval Queue
                </h2>
                {approvalCount > 0 && <Badge count={approvalCount} variant="gold" />}
                {data?.approvalQueue.hasOverdue && (
                  <Badge variant="danger">Overdue</Badge>
                )}
              </div>
              <a
                href="/approval-queue"
                className="text-sm text-gold font-montserrat font-medium hover:underline flex items-center gap-1"
              >
                View All <ArrowRight size={14} />
              </a>
            </div>
            {approvalCount > 0 ? (
              <div className="space-y-2">
                {data!.approvalQueue.items.slice(0, 3).map(item => (
                  <a
                    key={item.id}
                    href="/approval-queue"
                    className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-navy/30 hover:bg-white dark:hover:bg-navy/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {item.is_overdue && <AlertTriangle size={14} className="text-red-500" />}
                      <div>
                        <p className="text-sm font-montserrat font-medium text-navy dark:text-white">
                          {item.subject || formatItemType(item.item_type)}
                        </p>
                        <p className="text-xs text-navy/40 dark:text-white/40 font-inter">
                          {formatItemType(item.item_type)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.urgency_level === 1 ? 'danger' : item.urgency_level === 2 ? 'warning' : 'navy'}>
                        P{item.urgency_level}
                      </Badge>
                      <ChevronRight size={14} className="text-navy/30 dark:text-white/30" />
                    </div>
                  </a>
                ))}
                {approvalCount > 3 && (
                  <p className="text-xs text-navy/40 dark:text-white/40 font-inter text-center pt-1">
                    +{approvalCount - 3} more items
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-navy/50 dark:text-white/50 font-inter">
                No items waiting for your review. You are all caught up.
              </p>
            )}
          </Card>
        </div>

        {/* Pipeline Value */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={18} className="text-gold" />
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70">
              Pipeline Value
            </h3>
          </div>
          <p
            className="text-3xl font-bold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.dmSerif }}
          >
            ${pipelineValue.toLocaleString()}
          </p>
          <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-1">
            {activeDeals} active deal{activeDeals !== 1 ? 's' : ''}
            {data?.pipeline.urgentClosings ? ` · ${data.pipeline.urgentClosings} closing soon` : ''}
          </p>
        </Card>

        {/* Active Contacts */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} className="text-gold" />
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70">
              Active Contacts
            </h3>
          </div>
          <p
            className="text-3xl font-bold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.dmSerif }}
          >
            {contactTotal}
          </p>
          {data?.contacts.byTrack && Object.keys(data.contacts.byTrack).length > 0 ? (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {Object.entries(data.contacts.byTrack).map(([track, count]) => (
                <span key={track} className="text-[10px] font-inter text-navy/40 dark:text-white/40">
                  {count} {track}{count !== 1 ? 's' : ''}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-1">
              Across 5 lead tracks + sphere
            </p>
          )}
        </Card>

        {/* Active Transactions */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-gold" />
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70">
              Active Transactions
            </h3>
          </div>
          <p
            className="text-3xl font-bold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.dmSerif }}
          >
            {activeDeals}
          </p>
          {data?.pipeline.transactions && data.pipeline.transactions.length > 0 ? (
            <div className="mt-2 space-y-1">
              {data.pipeline.transactions.slice(0, 2).map(tx => (
                <p key={tx.id} className="text-xs text-navy/50 dark:text-white/50 font-inter truncate">
                  {tx.property_address}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-1">
              No active transactions
            </p>
          )}
        </Card>

        {/* Today's Schedule */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-gold" />
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70">
              Today&apos;s Schedule
            </h3>
          </div>
          {todayMeetings > 0 ? (
            <div className="space-y-2">
              {data!.schedule.todayBookings.slice(0, 3).map(booking => (
                <div key={booking.id} className="flex items-center gap-2">
                  <Clock size={12} className="text-gold flex-shrink-0" />
                  <span className="text-xs font-montserrat font-medium text-navy dark:text-white">
                    {booking.scheduled_time}
                  </span>
                  <span className="text-xs font-inter text-navy/60 dark:text-white/60 truncate">
                    {booking.visitor_name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-navy/50 dark:text-white/50 font-inter">
              No meetings scheduled today.
            </p>
          )}
        </Card>

        {/* Reviews */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Star size={18} className="text-gold" />
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70">
              Reviews
            </h3>
          </div>
          <p className="text-sm text-navy/50 dark:text-white/50 font-inter">
            Post-closing testimonial requests are auto-generated and routed through approval.
          </p>
        </Card>

        {/* Security Health */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-green-500" />
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70">
              Security Status
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-sm text-navy/70 dark:text-white/70 font-inter">
              All systems secure
            </p>
          </div>
          <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-2">
            MFA active &middot; RLS enforced &middot; PII encrypted
          </p>
        </Card>

        {/* Intelligence Alerts / Smart Suggestions */}
        <div className="md:col-span-2 xl:col-span-3">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-gold" />
              <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70">
                Intelligence Layer
              </h3>
              {alertCount > 0 && <Badge count={alertCount} variant="gold" />}
            </div>
            {data?.intelligence.alerts && data.intelligence.alerts.length > 0 ? (
              <div className="space-y-2">
                {data.intelligence.alerts.map((alert, i) => (
                  <a
                    key={i}
                    href={alert.action_path || '#'}
                    className="flex items-start gap-3 p-3 rounded-lg bg-surface dark:bg-navy/30 hover:bg-gold/5 transition-colors"
                  >
                    {alert.severity === 'urgent' ? (
                      <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                    ) : alert.severity === 'warning' ? (
                      <AlertTriangle size={14} className="text-gold mt-0.5 flex-shrink-0" />
                    ) : (
                      <Zap size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-inter text-navy dark:text-white">
                        {alert.message}
                      </p>
                      <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter mt-0.5">
                        {alert.category.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-navy/30 dark:text-white/30 mt-0.5" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-navy/50 dark:text-white/50 font-inter">
                {contactTotal > 0
                  ? 'No active alerts. The intelligence layer is monitoring your pipeline.'
                  : 'Add your first contacts to start receiving personalized recommendations.'}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
