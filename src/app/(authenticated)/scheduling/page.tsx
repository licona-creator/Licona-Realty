/**
 * Scheduling and Booking Engine
 *
 * Native scheduling system. Calendar view, meeting management,
 * pre-meeting reminders, post-meeting campaigns.
 * All confirmations to approval queue.
 */

'use client';

import { Card } from '@/components/ui/Card';
import { BRAND } from '@/lib/brand';
import { Calendar } from 'lucide-react';

export default function SchedulingPage() {
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
      </div>

      <Card className="!p-8 text-center">
        <Calendar size={40} className="text-gold mx-auto mb-4 opacity-50" />
        <h2 className="text-lg font-montserrat font-semibold text-text dark:text-white mb-2">
          Calendar & Bookings
        </h2>
        <p className="text-sm text-text/50 dark:text-white/50 font-inter max-w-md mx-auto">
          Connect Google Calendar to sync appointments bidirectionally.
          Your public booking page will show real-time availability
          for buyer consultations, seller consultations, and more.
        </p>
      </Card>
    </div>
  );
}
