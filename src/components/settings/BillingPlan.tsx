/**
 * Billing & Plan Settings Section
 *
 * Transparent billing information, infrastructure costs breakdown,
 * usage meters, and upgrade prompts.
 */

'use client';

import { Card } from '@/components/ui/Card';
import { BRAND } from '@/lib/brand';
import {
  CreditCard,
  Server,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

function UsageMeter({
  label,
  used,
  limit,
  unit,
  warningThreshold = 80,
}: {
  label: string;
  used: number;
  limit: number;
  unit: string;
  warningThreshold?: number;
}) {
  const percentage = Math.round((used / limit) * 100);
  const isWarning = percentage >= warningThreshold;

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-navy/50 dark:text-white/50 font-inter">{label}</span>
        <span className={`font-inter ${isWarning ? 'text-amber-600 font-semibold' : 'text-navy/40 dark:text-white/40'}`}>
          {used.toLocaleString()} / {limit.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface dark:bg-navy/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isWarning ? 'bg-amber-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isWarning && (
        <div className="flex items-center gap-1 mt-1">
          <AlertTriangle size={10} className="text-amber-500" />
          <span className="text-[10px] text-amber-600 font-inter">
            Approaching free tier limit ({percentage}% used)
          </span>
        </div>
      )}
    </div>
  );
}

export function BillingPlan() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Section Header */}
      <div>
        <h2
          className="text-xl font-semibold text-navy dark:text-white"
          style={{ fontFamily: BRAND.fonts.playfair }}
        >
          Billing & Plan
        </h2>
        <p className="text-sm text-navy/50 dark:text-white/50 font-inter mt-1">
          View your current plan, infrastructure costs, and usage.
          Stay ahead of tier limits with usage tracking.
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <CreditCard size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-navy dark:text-white">Current Plan</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Plan</p>
            <p className="text-sm font-montserrat font-semibold text-navy dark:text-white">Starter</p>
          </div>
          <div>
            <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Monthly Cost</p>
            <p className="text-sm font-montserrat font-semibold text-navy dark:text-white">$0</p>
            <p className="text-[10px] text-navy/30 dark:text-white/30 font-inter">Free tier</p>
          </div>
          <div>
            <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Renewal</p>
            <p className="text-sm font-montserrat font-semibold text-navy dark:text-white">N/A</p>
          </div>
          <div>
            <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Payment Method</p>
            <p className="text-sm font-montserrat font-semibold text-navy dark:text-white/40">None on file</p>
          </div>
        </div>
      </Card>

      {/* Infrastructure Costs */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Server size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-navy dark:text-white">Infrastructure Costs</h3>
        </div>

        {/* Supabase */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-montserrat font-semibold text-navy dark:text-white">Supabase</h4>
            <span className="text-xs text-green-600 font-inter">Free Tier</span>
          </div>
          <div className="space-y-3">
            <UsageMeter label="Database storage" used={28} limit={500} unit="MB" />
            <UsageMeter label="Database rows" used={1420} limit={50000} unit="rows" />
            <UsageMeter label="API calls (monthly)" used={12500} limit={500000} unit="calls" />
            <UsageMeter label="Storage" used={45} limit={1000} unit="MB" />
            <UsageMeter label="Realtime connections" used={2} limit={200} unit="concurrent" />
          </div>
          <a
            href="https://supabase.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gold hover:underline font-inter mt-2 inline-flex items-center gap-1"
          >
            View Supabase pricing <ExternalLink size={10} />
          </a>
        </div>

        {/* Vercel */}
        <div className="mb-6 pt-4 border-t border-gold/15 dark:border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-montserrat font-semibold text-navy dark:text-white">Vercel</h4>
            <span className="text-xs text-green-600 font-inter">Hobby Plan</span>
          </div>
          <div className="space-y-3">
            <UsageMeter label="Bandwidth" used={3.2} limit={100} unit="GB" />
            <UsageMeter label="Build minutes" used={45} limit={6000} unit="min" />
            <UsageMeter label="Serverless executions" used={8200} limit={100000} unit="calls" />
          </div>
          <a
            href="https://vercel.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gold hover:underline font-inter mt-2 inline-flex items-center gap-1"
          >
            View Vercel pricing <ExternalLink size={10} />
          </a>
        </div>

        {/* Google APIs */}
        <div className="mb-6 pt-4 border-t border-gold/15 dark:border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-montserrat font-semibold text-navy dark:text-white">Google APIs</h4>
            <span className="text-xs text-green-600 font-inter">$200/mo Free Credit</span>
          </div>
          <div className="space-y-3">
            <UsageMeter label="Maps JavaScript API" used={850} limit={28500} unit="loads" />
            <UsageMeter label="Geocoding API" used={120} limit={40000} unit="calls" />
            <UsageMeter label="Gmail API" used={0} limit={10000} unit="calls" />
            <UsageMeter label="Calendar API" used={0} limit={10000} unit="calls" />
          </div>
          <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-2">
            Estimated cost this month: $0.00 (within free credit)
          </p>
        </div>

        {/* DocuSign */}
        <div className="pt-4 border-t border-gold/15 dark:border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-montserrat font-semibold text-navy dark:text-white">DocuSign</h4>
            <span className="text-xs text-amber-600 font-inter">Developer Sandbox (Free)</span>
          </div>
          <p className="text-xs text-navy/50 dark:text-white/50 font-inter">
            Currently using the free developer sandbox. Production plans start at $10/month
            for individual use with pay-per-envelope pricing.
          </p>
          <a
            href="https://www.docusign.com/products-and-pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gold hover:underline font-inter mt-2 inline-flex items-center gap-1"
          >
            View DocuSign pricing <ExternalLink size={10} />
          </a>
        </div>
      </Card>

      {/* Total Estimated Cost */}
      <Card variant="elevated">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-montserrat font-semibold text-navy dark:text-white">
              Estimated Monthly Infrastructure Cost
            </h3>
            <p className="text-xs text-navy/50 dark:text-white/50 font-inter mt-0.5">
              All services currently within free tier limits
            </p>
          </div>
          <p
            className="text-3xl font-semibold text-gold"
            style={{ fontFamily: BRAND.fonts.dmSerif }}
          >
            $0
          </p>
        </div>
      </Card>

      {/* Upgrade Prompts */}
      <Card>
        <h3 className="text-base font-montserrat font-semibold text-navy dark:text-white mb-4">Upgrade Alerts</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-[8px] bg-surface dark:bg-navy/50">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-navy dark:text-white font-inter">Supabase</p>
              <p className="text-xs text-navy/40 dark:text-white/40 font-inter">
                Well within free tier limits. No upgrade needed.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-[8px] bg-surface dark:bg-navy/50">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-navy dark:text-white font-inter">Google Maps</p>
              <p className="text-xs text-navy/40 dark:text-white/40 font-inter">
                Using 3% of monthly free credit. No overage expected.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-[8px] bg-amber-50 border border-amber-200">
            <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-navy dark:text-white font-inter">DocuSign</p>
              <p className="text-xs text-amber-700 font-inter">
                When ready to send legally binding documents, a production account is required.
                Individual plans start at $10/month.
              </p>
              <a
                href="https://www.docusign.com/products-and-pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gold hover:underline font-inter mt-1 inline-flex items-center gap-1"
              >
                View pricing and upgrade <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
