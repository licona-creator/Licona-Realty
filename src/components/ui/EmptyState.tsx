'use client';

import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl bg-white dark:bg-dark-card border border-gold/15 shadow-[0_2px_8px_rgba(19,34,54,0.08)] p-8 text-center">
      {icon && (
        <div className="text-gold mx-auto mb-4 opacity-50 flex items-center justify-center">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-montserrat font-semibold text-navy dark:text-white mb-2">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-navy/50 dark:text-white/50 font-inter max-w-md mx-auto mb-6">
          {description}
        </p>
      )}
      {action && <div className="flex items-center justify-center gap-3">{action}</div>}
    </div>
  );
}
