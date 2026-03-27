/**
 * Booking / Consultation Page
 *
 * PUBLIC PAGE - accessible without authentication.
 * Allows prospective clients to book consultations with Anthony.
 * Submits to Supabase bookings table via /api/bookings endpoint.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { BRAND } from '@/lib/brand';
import { motion } from 'framer-motion';
import { Calendar, Loader2, CheckCircle } from 'lucide-react';

const CONSULTATION_TYPES = [
  { value: 'buyer_consultation', label: 'Buyer Consultation' },
  { value: 'seller_consultation', label: 'Seller Consultation' },
  { value: 'investor_strategy', label: 'Investor Strategy Call' },
  { value: 'general_inquiry', label: 'General Inquiry' },
];

export default function BookingPage() {
  const [selectedType, setSelectedType] = useState('buyer_consultation');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_type: selectedType,
          visitor_name: name,
          visitor_email: email,
          visitor_phone: phone,
          scheduled_date: date,
          scheduled_time: time,
          visitor_note: note,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Connection issue. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#ffffff',
  };

  return (
    <div className="min-h-screen" style={{ background: BRAND.colors.heroGradient }}>
      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <LRMonogram size="xl" />
          </div>
          <h1
            className="text-3xl font-semibold mb-2"
            style={{ fontFamily: BRAND.fonts.playfair, color: BRAND.colors.white }}
          >
            Book a Consultation
          </h1>
          <p
            className="text-sm italic"
            style={{ fontFamily: BRAND.fonts.playfair, color: BRAND.colors.accent }}
          >
            {BRAND.tagline}
          </p>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <CheckCircle size={48} className="mx-auto mb-4" style={{ color: BRAND.colors.accent }} />
            <h2
              className="text-2xl font-semibold mb-3"
              style={{ fontFamily: BRAND.fonts.playfair, color: BRAND.colors.white }}
            >
              Request Submitted
            </h2>
            <p className="text-sm font-inter leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Your consultation request has been submitted. Anthony will be in touch within 24 hours.
            </p>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Consultation Type */}
            <div>
              <label
                className="block text-sm font-montserrat font-medium mb-2"
                style={{ color: BRAND.colors.white }}
              >
                Consultation Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CONSULTATION_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setSelectedType(ct.value)}
                    className="px-3 py-2.5 rounded-[8px] text-xs font-montserrat font-medium transition-all duration-200"
                    style={{
                      backgroundColor: selectedType === ct.value ? BRAND.colors.accent : 'rgba(255,255,255,0.08)',
                      color: selectedType === ct.value ? BRAND.colors.navy : '#ffffff',
                      border: selectedType === ct.value ? `1px solid ${BRAND.colors.accent}` : '1px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label
                className="block text-sm font-montserrat font-medium mb-1.5"
                style={{ color: BRAND.colors.white }}
              >
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full px-4 py-2.5 rounded-[8px] text-sm font-inter outline-none transition-all duration-200 placeholder:text-white/50"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = BRAND.colors.accent; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              />
            </div>

            {/* Email */}
            <div>
              <label
                className="block text-sm font-montserrat font-medium mb-1.5"
                style={{ color: BRAND.colors.white }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2.5 rounded-[8px] text-sm font-inter outline-none transition-all duration-200 placeholder:text-white/50"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = BRAND.colors.accent; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              />
            </div>

            {/* Phone */}
            <div>
              <label
                className="block text-sm font-montserrat font-medium mb-1.5"
                style={{ color: BRAND.colors.white }}
              >
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                required
                className="w-full px-4 py-2.5 rounded-[8px] text-sm font-inter outline-none transition-all duration-200 placeholder:text-white/50"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = BRAND.colors.accent; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-sm font-montserrat font-medium mb-1.5"
                  style={{ color: BRAND.colors.white }}
                >
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-[8px] text-sm font-inter outline-none transition-all duration-200"
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                  onFocus={e => { e.target.style.borderColor = BRAND.colors.accent; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                />
              </div>
              <div>
                <label
                  className="block text-sm font-montserrat font-medium mb-1.5"
                  style={{ color: BRAND.colors.white }}
                >
                  Preferred Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-[8px] text-sm font-inter outline-none transition-all duration-200"
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                  onFocus={e => { e.target.style.borderColor = BRAND.colors.accent; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label
                className="block text-sm font-montserrat font-medium mb-1.5"
                style={{ color: BRAND.colors.white }}
              >
                Brief note about what you are looking for
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Tell us a bit about your real estate goals..."
                className="w-full px-4 py-2.5 rounded-[8px] text-sm font-inter outline-none transition-all duration-200 resize-none placeholder:text-white/50"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = BRAND.colors.accent; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm text-center font-inter">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-[8px] font-montserrat font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                backgroundColor: BRAND.colors.accent,
                color: BRAND.colors.navy,
              }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Request Consultation
            </button>
          </motion.form>
        )}

        {/* Footer */}
        <footer className="mt-16 py-8 text-center">
          <p className="text-xs font-inter" style={{ color: BRAND.colors.white }}>
            {BRAND.agent.name} &middot; Realtor® &middot; {BRAND.agent.phone} &middot; {BRAND.agent.email}
          </p>
          <p className="text-xs font-inter mt-1" style={{ color: 'rgba(244,244,244,0.8)' }}>
            {BRAND.agent.brokerage} &middot; {BRAND.agent.license}
          </p>
          <p
            className="text-xs mt-2 italic"
            style={{ fontFamily: BRAND.fonts.playfair, color: BRAND.colors.accent }}
          >
            {BRAND.tagline}
          </p>
        </footer>
      </div>
    </div>
  );
}
