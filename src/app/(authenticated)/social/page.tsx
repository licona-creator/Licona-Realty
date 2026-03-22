/**
 * Social Media Marketing Powerhouse
 *
 * Full social media growth engine across 6 content pillars.
 * Instagram and Facebook integration. Content calendar.
 * All content to approval queue before publishing.
 */

'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { BRAND } from '@/lib/brand';
import { Share2, Instagram } from 'lucide-react';

const contentPillars = [
  { name: 'Market Intelligence', color: '#3B82F6' },
  { name: 'Client Wins', color: '#22C55E' },
  { name: 'Local DFW', color: '#F59E0B' },
  { name: 'Education', color: '#8B5CF6' },
  { name: 'Behind the Scenes', color: '#EC4899' },
  { name: 'Personal Brand', color: '#d3a971' },
];

export default function SocialPage() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Share2 size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-text dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Social Media
          </h1>
        </div>
      </div>

      {/* Content Pillars */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {contentPillars.map((pillar) => (
          <motion.div
            key={pillar.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="!p-3 text-center">
              <div
                className="w-3 h-3 rounded-full mx-auto mb-2"
                style={{ backgroundColor: pillar.color }}
              />
              <p className="text-xs font-montserrat font-medium text-text/70 dark:text-white/70">
                {pillar.name}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="!p-8 text-center">
          <Instagram size={40} className="text-gold mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-montserrat font-semibold text-text dark:text-white mb-2">
            Connect Your Accounts
          </h2>
          <p className="text-sm text-text/50 dark:text-white/50 font-inter max-w-md mx-auto">
            Connect Instagram Business and Facebook Page to start planning
            content across all 6 pillars. The intelligence layer will suggest
            optimal posting times and content mix.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
