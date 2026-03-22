/**
 * SEO Dashboard
 *
 * Keyword tracking, organic traffic, content performance.
 * Public SEO pages are server-rendered. CRM pages never indexed.
 */

'use client';

import { Card } from '@/components/ui/Card';
import { BRAND } from '@/lib/brand';
import { TrendingUp } from 'lucide-react';

export default function SEOPage() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-text dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            SEO & Growth
          </h1>
        </div>
      </div>

      <Card className="!p-8 text-center">
        <TrendingUp size={40} className="text-gold mx-auto mb-4 opacity-50" />
        <h2 className="text-lg font-montserrat font-semibold text-text dark:text-white mb-2">
          SEO Intelligence
        </h2>
        <p className="text-sm text-text/50 dark:text-white/50 font-inter max-w-md mx-auto">
          Track keyword rankings, organic traffic, and content performance
          across all public-facing pages. The intelligence layer monitors
          weekly and surfaces specific content recommendations.
        </p>
      </Card>
    </div>
  );
}
