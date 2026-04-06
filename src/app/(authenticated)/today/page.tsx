'use client';

import { useToday, type TodayData } from '@/hooks/useToday';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createSMSLink } from '@/lib/sms';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/lib/format';
import {
  DollarSign, Briefcase, Calendar, AlertTriangle,
  MessageCircle, ChevronRight, Lightbulb,
  ArrowRight, CheckCircle, Clock3, Zap,
} from 'lucide-react';

export default function TodayPage() {
  const { data, isLoading, mutate } = useToday();
  const router = useRouter();
  const toast = useToast();

  async function handleMarkDone(contactId: string) {
    try {
      const res = await fetch(`/api/contacts/${contactId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'done', activity_type: 'text' }),
      });
      if (res.ok) {
        toast.success('Done', 'Follow-up marked complete. Next one auto-scheduled.');
        mutate();
      }
    } catch {
      toast.error('Error', 'Could not update follow-up.');
    }
  }

  async function handleSnooze(contactId: string) {
    try {
      const res = await fetch(`/api/contacts/${contactId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'snooze', snooze_days: 3 }),
      });
      if (res.ok) {
        toast.success('Snoozed', 'Moved to 3 days from now.');
        mutate();
      }
    } catch {
      toast.error('Error', 'Could not snooze follow-up.');
    }
  }

  if (isLoading) return <DashboardSkeleton />;

  if (!data) {
    return (
      <div className="p-4 pb-24 pt-4 max-w-7xl mx-auto animate-fade-in">
        <p className="text-navy/50 dark:text-white/50 font-inter text-sm">Unable to load today data. Try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 pt-4 lg:p-8 lg:pb-8 max-w-7xl mx-auto animate-fade-in">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-playfair font-bold text-navy dark:text-white">
          {data.greeting}
        </h1>
        <p className="text-sm font-inter text-navy/50 dark:text-white/50 mt-1">
          {data.date}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Active Deals"
          value={data.stats.active_deals}
          icon={<Briefcase size={16} />}
          accent
        />
        <StatCard
          label="Pipeline"
          value={formatMoney(data.stats.pipeline_value)}
          icon={<DollarSign size={16} />}
        />
        <StatCard
          label="Next Closing"
          value={data.stats.days_to_next_closing !== null ? `${data.stats.days_to_next_closing}d` : 'None'}
          icon={<Calendar size={16} />}
        />
        <StatCard
          label="Overdue"
          value={data.stats.overdue_followups}
          icon={<AlertTriangle size={16} />}
          accent={data.stats.overdue_followups > 0}
        />
      </div>

      {/* Money Moves */}
      {data.money_moves.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={18} className="text-gold" />
            <h2 className="font-montserrat font-semibold text-sm uppercase tracking-wider text-navy dark:text-white">
              Money Moves
            </h2>
          </div>
          <div className="space-y-3">
            {data.money_moves.map((move, i) => (
              <Card
                key={i}
                className={`!p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  move.urgency === 'high' ? '!border-l-4 !border-l-gold' : ''
                }`}
                onClick={() => {
                  if (move.transaction_id) router.push(`/transactions/${move.transaction_id}`);
                  else if (move.contact_id) router.push(`/contacts/${move.contact_id}`);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {move.urgency === 'high' && (
                        <span className="w-2 h-2 rounded-full bg-gold animate-pulse flex-shrink-0" />
                      )}
                      <p className="font-montserrat font-semibold text-sm text-navy dark:text-white truncate">
                        {move.title}
                      </p>
                    </div>
                    <p className="font-inter text-xs text-navy/60 dark:text-white/60 mt-1">
                      {move.subtitle}
                    </p>
                    <p className="font-inter text-xs text-gold mt-1 font-medium">
                      {move.action}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-navy/20 dark:text-white/20 flex-shrink-0 mt-1" />
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Nurture */}
      {data.nurture.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={18} className="text-green-500" />
            <h2 className="font-montserrat font-semibold text-sm uppercase tracking-wider text-navy dark:text-white">
              Nurture
            </h2>
          </div>
          <div className="space-y-3">
            {data.nurture.map((item, i) => (
              <Card key={i} className="!p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-montserrat font-bold text-gold">
                      {item.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-montserrat font-semibold text-sm text-navy dark:text-white truncate">
                        {item.name}
                      </p>
                      {item.disc_type && (
                        <span
                          className="text-[10px] font-montserrat font-bold"
                          style={{
                            color: item.disc_type === 'D' ? '#c0392b' : item.disc_type === 'I' ? '#d3a971' : item.disc_type === 'S' ? '#27ae60' : '#2980b9',
                          }}
                        >
                          {item.disc_type}
                        </span>
                      )}
                      {item.language === 'es' && (
                        <span className="text-[10px] font-montserrat font-semibold text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">ES</span>
                      )}
                    </div>
                    <p className="font-inter text-xs text-navy/50 dark:text-white/50 mt-0.5">
                      {item.reason}
                    </p>
                    <p className="font-inter text-xs text-navy/70 dark:text-white/70 mt-2 bg-surface dark:bg-navy/40 rounded-lg p-2.5 italic">
                      &ldquo;{item.suggested_message}&rdquo;
                    </p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <a
                        href={createSMSLink(item.phone, item.suggested_message)}
                        className="inline-flex items-center gap-1.5 bg-gold text-navy font-montserrat font-semibold text-xs rounded-xl px-3.5 py-2 active:scale-[0.97] transition-transform"
                      >
                        <MessageCircle size={13} />
                        Send
                      </a>
                      <button
                        type="button"
                        onClick={() => handleMarkDone(item.contact_id)}
                        className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-600 font-montserrat font-semibold text-xs rounded-xl px-3.5 py-2 active:scale-[0.97] transition-transform hover:bg-green-500/20"
                      >
                        <CheckCircle size={13} />
                        Done
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSnooze(item.contact_id)}
                        className="inline-flex items-center gap-1.5 text-navy/40 dark:text-white/40 font-montserrat font-medium text-xs rounded-xl px-3 py-2 active:scale-[0.97] transition-transform hover:bg-navy/5"
                      >
                        <Clock3 size={13} />
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Grow */}
      {data.grow.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={18} className="text-blue-500" />
            <h2 className="font-montserrat font-semibold text-sm uppercase tracking-wider text-navy dark:text-white">
              Grow
            </h2>
          </div>
          <div className="space-y-3">
            {data.grow.map((item, i) => (
              <Card key={i} className="!p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    {item.type === 'milestone' ? (
                      <Zap size={14} className="text-blue-500" />
                    ) : (
                      <Lightbulb size={14} className="text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-montserrat font-semibold text-sm text-navy dark:text-white">
                      {item.title}
                    </p>
                    <p className="font-inter text-xs text-navy/60 dark:text-white/60 mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight size={18} className="text-navy/30 dark:text-white/30" />
          <h2 className="font-montserrat font-semibold text-sm uppercase tracking-wider text-navy dark:text-white">
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => router.push('/contacts')}
            className="rounded-2xl bg-white dark:bg-dark-card border border-gold/15 p-4 text-left active:scale-[0.97] transition-transform hover:shadow-md"
          >
            <p className="font-montserrat font-semibold text-sm text-navy dark:text-white">View Contacts</p>
            <p className="font-inter text-xs text-navy/50 dark:text-white/50 mt-0.5">Manage your people</p>
          </button>
          <button
            type="button"
            onClick={() => router.push('/transactions')}
            className="rounded-2xl bg-white dark:bg-dark-card border border-gold/15 p-4 text-left active:scale-[0.97] transition-transform hover:shadow-md"
          >
            <p className="font-montserrat font-semibold text-sm text-navy dark:text-white">View Deals</p>
            <p className="font-inter text-xs text-navy/50 dark:text-white/50 mt-0.5">Track your pipeline</p>
          </button>
        </div>
      </section>
    </div>
  );
}
