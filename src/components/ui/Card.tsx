/**
 * Brand Card Component
 *
 * White background, gold/15 border, rounded-2xl, subtle shadow.
 * Hover elevation with scale(1.01). Gold left border for emphasis.
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
    'rounded-2xl border border-gold/15 p-5 bg-dark-card shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-shadow duration-150';

  const variantStyles = {
    default: '',
    approval: 'border-l-4 border-l-gold',
    elevated: 'shadow-lg',
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
