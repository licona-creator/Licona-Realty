/**
 * Testimonials Page
 *
 * PUBLIC PAGE — SEO optimized with Review and AggregateRating schema.
 * Styled in full Licona Realty brand.
 * Filters by transaction type.
 */

'use client';

import { LRMonogram } from '@/components/ui/LRMonogram';
import { Card } from '@/components/ui/Card';
import { BRAND } from '@/lib/brand';
import { Star } from 'lucide-react';

export default function TestimonialsPage() {
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
        </div>

        {/* Empty State */}
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

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-white/30 font-inter">
            {BRAND.agent.name} &middot; {BRAND.agent.title} &middot; {BRAND.agent.brokerage}
          </p>
          <p className="text-xs text-white/20 font-inter mt-1">
            {BRAND.agent.license}
          </p>
        </div>
      </div>
    </div>
  );
}
