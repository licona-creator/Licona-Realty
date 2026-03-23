/**
 * Canva Studio Page
 *
 * Canva Connect API integration for branded design creation.
 * Template library, auto-fill with contact/transaction data,
 * direct export to social media pipeline.
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BRAND } from '@/lib/brand';
import { CANVA_TEMPLATE_TYPES, type CanvaTemplateType } from '@/lib/canva/client';
import {
  Palette, Image, ExternalLink,
  Search, Grid, List, Sparkles,
  Home, TrendingUp, Star, Calendar, PartyPopper, Heart,
} from 'lucide-react';

const TEMPLATE_ICONS: Record<CanvaTemplateType, React.ElementType> = {
  just_listed: Home,
  just_sold: TrendingUp,
  open_house: Calendar,
  price_reduction: TrendingUp,
  market_update: TrendingUp,
  client_testimonial: Star,
  holiday_greeting: PartyPopper,
  home_anniversary: Heart,
  birthday: PartyPopper,
  investor_report: TrendingUp,
  neighborhood_spotlight: Home,
};

export default function CanvaPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected] = useState(false);

  const templateEntries = Object.entries(CANVA_TEMPLATE_TYPES) as [CanvaTemplateType, string][];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
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
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Button variant="accent" size="sm">
              <ExternalLink size={14} className="mr-1.5" />
              Connect Canva
            </Button>
          )}
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 bg-surface dark:bg-navy/50 rounded-lg px-3 py-2 flex-1 max-w-md">
          <Search size={16} className="text-text/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search templates and designs..."
            className="bg-transparent text-sm font-inter outline-none flex-1 text-text dark:text-white"
          />
        </div>
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={() => setView('grid')}
            className={`p-2 rounded-lg transition-colors ${
              view === 'grid' ? 'bg-navy text-white' : 'text-text/40 hover:bg-surface'
            }`}
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded-lg transition-colors ${
              view === 'list' ? 'bg-navy text-white' : 'text-text/40 hover:bg-surface'
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Template Library */}
      <div className="mb-8">
        <h2 className="text-sm font-montserrat font-semibold text-text/60 dark:text-white/60 uppercase tracking-wider mb-4">
          Template Library
        </h2>
        <div className={
          view === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'space-y-3'
        }>
          {templateEntries.map(([key, label]) => {
            const Icon = TEMPLATE_ICONS[key];
            return view === 'grid' ? (
              <Card key={key} className="!p-0 overflow-hidden group cursor-pointer hover:shadow-md transition-shadow">
                <div
                  className="h-32 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.colors.primary}, ${BRAND.colors.navyLight})`,
                  }}
                >
                  <Icon size={32} className="text-gold/60 group-hover:text-gold transition-colors" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-montserrat font-semibold text-text dark:text-white">
                    {label}
                  </p>
                  <p className="text-[10px] text-text/40 dark:text-white/40 font-inter mt-1">
                    Brand template
                  </p>
                </div>
              </Card>
            ) : (
              <Card key={key} className="!p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: BRAND.colors.primary }}
                >
                  <Icon size={20} className="text-gold" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-montserrat font-semibold text-text dark:text-white">
                    {label}
                  </p>
                  <p className="text-xs text-text/40 dark:text-white/40 font-inter">
                    Auto-fill with contact data
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <Sparkles size={14} className="mr-1" /> Create
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Designs */}
      <div>
        <h2 className="text-sm font-montserrat font-semibold text-text/60 dark:text-white/60 uppercase tracking-wider mb-4">
          Recent Designs
        </h2>
        <Card className="!p-8 text-center">
          <Image size={40} className="text-gold mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-montserrat font-semibold text-text dark:text-white mb-2">
            No Designs Yet
          </h3>
          <p className="text-sm text-text/50 dark:text-white/50 font-inter max-w-md mx-auto">
            {isConnected
              ? 'Create your first design from a template above. Designs auto-fill with your brand colors and contact data.'
              : 'Connect your Canva account to start creating branded designs with auto-fill templates.'}
          </p>
        </Card>
      </div>
    </div>
  );
}
