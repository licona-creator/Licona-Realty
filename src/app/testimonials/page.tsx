/**
 * Testimonials Page
 *
 * PUBLIC PAGE - SEO optimized with Review schema.
 * Live data from testimonials API. Styled in Licona Realty brand.
 * Filters by transaction type.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { Card } from '@/components/ui/Card';
import { BRAND } from '@/lib/brand';
import { Star, Quote } from 'lucide-react';

interface PublicTestimonial {
  id: string;
  star_rating: number;
  review_text: string;
  client_first_name: string;
  client_city: string;
  transaction_type: string;
  created_at: string;
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<PublicTestimonial[]>([]);
  const [filter, setFilter] = useState<string>('all');

  const fetchTestimonials = useCallback(async () => {
    try {
      const res = await fetch('/api/testimonials?public=true');
      if (res.ok) {
        const data = await res.json();
        setTestimonials(data.testimonials || []);
      }
    } catch {
      // Empty state
    }
  }, []);

  useEffect(() => { fetchTestimonials(); }, [fetchTestimonials]);

  const filtered = filter === 'all'
    ? testimonials
    : testimonials.filter(t => t.transaction_type === filter);

  const avgRating = testimonials.length > 0
    ? (testimonials.reduce((sum, t) => sum + t.star_rating, 0) / testimonials.length).toFixed(1)
    : null;

  return (
    <div
      className="min-h-screen"
      style={{ background: BRAND.colors.heroGradient }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <LRMonogram size="md" />
          <span className="text-sm font-montserrat font-semibold text-gold tracking-wider">
            LICONA REALTY
          </span>
        </div>
        <a
          href="/mortgage"
          className="text-xs font-montserrat text-white/60 hover:text-white transition-colors"
        >
          Mortgage Calculator
        </a>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-semibold text-white mb-2"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            What Clients Say
          </h1>
          <p className="text-sm text-white/50 font-inter">
            {BRAND.tagline}
          </p>
          {avgRating && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    size={16}
                    className={s <= Math.round(parseFloat(avgRating)) ? 'text-gold fill-gold' : 'text-white/20'}
                  />
                ))}
              </div>
              <span className="text-sm font-montserrat font-semibold text-gold">
                {avgRating}
              </span>
              <span className="text-xs text-white/40 font-inter">
                ({testimonials.length} review{testimonials.length !== 1 ? 's' : ''})
              </span>
            </div>
          )}
        </div>

        {/* Filters */}
        {testimonials.length > 0 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {['all', 'buyer', 'seller', 'investor'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-montserrat font-medium transition-colors capitalize ${
                  filter === f
                    ? 'bg-gold text-navy'
                    : 'bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : `${f}s`}
              </button>
            ))}
          </div>
        )}

        {/* Testimonials */}
        {filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map(t => (
              <Card key={t.id} className="!p-6 !bg-white/5 !border-white/10">
                <div className="flex items-start gap-3">
                  <Quote size={20} className="text-gold flex-shrink-0 mt-1 opacity-50" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          size={14}
                          className={s <= t.star_rating ? 'text-gold fill-gold' : 'text-white/20'}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-white/80 font-inter leading-relaxed mb-3">
                      &ldquo;{t.review_text}&rdquo;
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gold font-montserrat font-medium">
                        {t.client_first_name} - {t.client_city}
                      </p>
                      <span className="text-[10px] text-white/30 font-inter capitalize">
                        {t.transaction_type}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="!p-8 text-center !bg-white/5 !border-white/10">
            <Star size={40} className="text-gold mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-montserrat font-semibold text-white mb-2">
              Reviews Coming Soon
            </h2>
            <p className="text-sm text-white/50 font-inter max-w-md mx-auto">
              Client testimonials will appear here after closings.
              Each review is personally approved by Anthony.
            </p>
          </Card>
        )}

        {/* Footer */}
        <footer className="mt-12 py-8 text-center" style={{ backgroundColor: BRAND.colors.primary }}>
          <p className="text-xs text-white font-inter">
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

      {/* JSON-LD for SEO */}
      {testimonials.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              name: 'Licona Realty',
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: avgRating,
                reviewCount: testimonials.length,
              },
              review: testimonials.slice(0, 5).map(t => ({
                '@type': 'Review',
                reviewRating: {
                  '@type': 'Rating',
                  ratingValue: t.star_rating,
                },
                author: { '@type': 'Person', name: t.client_first_name },
                reviewBody: t.review_text,
              })),
            }),
          }}
        />
      )}
    </div>
  );
}
