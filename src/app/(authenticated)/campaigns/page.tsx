/**
 * Campaigns Page
 *
 * Multi-option drip campaign system. Visual campaign library
 * with enrollment management and performance tracking.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BRAND } from '@/lib/brand';
import type { Campaign, TrackType } from '@/types/database';
import {
  Send, Plus, Users, Clock, ChevronRight,
  Play, Pause, BarChart3, Zap,
} from 'lucide-react';

const TRACK_COLORS: Record<TrackType, string> = {
  buyer: '#3B82F6',
  seller: '#22C55E',
  landlord: '#A855F7',
  tenant: '#F97316',
  investor: BRAND.colors.accent,
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeTrack, setActiveTrack] = useState<TrackType | 'all'>('all');

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch {
      // Empty state
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const filtered = activeTrack === 'all'
    ? campaigns
    : campaigns.filter(c => c.track_type === activeTrack);

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
          <Plus size={16} className="mr-1" />
          New Campaign
        </Button>
      </div>

      {/* Track Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        {(['all', 'buyer', 'seller', 'landlord', 'tenant', 'investor'] as const).map(track => (
          <button
            key={track}
            onClick={() => setActiveTrack(track)}
            className={`px-4 py-1.5 rounded-full text-xs font-montserrat font-medium transition-colors whitespace-nowrap capitalize ${
              activeTrack === track
                ? 'bg-navy text-white dark:bg-gold dark:text-navy'
                : 'bg-surface dark:bg-navy/50 text-text/60'
            }`}
          >
            {track === 'all' ? 'All Tracks' : `${track}s`}
          </button>
        ))}
      </div>

      {/* Campaign List */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map(campaign => {
            const stepCount = campaign.steps?.length || 0;
            const color = TRACK_COLORS[campaign.track_type] || BRAND.colors.accent;

            return (
              <Card key={campaign.id} className="!p-5 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <h3 className="font-montserrat font-semibold text-text dark:text-white">
                        {campaign.name}
                      </h3>
                    </div>
                    {campaign.description && (
                      <p className="text-xs text-text/50 dark:text-white/50 font-inter">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={campaign.is_active ? 'success' : 'navy'}>
                      {campaign.is_active ? 'Active' : 'Paused'}
                    </Badge>
                    <ChevronRight size={16} className="text-text/30" />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs font-inter text-text/60 dark:text-white/60 flex items-center gap-1">
                    <Zap size={10} /> {stepCount} step{stepCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-inter text-text/60 dark:text-white/60 flex items-center gap-1 capitalize">
                    <Users size={10} /> {campaign.track_type}
                  </span>
                  <span className="text-xs font-inter text-text/60 dark:text-white/60 flex items-center gap-1">
                    <BarChart3 size={10} /> {campaign.tone.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Step Preview */}
                {stepCount > 0 && (
                  <div className="mt-3 flex items-center gap-1">
                    {(campaign.steps || []).slice(0, 6).map((step, i) => (
                      <div key={i} className="flex items-center">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-montserrat font-bold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {i + 1}
                        </div>
                        {i < Math.min(stepCount, 6) - 1 && (
                          <div className="w-3 h-0.5 bg-text/10 dark:bg-white/10" />
                        )}
                      </div>
                    ))}
                    {stepCount > 6 && (
                      <span className="text-[10px] text-text/40 dark:text-white/40 ml-1">
                        +{stepCount - 6}
                      </span>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="!p-8 text-center">
          <Send size={40} className="text-gold mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-montserrat font-semibold text-text dark:text-white mb-2">
            Campaign Library
          </h2>
          <p className="text-sm text-text/50 dark:text-white/50 font-inter max-w-md mx-auto mb-4">
            Create drip campaign sequences with multiple tone variants for each track.
            Every message goes through the voice engine and approval queue.
          </p>
          <Button variant="accent">
            <Plus size={16} className="mr-1" />
            Create Your First Campaign
          </Button>
        </Card>
      )}
    </div>
  );
}
