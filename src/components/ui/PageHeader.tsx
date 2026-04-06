'use client';

import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, icon, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4 lg:mb-6">
      <div className="flex items-center gap-3">
        {icon && <span className="text-gold">{icon}</span>}
        <div>
          <h1 className="text-2xl font-playfair font-bold text-navy dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs font-inter text-navy/50 dark:text-white/50 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
    </div>
  );
}
