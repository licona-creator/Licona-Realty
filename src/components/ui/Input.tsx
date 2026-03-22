/**
 * Brand Input Component
 *
 * Consistent form input styling across the platform.
 * Border radius: 8px
 * Gold focus state with 200ms ease transition
 */

'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-montserrat font-medium text-text dark:text-white mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5 rounded-[8px]
            bg-white dark:bg-dark-card
            border border-gold-15
            text-text dark:text-white
            font-inter text-sm
            placeholder:text-text/40 dark:placeholder:text-white/40
            focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
            transition-all duration-200 ease-in-out
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:ring-red-500/50' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-500 font-inter">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-text/50 dark:text-white/50 font-inter">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
