/**
 * Brand Badge Component
 *
 * Used for approval queue count, status indicators, and labels.
 * Gold badge for approval queue - visible on every screen.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface BadgeProps {
  count?: number;
  variant?: 'gold' | 'navy' | 'success' | 'warning' | 'danger';
  label?: string;
  children?: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

const variantStyles = {
  gold: 'bg-gold text-navy',
  navy: 'bg-navy text-gold',
  success: 'bg-green-500 text-white',
  warning: 'bg-amber-500 text-white',
  danger: 'bg-red-500 text-white',
};

export function Badge({ count, variant = 'gold', label, children, className = '', pulse = false }: BadgeProps) {
  const displayValue = children || label || (count !== undefined ? (count >= 10 ? '9+' : String(count)) : '');

  if (count !== undefined && count <= 0) return null;

  return (
    <AnimatePresence>
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className={`
          inline-flex items-center justify-center
          min-w-[20px] h-5 px-1.5
          rounded-full text-xs font-montserrat font-bold
          ${variantStyles[variant]}
          ${pulse ? 'animate-pulse' : ''}
          ${className}
        `}
      >
        {displayValue}
      </motion.span>
    </AnimatePresence>
  );
}
