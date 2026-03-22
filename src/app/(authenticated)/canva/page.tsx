/**
 * Canva Studio — Brand Content Creation
 *
 * Canva Connect API integration. All templates use exact Licona Realty brand kit.
 * LR gold monogram top right corner of every template. Non-negotiable.
 */

'use client';

import { Card } from '@/components/ui/Card';
import { BRAND } from '@/lib/brand';
import { Palette } from 'lucide-react';

export default function CanvaPage() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Palette size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-text dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Canva Studio
          </h1>
        </div>
      </div>

      <Card className="!p-8 text-center">
        <Palette size={40} className="text-gold mx-auto mb-4 opacity-50" />
        <h2 className="text-lg font-montserrat font-semibold text-text dark:text-white mb-2">
          Brand Content Studio
        </h2>
        <p className="text-sm text-text/50 dark:text-white/50 font-inter max-w-md mx-auto">
          Connect Canva to create branded content without leaving the platform.
          Pre-built templates for listings, social posts, milestones, and market
          updates all locked to the Licona Realty brand kit.
        </p>
      </Card>
    </div>
  );
}
