/**
 * SEO Dashboard
 *
 * Keyword tracking, organic traffic analytics, content performance.
 * Targets DFW real estate keywords.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BRAND } from '@/lib/brand';
import {
  TrendingUp, Search, Globe, Users, Target,
  ArrowUp, ArrowDown, Minus, BarChart3,
} from 'lucide-react';

// Target keywords for DFW real estate
const TARGET_KEYWORDS = [
  'North Texas realtor',
  'DFW real estate agent',
  'bilingual realtor Dallas',
  'Dallas home buyer agent',
  'Fort Worth seller agent',
  'DFW investment properties',
  'Spanish speaking realtor DFW',
  'North Texas home for sale',
  'Dallas TX first time home buyer',
  'realtor near me Dallas',
];

interface SEOSummary {
  totalVisits: number;
  totalLeads: number;
  conversionRate: string;
  topKeywords: Array<{
    keyword: string;
    visits: number;
    leads: number;
    position: number | null;
  }>;
}

export default function SEOPage() {
  const [summary, setSummary] = useState<SEOSummary | null>(null);
  const [period, setPeriod] = useState(30);

  const fetchSEO = useCallback(async () => {
    try {
      const res = await fetch(`/api/seo/analytics?days=${period}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch {
      // Empty state
    }
  }, [period]);

  useEffect(() => { fetchSEO(); }, [fetchSEO]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            SEO & Growth
          </h1>
        </div>
        <div className="flex items-center gap-1 bg-surface dark:bg-navy/50 rounded-lg p-1">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-3 py-1 rounded-md text-xs font-montserrat font-medium transition-colors ${
                period === d
                  ? 'bg-navy text-white dark:bg-gold dark:text-navy'
                  : 'text-navy/60 dark:text-white/60'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="!p-4">
          <Globe size={16} className="text-gold mb-2" />
          <p
            className="text-2xl font-bold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.dmSerif }}
          >
            {summary?.totalVisits?.toLocaleString() || '0'}
          </p>
          <p className="text-xs text-navy/50 dark:text-white/50 font-inter">Organic Visits</p>
        </Card>
        <Card className="!p-4">
          <Users size={16} className="text-green-500 mb-2" />
          <p
            className="text-2xl font-bold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.dmSerif }}
          >
            {summary?.totalLeads || '0'}
          </p>
          <p className="text-xs text-navy/50 dark:text-white/50 font-inter">Lead Captures</p>
        </Card>
        <Card className="!p-4">
          <Target size={16} className="text-blue-500 mb-2" />
          <p
            className="text-2xl font-bold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.dmSerif }}
          >
            {summary?.conversionRate || '0'}%
          </p>
          <p className="text-xs text-navy/50 dark:text-white/50 font-inter">Conversion Rate</p>
        </Card>
        <Card className="!p-4">
          <Search size={16} className="text-purple-500 mb-2" />
          <p
            className="text-2xl font-bold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.dmSerif }}
          >
            {summary?.topKeywords?.length || '0'}
          </p>
          <p className="text-xs text-navy/50 dark:text-white/50 font-inter">Tracked Keywords</p>
        </Card>
      </div>

      {/* Top Keywords */}
      <Card className="!p-6 mb-6">
        <h3 className="text-sm font-montserrat font-semibold text-navy dark:text-white mb-4">
          Keyword Performance
        </h3>
        {summary?.topKeywords && summary.topKeywords.length > 0 ? (
          <div className="space-y-3">
            {summary.topKeywords.map((kw, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xs font-mono text-navy/40 dark:text-white/40 w-6">
                    {i + 1}
                  </span>
                  <span className="text-sm font-inter text-navy dark:text-white">
                    {kw.keyword}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {kw.position && (
                    <Badge variant={kw.position <= 10 ? 'success' : kw.position <= 20 ? 'gold' : 'navy'}>
                      #{kw.position}
                    </Badge>
                  )}
                  <span className="text-xs font-inter text-navy/50 dark:text-white/50 w-20 text-right">
                    {kw.visits} visits
                  </span>
                  <span className="text-xs font-inter text-green-500 w-16 text-right">
                    {kw.leads} leads
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <BarChart3 size={32} className="text-gold mx-auto mb-3 opacity-50" />
            <p className="text-sm text-navy/50 dark:text-white/50 font-inter">
              No keyword data yet. SEO tracking data will appear here as traffic comes in.
            </p>
          </div>
        )}
      </Card>

      {/* Target Keywords */}
      <Card className="!p-6">
        <h3 className="text-sm font-montserrat font-semibold text-navy dark:text-white mb-4">
          Target Keywords for LiconaRealty.com
        </h3>
        <div className="flex flex-wrap gap-2">
          {TARGET_KEYWORDS.map(kw => (
            <span
              key={kw}
              className="px-3 py-1.5 rounded-full text-xs font-inter bg-navy/5 dark:bg-white/5 text-navy/60 dark:text-white/60 border border-gold/10"
            >
              {kw}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
