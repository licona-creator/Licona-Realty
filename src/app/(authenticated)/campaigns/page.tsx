/**
 * Campaigns Page
 *
 * Multi-option drip campaign system. Every contact sees 3-5 tailored
 * campaign options. Agent always chooses. Visual drip sequence builder.
 * All drafted messages through voice engine then to approval queue.
 */

'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BRAND } from '@/lib/brand';
import { Send, Plus } from 'lucide-react';

export default function CampaignsPage() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Send size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-text dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Campaigns
          </h1>
        </div>
        <Button variant="accent" size="sm">
          <Plus size={16} />
          New Campaign
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="!p-8 text-center">
          <Send size={40} className="text-gold mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-montserrat font-semibold text-text dark:text-white mb-2">
            Campaign Library
          </h2>
          <p className="text-sm text-text/50 dark:text-white/50 font-inter max-w-md mx-auto">
            Pre-built campaign sequences with multiple tone variants are ready
            for each track: Buyer, Seller, Landlord, Tenant, and Investor. Add
            contacts to see tailored campaign options.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
