/**
 * Licona Realty Design System
 *
 * Shared constants, reusable CSS class strings, and utility functions
 * for the brand system. Single source of truth for design tokens.
 * FORCED DARK MODE - no light mode classes needed.
 */

// ============================================
// Color Constants
// ============================================

export const colors = {
  navy: '#132236',
  gold: '#d3a971',
  surface: '#132236',
  text: '#ffffff',
  white: '#ffffff',
  navyLight: '#1a2d47',
  darkCard: '#1a2d42',
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
  headingLg: 'font-playfair font-bold text-2xl text-white',
  headingSm: 'font-playfair font-bold text-lg text-white',
  body: 'font-inter text-sm text-white/80',
  bodyMedium: 'font-inter text-sm font-medium text-white',
  caption: 'font-inter text-xs text-white/50',
  label: 'font-montserrat text-xs font-semibold uppercase tracking-wider text-white/40',
  navLabel: 'font-montserrat text-[10px] font-medium',
  buttonText: 'font-montserrat font-semibold text-sm',
} as const;

// ============================================
// Component Class Strings
// ============================================

export const cardClasses = {
  base: 'lr-card p-5',
  hover: 'hover:shadow-md hover:scale-[1.01] transition-all duration-150',
  goldBorder: 'lr-card-gold',
  elevated: 'lr-card-elevated',
} as const;

export const buttonClasses = {
  primary: 'lr-btn-gold font-montserrat font-semibold px-5 py-2.5 text-sm active:scale-[0.97] transition-all duration-100',
  secondary: 'bg-[var(--lr-depth-2)] text-[#d3a971] font-montserrat font-semibold rounded-xl px-5 py-2.5 text-sm active:scale-[0.97] transition-all duration-100 border border-[rgba(211,169,113,0.2)]',
  outline: 'bg-transparent text-white font-montserrat font-medium rounded-xl px-5 py-2.5 text-sm border border-[rgba(211,169,113,0.2)] active:scale-[0.97] transition-all duration-100 hover:bg-[rgba(211,169,113,0.1)]',
  ghost: 'bg-transparent text-white font-montserrat font-medium rounded-xl px-5 py-2.5 text-sm active:scale-[0.97] transition-all duration-100 hover:bg-[rgba(211,169,113,0.1)]',
} as const;

export const badgeClasses = {
  gold: 'bg-[rgba(211,169,113,0.15)] text-[#d3a971] font-montserrat font-semibold text-[10px] uppercase px-2.5 py-1 rounded-full',
  navy: 'bg-white/10 text-white font-montserrat font-semibold text-[10px] uppercase px-2.5 py-1 rounded-full',
  success: 'bg-green-500/10 text-green-400 font-montserrat font-semibold text-[10px] uppercase px-2.5 py-1 rounded-full',
  warning: 'bg-amber-500/10 text-amber-400 font-montserrat font-semibold text-[10px] uppercase px-2.5 py-1 rounded-full',
  danger: 'bg-red-500/10 text-red-400 font-montserrat font-semibold text-[10px] uppercase px-2.5 py-1 rounded-full',
  outline: 'border border-[rgba(211,169,113,0.2)] text-white/60 font-montserrat font-semibold text-[10px] uppercase px-2.5 py-1 rounded-full',
} as const;

export const inputClasses = 'w-full px-4 py-2.5 rounded-xl bg-[var(--lr-depth-1)] border border-[rgba(255,255,255,0.1)] text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(211,169,113,0.5)] focus:border-[#d3a971] transition-all duration-200';

export const pageLayout = 'p-4 pb-24 pt-4 lg:p-8 lg:pb-8 max-w-7xl mx-auto animate-fade-in';

// ============================================
// Utility: merge class names (simple cn)
// ============================================

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
