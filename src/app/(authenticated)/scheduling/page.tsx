/**
 * Scheduling and Booking Engine
 *
 * Calendar view with meeting management, booking list,
 * pre-meeting reminders, post-meeting campaign surfacing.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
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

export default function SchedulingPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState<'list' | 'calendar'>('list');

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

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-text dark:text-white"
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

      {/* Date Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-surface dark:hover:bg-navy/50 rounded-lg transition-colors">
          <ChevronLeft size={20} className="text-text/60 dark:text-white/60" />
        </button>
        <div className="text-center">
          <p className="text-lg font-montserrat font-semibold text-text dark:text-white">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
            })}
          </p>
          <p className="text-xs text-text/40 dark:text-white/40 font-inter">
            {todayBookings.length} meeting{todayBookings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => navigateDate(1)} className="p-2 hover:bg-surface dark:hover:bg-navy/50 rounded-lg transition-colors">
          <ChevronRight size={20} className="text-text/60 dark:text-white/60" />
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
                      <span className="text-sm font-montserrat font-bold text-text dark:text-white">
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
                      <span className="text-sm font-inter text-text dark:text-white flex items-center gap-1">
                        <User size={12} /> {booking.visitor_name}
                      </span>
                      <span className="text-xs text-text/50 dark:text-white/50 font-inter flex items-center gap-1">
                        <Clock size={10} /> {booking.duration_minutes}min
                      </span>
                    </div>
                    {booking.visitor_note && (
                      <p className="text-xs text-text/40 dark:text-white/40 font-inter mt-1 italic">
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
          <p className="text-sm text-text/50 dark:text-white/50 font-inter">
            No meetings scheduled for this date
          </p>
        </Card>
      )}

      {/* Upcoming Bookings */}
      <h2 className="text-sm font-montserrat font-semibold text-text/60 dark:text-white/60 uppercase tracking-wider mb-4">
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
                    <p className="text-sm font-montserrat font-medium text-text dark:text-white">
                      {booking.visitor_name}
                    </p>
                    <p className="text-xs text-text/50 dark:text-white/50 font-inter">
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
          <h3 className="text-lg font-montserrat font-semibold text-text dark:text-white mb-2">
            No Upcoming Bookings
          </h3>
          <p className="text-sm text-text/50 dark:text-white/50 font-inter max-w-md mx-auto">
            Share your booking page to let clients schedule consultations.
            All confirmations route through your approval queue.
          </p>
        </Card>
      )}
    </div>
  );
}
