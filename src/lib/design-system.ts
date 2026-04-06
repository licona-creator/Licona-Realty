/**
 * Licona Realty Design System
 *
 * Shared constants, reusable CSS class strings, and utility functions
 * for the brand system. Single source of truth for design tokens.
 */

// ============================================
// Color Constants
// ============================================

export const colors = {
  navy: '#132236',
  gold: '#d3a971',
  surface: '#f4f4f4',
  text: '#1a1a1a',
  white: '#ffffff',
  navyLight: '#1a2d47',
  darkCard: '#1a2535',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  goldGradient: 'linear-gradient(135deg, #d3a971 0%, #e8c89a 50%, #d3a971 100%)',
  navyGradient: 'linear-gradient(180deg, #132236 0%, #1a2d42 100%)',
} as const;

// ============================================
// Typography Classes
// ============================================

export const typography = {
  headingLg: 'font-playfair font-bold text-2xl text-navy dark:text-white',
  headingSm: 'font-playfair font-bold text-lg text-navy dark:text-white',
  body: 'font-inter text-sm text-text dark:text-white/80',
  bodyMedium: 'font-inter text-sm font-medium text-navy dark:text-white',
  caption: 'font-inter text-xs text-navy/50 dark:text-white/50',
  label: 'font-montserrat text-xs font-semibold uppercase tracking-wider text-navy/40 dark:text-white/40',
  navLabel: 'font-montserrat text-[10px] font-medium',
  buttonText: 'font-montserrat font-semibold text-sm',
} as const;

// ============================================
// Component Class Strings
// ============================================

export const cardClasses = {
  base: 'rounded-2xl bg-white dark:bg-dark-card border border-gold/15 shadow-[0_2px_8px_rgba(19,34,54,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] p-5 transition-shadow duration-150',
  hover: 'hover:shadow-md hover:scale-[1.01] transition-all duration-150',
  goldBorder: 'border-l-4 border-l-gold',
  elevated: 'shadow-lg',
} as const;

export const buttonClasses = {
  primary: 'bg-gold text-navy font-montserrat font-semibold rounded-xl px-5 py-2.5 text-sm active:scale-[0.97] transition-all duration-100 hover:brightness-105',
  secondary: 'bg-navy text-gold font-montserrat font-semibold rounded-xl px-5 py-2.5 text-sm active:scale-[0.97] transition-all duration-100 hover:bg-navy/90',
  outline: 'bg-transparent text-navy dark:text-white font-montserrat font-medium rounded-xl px-5 py-2.5 text-sm border border-gold/20 active:scale-[0.97] transition-all duration-100 hover:bg-gold/10',
  ghost: 'bg-transparent text-navy dark:text-white font-montserrat font-medium rounded-xl px-5 py-2.5 text-sm active:scale-[0.97] transition-all duration-100 hover:bg-gold/10',
} as const;

export const badgeClasses = {
  gold: 'bg-gold/10 text-gold font-montserrat font-semibold text-[10px] uppercase px-2.5 py-1 rounded-full',
  navy: 'bg-navy/10 text-navy dark:bg-white/10 dark:text-white font-montserrat font-semibold text-[10px] uppercase px-2.5 py-1 rounded-full',
  success: 'bg-green-500/10 text-green-600 font-montserrat font-semibold text-[10px] uppercase px-2.5 py-1 rounded-full',
  warning: 'bg-amber-500/10 text-amber-600 font-montserrat font-semibold text-[10px] uppercase px-2.5 py-1 rounded-full',
  danger: 'bg-red-500/10 text-red-600 font-montserrat font-semibold text-[10px] uppercase px-2.5 py-1 rounded-full',
  outline: 'border border-gold/20 text-navy/60 dark:text-white/60 font-montserrat font-semibold text-[10px] uppercase px-2.5 py-1 rounded-full',
} as const;

export const inputClasses = 'w-full px-4 py-2.5 rounded-xl bg-white dark:bg-dark-card border border-navy/10 dark:border-white/10 text-navy dark:text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all duration-200';

export const pageLayout = 'p-4 pb-24 pt-4 lg:p-8 lg:pb-8 max-w-7xl mx-auto animate-fade-in';

// ============================================
// Utility: merge class names (simple cn)
// ============================================

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
