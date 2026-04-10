export const colors = {
  navy: '#132236',
  gold: '#d3a971',

  light: {
    background: '#ffffff',
    backgroundSecondary: '#f7f5f0',
    backgroundTertiary: '#efece6',
    text: '#132236',
    textSecondary: '#6b6965',
    textTertiary: '#8a8580',
    border: '#e8e5de',
    borderSecondary: '#d5d0c8',
    cardBackground: '#ffffff',
    cardShadow: 'rgba(0,0,0,0.04)',
    goldAccent: '#b8924a',
    success: '#2d7a3a',
    warning: '#b8924a',
    danger: '#c4342d',
    tabBarBackground: '#f7f5f0',
    tabBarBorder: '#e8e5de',
    tabActive: '#132236',
    tabInactive: '#8a8580',
  },

  dark: {
    background: '#0d1a2a',
    backgroundSecondary: '#132236',
    backgroundTertiary: '#1a2d45',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.6)',
    textTertiary: 'rgba(255,255,255,0.4)',
    border: 'rgba(255,255,255,0.08)',
    borderSecondary: 'rgba(255,255,255,0.15)',
    cardBackground: 'rgba(255,255,255,0.04)',
    cardShadow: 'rgba(0,0,0,0)',
    goldAccent: '#d3a971',
    success: '#4ade80',
    warning: '#d3a971',
    danger: '#ef4444',
    tabBarBackground: 'rgba(19,34,54,0.95)',
    tabBarBorder: 'rgba(255,255,255,0.08)',
    tabActive: '#d3a971',
    tabInactive: 'rgba(255,255,255,0.4)',
  },
};

export const typography = {
  families: {
    heading: 'PlayfairDisplay-Bold',
    nav: 'Montserrat-Medium',
    navSemibold: 'Montserrat-SemiBold',
    body: 'Inter-Regular',
    bodyMedium: 'Inter-Medium',
    bodySemibold: 'Inter-SemiBold',
  },
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};
