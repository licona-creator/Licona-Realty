'use client';

import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: 'up' | 'down' | null;
  trendLabel?: string;
  accent?: boolean;
  compact?: boolean;
}

export function StatCard({ label, value, icon, trend, trendLabel, accent, compact }: StatCardProps) {
  return (
    <div
      className={`
        rounded-2xl bg-white dark:bg-dark-card border border-gold/15
        shadow-[0_2px_8px_rgba(19,34,54,0.08)]
        ${accent ? 'border-l-4 border-l-gold' : ''}
        ${compact ? 'p-3' : 'p-4'}
        transition-shadow duration-150
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-montserrat text-[10px] font-semibold uppercase tracking-wider text-navy/40 dark:text-white/40">
          {label}
        </span>
        {icon && <span className="text-gold">{icon}</span>}
      </div>
      <p className="font-playfair font-bold text-xl text-navy dark:text-white">
        {value}
      </p>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          {trend === 'up' ? (
            <TrendingUp size={12} className="text-green-500" />
          ) : (
            <TrendingDown size={12} className="text-red-500" />
          )}
          {trendLabel && (
            <span className={`font-inter text-[10px] ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
