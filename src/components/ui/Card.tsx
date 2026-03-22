/**
 * Brand Card Component
 *
 * Light mode: #f4f4f4 background, 1px border in #d3a971 at 15% opacity
 * Dark mode: #1a2535 background
 * Border radius: 12px
 * Box shadow: brand standard
 */

'use client';

import { type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'approval' | 'elevated';
}

export function Card({
  variant = 'default',
  children,
  className = '',
  ...props
}: CardProps) {
  const baseStyles =
    'rounded-[12px] border border-gold-15 p-5 bg-surface dark:bg-dark-card shadow-[0_2px_12px_rgba(19,34,54,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)]';

  const variantStyles = {
    default: '',
    approval: 'border-l-4 border-l-gold',
    elevated: 'shadow-[0_4px_24px_rgba(19,34,54,0.12)]',
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
