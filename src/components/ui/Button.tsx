/**
 * Brand Button Component
 *
 * Primary (gold bg, navy text), Secondary (navy bg, gold text),
 * Ghost (transparent), Danger (red). Press animation: scale(0.97).
 * Border radius: rounded-xl. Montserrat semibold.
 */

'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantStyles = {
  primary:
    'bg-navy text-gold font-montserrat font-semibold hover:bg-navy/90',
  accent:
    'bg-gold text-navy font-montserrat font-semibold hover:brightness-105',
  ghost:
    'bg-transparent text-navy dark:text-white font-montserrat font-medium hover:bg-gold/10 border border-gold/15',
  danger:
    'bg-red-600 text-white font-montserrat font-semibold hover:bg-red-700',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, disabled, className = '', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={`
          inline-flex items-center justify-center gap-2
          rounded-xl transition-all duration-150 ease-out
          focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          active:scale-[0.97]
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
