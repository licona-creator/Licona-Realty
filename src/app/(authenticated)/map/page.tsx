/**
 * Google Maps Client Intelligence Page
 *
 * Full-screen interactive map with custom Licona Realty brand styling.
 * Contact pins by track type, zone drawing tool, heatmap layers.
 * Google Maps JavaScript API exclusively.
 */

'use client';

import { Card } from '@/components/ui/Card';
import { BRAND } from '@/lib/brand';
import { MapPin } from 'lucide-react';

export default function MapPage() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MapPin size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-text dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Client Map
          </h1>
        </div>
      </div>

      <Card className="!p-8 text-center">
        <MapPin size={40} className="text-gold mx-auto mb-4 opacity-50" />
        <h2 className="text-lg font-montserrat font-semibold text-text dark:text-white mb-2">
          DFW Contact Map
        </h2>
        <p className="text-sm text-text/50 dark:text-white/50 font-inter max-w-md mx-auto">
          Add contacts with addresses to see them plotted on the interactive
          map. Draw zones to create targeted campaigns. Google Maps API
          key required for full functionality.
        </p>
      </Card>
    </div>
  );
}
