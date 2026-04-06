'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToday, type TodayData } from '@/hooks/useToday';
import { createSMSLink, createCallLink } from '@/lib/sms';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  Zap, ChevronRight, MessageCircle, Phone, Clock3,
  CheckCircle, Flame, ChevronDown, ChevronUp,
} from 'lucide-react';

// Animated count-up hook
function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current && target === 0) return;
    ref.current = true;
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// Commission Ring SVG
function CommissionRing({ data }: { data: TodayData['commission'] }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimate(true), 100); return () => clearTimeout(t); }, []);

  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const earnedPct = Math.min(data.ytd_earned / data.goal, 1);
  const pendingPct = Math.min((data.ytd_earned + data.pending) / data.goal, 1) - earnedPct;

  const earnedOffset = circumference - earnedPct * circumference;
  const pendingDash = pendingPct * circumference;

  const earnedDisplay = useCountUp(data.ytd_earned);
  const pendingDisplay = useCountUp(data.pending);

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(211,169,113,0.15)"
            strokeWidth={strokeWidth}
          />
          {/* Pending (dashed) */}
          {data.pending > 0 && (
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke="#d3a971"
              strokeWidth={strokeWidth}
              strokeDasharray={`4 4`}
              strokeDashoffset={animate ? circumference - (earnedPct + pendingPct) * circumference : circumference}
              strokeLinecap="round"
              opacity={0.35}
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          )}
          {/* Earned (solid) */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="#d3a971"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={animate ? earnedOffset : circumference}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-dm-serif, serif)' }}>
            ${earnedDisplay.toLocaleString()}
          </span>
          <span className="text-[11px] text-white/40 font-inter">of $63,000</span>
          {data.pending > 0 && (
            <span className="text-[11px] text-[#d3a971]/60 font-inter mt-0.5">
              ${pendingDisplay.toLocaleString()} pending
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-white/60 font-inter mt-3">
        {data.deals_closed} of {data.deals_goal} deals
      </p>

      {/* Deal dots */}
      <div className="flex items-center gap-1.5 mt-2">
        {data.deal_dots.map((dot, i) => (
          <span
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 ${
              dot === 'closed'
                ? 'bg-[#d3a971] border-[#d3a971]'
                : dot === 'active'
                  ? 'bg-transparent border-[#d3a971] animate-pulse'
                  : 'bg-transparent border-[#1a2d42]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Skeleton components
function RingSkeleton() {
  return (
    <div className="flex flex-col items-center py-4">
      <div className="w-40 h-40 rounded-full border-[10px] border-[rgba(211,169,113,0.1)] animate-pulse" />
      <div className="w-20 h-3 bg-white/5 rounded mt-3 animate-pulse" />
      <div className="flex gap-1.5 mt-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-3.5 h-3.5 rounded-full bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function PowerMoveSkeleton() {
  return (
    <div className="rounded-2xl p-4 border-l-4 border-l-[#d3a971] animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.05)', boxShadow: '0 0 20px rgba(211,169,113,0.1), 0 2px 8px rgba(0,0,0,0.12)' }}>
      <div className="w-32 h-3 bg-[#d3a971]/20 rounded mb-3" />
      <div className="w-full h-4 bg-white/10 rounded mb-2" />
      <div className="w-3/4 h-4 bg-white/10 rounded mb-4" />
      <div className="w-full h-10 bg-[#d3a971]/20 rounded-xl" />
    </div>
  );
}

function NurtureCardSkeleton() {
  return (
    <div className="rounded-2xl p-3 border-l-4 border-l-white/10 animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-white/10" />
        <div className="flex-1">
          <div className="w-24 h-3 bg-white/10 rounded mb-2" />
          <div className="w-32 h-2 bg-white/5 rounded mb-2" />
          <div className="w-full h-12 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}

// Nurture card with inline Done/Snooze/Skip
function NurtureCardItem({
  card,
  index,
  onDismiss,
}: {
  card: TodayData['nurture'][0];
  index: number;
  onDismiss: (contactId: string) => void;
}) {
  const toast = useToast();
  const [expanded, setExpanded] = useState<'done' | 'snooze' | 'skip' | null>(null);
  const [note, setNote] = useState('');
  const [activityType, setActivityType] = useState<string>('text');
  const [exiting, setExiting] = useState(false);
  const [saving, setSaving] = useState(false);

  const borderColor = card.reason_type === 'overdue' ? '#d3a971' : card.reason_type === 'birthday' ? '#22c55e' : '#1a2d42';

  function dismiss() {
    setExiting(true);
    setTimeout(() => onDismiss(card.contact_id), 250);
  }

  async function handleDone() {
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${card.contact_id}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'done', activity_type: activityType, note: note.trim() || undefined }),
      });
      if (res.ok) {
        toast.success('Done', 'Follow-up complete. Next one auto-scheduled.');
        dismiss();
      }
    } catch {
      toast.error('Error', 'Could not update follow-up.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSnooze(days: number) {
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${card.contact_id}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'snooze', snooze_days: days }),
      });
      if (res.ok) {
        toast.success('Snoozed', `Moved to ${days} day${days !== 1 ? 's' : ''} from now.`);
        dismiss();
      }
    } catch {
      toast.error('Error', 'Could not snooze follow-up.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip(remove: boolean) {
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${card.contact_id}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(remove ? { action: 'remove' } : { action: 'snooze', snooze_days: 30 }),
      });
      if (res.ok) {
        toast.success(remove ? 'Removed' : 'Skipped', remove ? 'Follow-up removed.' : 'Skipped 30 days.');
        dismiss();
      }
    } catch {
      toast.error('Error', 'Could not update.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="transition-all duration-200"
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(100%)' : 'translateY(0)',
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div
        className="rounded-2xl p-3 border-l-4 transition-shadow"
        style={{
          borderLeftColor: borderColor,
          backgroundColor: 'rgba(255,255,255,0.05)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#132236] flex items-center justify-center flex-shrink-0 border border-[#d3a971]/20">
            <span className="text-[10px] font-montserrat font-bold text-[#d3a971]">
              {card.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-montserrat font-semibold text-sm text-white truncate">
                {card.name}
              </p>
              {card.disc_type && (
                <span
                  className="text-[10px] font-montserrat font-bold"
                  style={{
                    color: card.disc_type === 'D' ? '#c0392b' : card.disc_type === 'I' ? '#d3a971' : card.disc_type === 'S' ? '#27ae60' : '#2980b9',
                  }}
                >
                  {card.disc_type}
                </span>
              )}
              {(card.language === 'es' || card.language === 'spanish') && (
                <span className="text-[10px] font-montserrat font-semibold text-[#d3a971] bg-[#d3a971]/10 px-1.5 py-0.5 rounded-full">ES</span>
              )}
            </div>
            <p className="font-inter text-xs text-white/50 mt-0.5">{card.reason}</p>
            <p className="font-inter text-xs text-white/70 mt-2 bg-[#132236]/60 rounded-lg p-2.5 italic">
              &ldquo;{card.suggested_message}&rdquo;
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <a
                href={createSMSLink(card.phone, card.suggested_message)}
                className="inline-flex items-center gap-1.5 bg-[#d3a971] text-[#132236] font-montserrat font-semibold text-xs rounded-xl px-3.5 py-2 active:scale-95 transition-transform"
              >
                <MessageCircle size={13} />
                Send
              </a>
              <button
                type="button"
                onClick={() => setExpanded(expanded === 'done' ? null : 'done')}
                className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-500 font-montserrat font-semibold text-xs rounded-xl px-3 py-2 active:scale-95 transition-transform"
              >
                <CheckCircle size={13} />
                Done
              </button>
              <button
                type="button"
                onClick={() => setExpanded(expanded === 'snooze' ? null : 'snooze')}
                className="inline-flex items-center gap-1.5 text-white/40 font-montserrat font-medium text-xs rounded-xl px-2.5 py-2 active:scale-95 transition-transform hover:bg-white/5"
              >
                <Clock3 size={13} />
                Snooze
              </button>
              <button
                type="button"
                onClick={() => setExpanded(expanded === 'skip' ? null : 'skip')}
                className="text-white/30 font-montserrat font-medium text-xs px-2 py-2 active:scale-95 transition-transform hover:bg-white/5 rounded-xl"
              >
                Skip
              </button>
            </div>

            {/* Done expansion */}
            {expanded === 'done' && (
              <div className="mt-3 p-3 bg-[#132236]/40 rounded-xl space-y-2" style={{ animation: 'fadeSlideIn 200ms ease-out' }}>
                <div className="flex gap-1.5">
                  {['call', 'text', 'note'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActivityType(t)}
                      className={`px-3 py-1 rounded-full text-[11px] font-montserrat font-medium transition-colors capitalize ${
                        activityType === t ? 'bg-[#d3a971] text-[#132236]' : 'bg-white/5 text-white/50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Quick note (optional)"
                  className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white font-inter placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#d3a971]/50"
                />
                <button
                  type="button"
                  onClick={handleDone}
                  disabled={saving}
                  className="w-full py-2 bg-green-600 text-white font-montserrat font-semibold text-xs rounded-xl active:scale-95 transition-transform disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Mark Done'}
                </button>
              </div>
            )}

            {/* Snooze expansion */}
            {expanded === 'snooze' && (
              <div className="mt-3 flex gap-1.5 flex-wrap" style={{ animation: 'fadeSlideIn 200ms ease-out' }}>
                {[{ d: 1, l: '1 day' }, { d: 3, l: '3 days' }, { d: 7, l: '1 week' }, { d: 14, l: '2 weeks' }].map(s => (
                  <button
                    key={s.d}
                    type="button"
                    onClick={() => handleSnooze(s.d)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-full text-[11px] font-montserrat font-medium bg-white/5 text-white/60 active:scale-95 transition-transform hover:bg-[#d3a971]/10 disabled:opacity-50"
                  >
                    {s.l}
                  </button>
                ))}
              </div>
            )}

            {/* Skip expansion */}
            {expanded === 'skip' && (
              <div className="mt-3 flex gap-2" style={{ animation: 'fadeSlideIn 200ms ease-out' }}>
                <button
                  type="button"
                  onClick={() => handleSkip(false)}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-full text-[11px] font-montserrat font-medium bg-white/5 text-white/60 active:scale-95 transition-transform disabled:opacity-50"
                >
                  Skip 30 days
                </button>
                <button
                  type="button"
                  onClick={() => handleSkip(true)}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-full text-[11px] font-montserrat font-medium bg-red-500/10 text-red-400 active:scale-95 transition-transform disabled:opacity-50"
                >
                  Remove follow-up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TodayPage() {
  const { data, isLoading, mutate } = useToday();
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Pull to refresh
  const containerRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff > 80 && containerRef.current && containerRef.current.scrollTop === 0) {
      setRefreshing(true);
      await mutate();
      setRefreshing(false);
    }
    touchStartY.current = 0;
  }, [mutate]);

  function handleDismiss(contactId: string) {
    setDismissed(prev => new Set(prev).add(contactId));
    mutate();
  }

  if (isLoading) {
    return (
      <div className="p-4 pb-28 pt-4 max-w-lg mx-auto animate-fade-in space-y-4">
        <div className="h-8 w-64 bg-white/5 rounded animate-pulse" />
        <div className="h-4 w-40 bg-white/5 rounded animate-pulse" />
        <PowerMoveSkeleton />
        <RingSkeleton />
        <div className="space-y-2">
          {[0, 1, 2].map(i => <NurtureCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 pb-28 pt-4 max-w-lg mx-auto animate-fade-in">
        <p className="text-white/50 font-inter text-sm">Unable to load today data. Try refreshing.</p>
      </div>
    );
  }

  const visibleNurture = data.nurture.filter(n => !dismissed.has(n.contact_id));

  return (
    <div
      ref={containerRef}
      className="p-4 pb-28 pt-4 lg:p-8 lg:pb-8 max-w-lg mx-auto animate-fade-in"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {refreshing && (
        <div className="flex justify-center mb-4">
          <div className="w-5 h-5 border-2 border-[#d3a971] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-2xl font-playfair font-bold text-white leading-tight">
          {data.greeting}
        </h1>
        <p className="text-sm font-inter text-white/40 mt-1">
          {data.date}
        </p>
      </div>

      {/* Power Move */}
      {data.power_move && (
        <section className="mb-5" style={{ animation: 'fadeSlideIn 300ms ease-out' }}>
          <div
            className="rounded-2xl p-4 border-l-4 border-l-[#d3a971]"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              boxShadow: '0 0 20px rgba(211,169,113,0.1), 0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            <p className="font-montserrat font-semibold text-[10px] uppercase tracking-widest text-[#d3a971] mb-2">
              {data.power_move.label}
            </p>
            <p className="font-inter text-sm text-white leading-relaxed mb-3">
              {data.power_move.action}
            </p>
            <a
              href={data.power_move.button_type === 'open' ? undefined : data.power_move.href}
              onClick={data.power_move.button_type === 'open' ? (e) => { e.preventDefault(); router.push(data.power_move!.href); } : undefined}
              className="block w-full text-center bg-[#d3a971] text-[#132236] font-montserrat font-semibold text-sm rounded-xl py-3 active:scale-95 transition-transform"
            >
              {data.power_move.button_label}
            </a>
          </div>
        </section>
      )}

      {/* Commission Ring */}
      <section className="mb-4" style={{ animation: 'fadeSlideIn 400ms ease-out' }}>
        <CommissionRing data={data.commission} />
      </section>

      {/* Follow-Up Streak */}
      <section className="mb-5 text-center" style={{ animation: 'fadeSlideIn 450ms ease-out' }}>
        {data.streak > 0 ? (
          <p className="text-sm font-inter text-[#d3a971] font-medium">
            <Flame size={14} className="inline-block mr-1 -mt-0.5" />
            {data.streak} day streak
          </p>
        ) : (
          <p className="text-sm font-inter text-white/30">Start a streak today</p>
        )}
      </section>

      {/* Money Moves */}
      {data.money_moves.length > 0 && (
        <section className="mb-5" style={{ animation: 'fadeSlideIn 500ms ease-out' }}>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-[#d3a971]" />
            <h2 className="font-montserrat font-semibold text-[11px] uppercase tracking-wider text-white">
              Money Moves
            </h2>
          </div>
          <div className="space-y-2">
            {data.money_moves.map((move, i) => {
              const daysColor = move.days_to_close > 14 ? '#d3a971' : move.days_to_close > 7 ? '#f59e0b' : '#ef4444';
              return (
                <div
                  key={move.transaction_id}
                  className="rounded-2xl p-3 cursor-pointer active:bg-[rgba(255,255,255,0.03)] transition-colors"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
                    animationDelay: `${i * 50}ms`,
                  }}
                  onClick={() => router.push(`/transactions/${move.transaction_id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-montserrat font-semibold text-sm text-white truncate">
                        {move.address}
                      </p>
                      <p className="font-inter text-xs text-white/50 mt-0.5">
                        {move.contact_name}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs font-inter font-medium" style={{ color: daysColor }}>
                          {move.days_to_close} day{move.days_to_close !== 1 ? 's' : ''} to close
                        </span>
                        {move.doc_total > 0 && (
                          <span className="text-[10px] text-white/40 font-inter">
                            {move.doc_done}/{move.doc_total} docs
                          </span>
                        )}
                      </div>
                      {/* Doc progress bar */}
                      {move.doc_total > 0 && (
                        <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-[#d3a971] rounded-full transition-all"
                            style={{ width: `${move.doc_completion_pct}%` }}
                          />
                        </div>
                      )}
                      {/* Callable party */}
                      {move.party_phone && (
                        <a
                          href={createCallLink(move.party_phone)}
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-[#d3a971] font-inter mt-1.5 active:opacity-70"
                        >
                          <Phone size={10} />
                          Call {move.party_name?.split(' ')[0] || move.party_role}
                        </a>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-white/20 flex-shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Nurture */}
      {visibleNurture.length > 0 && (
        <section className="mb-5" style={{ animation: 'fadeSlideIn 600ms ease-out' }}>
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle size={16} className="text-green-500" />
            <h2 className="font-montserrat font-semibold text-[11px] uppercase tracking-wider text-white">
              Nurture
            </h2>
          </div>
          <div className="space-y-2">
            {visibleNurture.map((card, i) => (
              <NurtureCardItem
                key={card.contact_id}
                card={card}
                index={i}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </section>
      )}

      {/* Ana Lead Source Insight */}
      {data.ana_insight && (
        <section className="mb-5" style={{ animation: 'fadeSlideIn 700ms ease-out' }}>
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
          >
            <p className="font-inter text-sm text-white">
              {data.ana_insight.ana_name} has generated {data.ana_insight.ana_deals} of your {data.ana_insight.total_deals} deal{data.ana_insight.total_deals !== 1 ? 's' : ''}.
              {data.ana_insight.ana_deals > 0 ? ' Your #1 revenue source.' : ''}
            </p>
            {data.ana_insight.days_since_contact !== null && data.ana_insight.days_since_contact > 14 && data.ana_insight.ana_phone && (
              <a
                href={createSMSLink(
                  data.ana_insight.ana_phone,
                  'Hey Ana, hope all is well! Just wanted to touch base. If you have anyone looking to buy or sell, send them my way.'
                )}
                className="inline-flex items-center gap-1.5 mt-2 text-xs text-[#d3a971] font-montserrat font-semibold active:opacity-70"
              >
                <MessageCircle size={12} />
                Text {data.ana_insight.ana_name.split(' ')[0]} to stay top of mind
              </a>
            )}
          </div>
        </section>
      )}

      {/* CSS animation keyframes */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
