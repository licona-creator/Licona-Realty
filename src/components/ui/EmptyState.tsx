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
    <div className="lr-card rounded-2xl p-8 text-center">
      {icon && (
        <div className="text-gold mx-auto mb-4 opacity-50 flex items-center justify-center">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-montserrat font-semibold text-white mb-2">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-white/50 font-inter max-w-md mx-auto mb-6">
          {description}
        </p>
      )}
      {action && <div className="flex items-center justify-center gap-3">{action}</div>}
    </div>
  );
}
