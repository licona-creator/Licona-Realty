/**
 * Scheduling and Booking Engine
 *
 * Calendar view with meeting management, booking list,
 * pre-meeting reminders, post-meeting campaign surfacing.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BRAND } from '@/lib/brand';
import type { Booking } from '@/types/database';
import {
  Calendar, Clock, User, Phone, Mail, Video,
  ChevronLeft, ChevronRight, Plus,
} from 'lucide-react';

const MEETING_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  buyer_consultation: { label: 'Buyer Consultation', color: '#3B82F6' },
  seller_consultation: { label: 'Seller Consultation', color: '#22C55E' },
  investor_strategy: { label: 'Investor Strategy', color: BRAND.colors.accent },
  general_inquiry: { label: 'General Inquiry', color: '#8B5CF6' },
  showing_request: { label: 'Showing Request', color: '#F97316' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d;
}

function formatHour(hour: number): string {
  if (hour === 0 || hour === 12) return '12:00 ' + (hour < 12 ? 'AM' : 'PM');
  return (hour > 12 ? hour - 12 : hour) + ':00 ' + (hour < 12 ? 'AM' : 'PM');
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseTimeToHour(timeStr: string): number | null {
  if (!timeStr) return null;
  // Handle formats like "10:00 AM", "2:30 PM", "14:00"
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const ampm = match[3];
  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
  }
  return hour;
}

export default function SchedulingPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch {
      // Empty state
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const todayBookings = bookings.filter(b => b.scheduled_date === selectedDate);
  const upcomingBookings = bookings
    .filter(b => b.scheduled_date >= new Date().toISOString().split('T')[0])
    .sort((a, b) => `${a.scheduled_date}${a.scheduled_time}`.localeCompare(`${b.scheduled_date}${b.scheduled_time}`));

  const navigateDate = (delta: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + delta);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const previousWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  // Build array of 7 dates for the current week
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const todayISO = formatDateISO(new Date());

  // Build a map: "YYYY-MM-DD-HH" -> Booking[] for the current week
  const weekBookingsMap = useMemo(() => {
    const weekEndDate = new Date(weekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const startISO = formatDateISO(weekStart);
    const endISO = formatDateISO(weekEndDate);

    const map: Record<string, Booking[]> = {};
    for (const b of bookings) {
      if (b.scheduled_date >= startISO && b.scheduled_date <= endISO) {
        const hour = parseTimeToHour(b.scheduled_time);
        if (hour !== null && hour >= 8 && hour <= 20) {
          const key = `${b.scheduled_date}-${hour}`;
          if (!map[key]) map[key] = [];
          map[key].push(b);
        }
      }
    }
    return map;
  }, [bookings, weekStart]);

  const weekHasBookings = Object.keys(weekBookingsMap).length > 0;

  // Week range label
  const weekRangeLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', opts);
    const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }, [weekDates]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Scheduling
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
          >
            List
          </Button>
          <Button
            variant={view === 'calendar' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setView('calendar')}
          >
            Calendar
          </Button>
        </div>
      </div>

      {view === 'list' ? (
        <>
          {/* Date Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-surface dark:hover:bg-navy/50 rounded-lg transition-colors">
              <ChevronLeft size={20} className="text-navy/60 dark:text-white/60" />
            </button>
            <div className="text-center">
              <p className="text-lg font-montserrat font-semibold text-navy dark:text-white">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                })}
              </p>
              <p className="text-xs text-navy/40 dark:text-white/40 font-inter">
                {todayBookings.length} meeting{todayBookings.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={() => navigateDate(1)} className="p-2 hover:bg-surface dark:hover:bg-navy/50 rounded-lg transition-colors">
              <ChevronRight size={20} className="text-navy/60 dark:text-white/60" />
            </button>
          </div>

          {/* Today's Schedule */}
          {todayBookings.length > 0 ? (
            <div className="space-y-3 mb-8">
              {todayBookings.map(booking => {
                const type = MEETING_TYPE_LABELS[booking.meeting_type] || MEETING_TYPE_LABELS.general_inquiry;
                return (
                  <Card key={booking.id} className="!p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-montserrat font-bold text-navy dark:text-white">
                            {booking.scheduled_time}
                          </span>
                          <Badge variant="gold">{type.label}</Badge>
                          <Badge
                            variant={booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'danger' : 'navy'}
                          >
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm font-inter text-navy dark:text-white flex items-center gap-1">
                            <User size={12} /> {booking.visitor_name}
                          </span>
                          <span className="text-xs text-navy/50 dark:text-white/50 font-inter flex items-center gap-1">
                            <Clock size={10} /> {booking.duration_minutes}min
                          </span>
                        </div>
                        {booking.visitor_note && (
                          <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-1 italic">
                            &ldquo;{booking.visitor_note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="!p-6 text-center mb-8">
              <p className="text-sm text-navy/50 dark:text-white/50 font-inter">
                No meetings scheduled for this date
              </p>
            </Card>
          )}

          {/* Upcoming Bookings */}
          <h2 className="text-sm font-montserrat font-semibold text-navy/60 dark:text-white/60 uppercase tracking-wider mb-4">
            Upcoming Bookings
          </h2>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-2">
              {upcomingBookings.slice(0, 10).map(booking => {
                const type = MEETING_TYPE_LABELS[booking.meeting_type] || MEETING_TYPE_LABELS.general_inquiry;
                return (
                  <Card key={booking.id} className="!p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-1 h-8 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      <div>
                        <p className="text-sm font-montserrat font-medium text-navy dark:text-white">
                          {booking.visitor_name}
                        </p>
                        <p className="text-xs text-navy/50 dark:text-white/50 font-inter">
                          {new Date(booking.scheduled_date + 'T12:00:00').toLocaleDateString()} at {booking.scheduled_time}
                        </p>
                      </div>
                    </div>
                    <Badge variant="gold">{type.label}</Badge>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="!p-8 text-center">
              <Calendar size={40} className="text-gold mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-montserrat font-semibold text-navy dark:text-white mb-2">
                No Upcoming Bookings
              </h3>
              <p className="text-sm text-navy/50 dark:text-white/50 font-inter max-w-md mx-auto">
                Share your booking page to let clients schedule consultations.
                All confirmations route through your approval queue.
              </p>
            </Card>
          )}
        </>
      ) : (
        /* ===================== CALENDAR VIEW ===================== */
        <div>
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={previousWeek}
              className="p-2 hover:bg-surface dark:hover:bg-navy/50 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} style={{ color: BRAND.colors.gold }} />
            </button>
            <p
              className="text-lg font-semibold text-navy dark:text-white"
              style={{ fontFamily: BRAND.fonts.montserrat }}
            >
              {weekRangeLabel}
            </p>
            <button
              onClick={nextWeek}
              className="p-2 hover:bg-surface dark:hover:bg-navy/50 rounded-lg transition-colors"
            >
              <ChevronRight size={20} style={{ color: BRAND.colors.gold }} />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto rounded-xl" style={{ border: BRAND.design.cardBorder }}>
            <div
              className="grid min-w-[800px]"
              style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}
            >
              {/* Header Row - Time label corner */}
              <div
                className="sticky top-0 z-10 p-2 text-center text-xs"
                style={{
                  backgroundColor: BRAND.colors.navy,
                  color: 'rgba(255,255,255,0.4)',
                  fontFamily: BRAND.fonts.montserrat,
                  borderBottom: `1px solid rgba(211,169,113,0.15)`,
                }}
              />

              {/* Header Row - Day columns */}
              {weekDates.map((date, idx) => {
                const dateISO = formatDateISO(date);
                const isToday = dateISO === todayISO;
                return (
                  <div
                    key={idx}
                    className="sticky top-0 z-10 p-3 text-center"
                    style={{
                      backgroundColor: isToday ? BRAND.colors.gold : BRAND.colors.navy,
                      borderBottom: `1px solid rgba(211,169,113,0.15)`,
                      borderLeft: `1px solid rgba(211,169,113,0.1)`,
                    }}
                  >
                    <p
                      className="text-xs uppercase tracking-wide"
                      style={{
                        fontFamily: BRAND.fonts.montserrat,
                        color: isToday ? BRAND.colors.navy : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {DAY_NAMES[idx]}
                    </p>
                    <p
                      className="text-lg"
                      style={{
                        fontFamily: BRAND.fonts.dmSerif,
                        color: isToday ? BRAND.colors.navy : BRAND.colors.white,
                      }}
                    >
                      {date.getDate()}
                    </p>
                  </div>
                );
              })}

              {/* Time Rows */}
              {HOURS.map(hour => (
                <>
                  {/* Time label */}
                  <div
                    key={`label-${hour}`}
                    className="flex items-start justify-end pr-2 pt-1"
                    style={{
                      backgroundColor: BRAND.colors.darkCard,
                      borderTop: `1px solid rgba(211,169,113,0.1)`,
                      height: '64px',
                    }}
                  >
                    <span
                      className="text-[10px] leading-none"
                      style={{
                        fontFamily: BRAND.fonts.inter,
                        color: 'rgba(255,255,255,0.35)',
                      }}
                    >
                      {formatHour(hour)}
                    </span>
                  </div>

                  {/* Day cells for this hour */}
                  {weekDates.map((date, dayIdx) => {
                    const dateISO = formatDateISO(date);
                    const key = `${dateISO}-${hour}`;
                    const cellBookings = weekBookingsMap[key] || [];

                    return (
                      <div
                        key={`cell-${hour}-${dayIdx}`}
                        className="relative"
                        style={{
                          backgroundColor: BRAND.colors.darkCard,
                          border: `1px solid rgba(211,169,113,0.1)`,
                          borderTop: `1px solid rgba(211,169,113,0.1)`,
                          height: '64px',
                          overflow: 'hidden',
                        }}
                      >
                        {cellBookings.map((booking) => {
                          const type = MEETING_TYPE_LABELS[booking.meeting_type] || MEETING_TYPE_LABELS.general_inquiry;
                          return (
                            <div
                              key={booking.id}
                              className="absolute inset-x-0 top-0 mx-[2px] mt-[2px] rounded px-1.5 py-1 overflow-hidden"
                              style={{
                                backgroundColor: type.color + '22',
                                borderLeft: `3px solid ${type.color}`,
                                height: 'calc(100% - 4px)',
                              }}
                            >
                              <p
                                className="text-[10px] font-semibold truncate"
                                style={{
                                  fontFamily: BRAND.fonts.montserrat,
                                  color: BRAND.colors.white,
                                }}
                              >
                                {booking.visitor_name}
                              </p>
                              <p
                                className="text-[9px] truncate"
                                style={{
                                  fontFamily: BRAND.fonts.inter,
                                  color: 'rgba(255,255,255,0.5)',
                                }}
                              >
                                {type.label}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>

          {/* Empty state for the week */}
          {!weekHasBookings && (
            <div className="mt-8 text-center py-8">
              <p
                style={{
                  fontFamily: BRAND.fonts.inter,
                  opacity: 0.5,
                  color: BRAND.colors.navy,
                }}
                className="dark:text-white text-sm"
              >
                No meetings scheduled this week
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
