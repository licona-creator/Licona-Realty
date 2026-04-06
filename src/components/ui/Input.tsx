/**
 * Brand Input Component
 *
 * Consistent form input styling across the platform.
 * Dark theme with gold focus state.
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
    const hasAsterisk = label?.endsWith(' *') ?? false;
    const labelText = hasAsterisk ? label!.slice(0, -2) : label;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-montserrat font-medium text-[rgba(255,255,255,0.65)] mb-1.5"
          >
            {labelText}
            {hasAsterisk && <span className="text-[#d3a971] ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-3 rounded-xl
            bg-[var(--lr-depth-1)]
            border border-[rgba(255,255,255,0.1)]
            text-white
            font-inter text-sm
            placeholder:text-white/40
            focus:outline-none focus:ring-2 focus:ring-[rgba(211,169,113,0.2)] focus:border-[#d3a971]
            transition-all duration-200 ease-in-out
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:ring-red-500/50' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-400 font-inter">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-white/50 font-inter">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
