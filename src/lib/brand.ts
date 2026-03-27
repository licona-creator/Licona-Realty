/**
 * Licona Realty Brand Constants
 *
 * Single source of truth for all brand identity, colors, typography,
 * and design tokens used throughout the platform. These values are
 * non-negotiable and must be used exactly as defined.
 */

export const BRAND = {
  // Agent Identity - hardcoded into all templates and public pages
  agent: {
    name: 'Anthony Licona',
    title: 'North Texas Realtor\u00AE',
    phone: '(469) 968-7688',
    phoneE164: '+14699687688',
    email: 'licona@liconarealty.com',
    website: 'LiconaRealty.com',
    websiteUrl: 'https://liconarealty.com',
    brokerage: 'Central Metro Realty',
    license: 'TREC Lic. 0821484-SA',
    bilingual: 'Hablo Español',
    instagram: '@liconarealty',
    instagramUrl: 'https://instagram.com/liconarealty',
  },

  // Brand Messaging
  tagline: 'Smart Moves. Simple Decisions.',
  logoTagline: 'SELL • BUY • INVEST',

  // Brand Colors - exact hex values, no substitutions
  colors: {
    primary: '#132236',      // Deep navy
    navy: '#132236',          // Alias for primary
    accent: '#d3a971',       // Warm gold
    gold: '#d3a971',          // Alias for accent
    surface: '#f4f4f4',      // Soft white
    text: '#1a1a1a',         // Near black
    white: '#ffffff',        // White for text on dark backgrounds
    navyLight: '#1a2d47',    // Gradient endpoint
    darkCard: '#1a2535',     // Dark mode card surface

    // Opacity variants
    photoOverlay: 'rgba(19, 34, 54, 0.55)',
    gold20: 'rgba(211, 169, 113, 0.20)',
    gold15: 'rgba(211, 169, 113, 0.15)',
    navy80: 'rgba(19, 34, 54, 0.80)',

    // Gradient
    heroGradient: 'linear-gradient(135deg, #132236, #1a2d47)',
  },

  // Brand Typography - all from Google Fonts
  fonts: {
    playfair: "'Playfair Display', serif",     // Display headings, hero text
    montserrat: "'Montserrat', sans-serif",    // Navigation, buttons, labels
    inter: "'Inter', sans-serif",              // Body text, content
    dmSerif: "'DM Serif Display', serif",      // Large numbers, pipeline values
    sacramento: "'Sacramento', cursive",       // Milestone headlines ONLY
  },

  // Design Tokens
  design: {
    borderRadius: {
      card: '12px',
      button: '8px',
      input: '8px',
      modal: '16px',
    },
    shadow: {
      light: '0 2px 12px rgba(19, 34, 54, 0.08)',
      dark: '0 2px 12px rgba(0, 0, 0, 0.3)',
    },
    transition: '200ms ease',
    cardBorder: '1px solid rgba(211, 169, 113, 0.15)',
  },

  // Social Post Template Formula
  socialPost: {
    overlayColor: 'rgba(19, 34, 54, 0.55)',
    monogramPosition: 'top-right',
    footerBar: {
      background: '#132236',
      text: 'Anthony Licona | Realtor\u00AE | (469) 968-7688 | licona@liconarealty.com',
      license: 'TREC Lic. 0821484-SA',
    },
  },

  // Map Pin Colors by Track Type
  mapPins: {
    buyer: { fill: '#3B82F6', border: '#d3a971' },
    seller: { fill: '#22C55E', border: '#d3a971' },
    landlord: { fill: '#A855F7', border: '#d3a971' },
    tenant: { fill: '#F97316', border: '#d3a971' },
    investor: { fill: '#d3a971', border: '#132236' },
    sphere: { fill: '#9CA3AF', border: '#d3a971' },
  },

  // Transaction Timeline Colors
  timeline: {
    safe: '#22C55E',      // >14 days
    warning: '#d3a971',   // 7-14 days
    urgent: '#EF4444',    // <7 days
  },
} as const;

// Social post footer text for templates
export const SOCIAL_FOOTER = `${BRAND.agent.name} | Realtor\u00AE | ${BRAND.agent.phone} | ${BRAND.agent.email}`;

// SEO footer text for public pages
export const SEO_FOOTER = `${BRAND.agent.name} | ${BRAND.agent.title} | ${BRAND.agent.brokerage} | ${BRAND.agent.license}`;

// Nav items for the platform
export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'home' },
  { label: 'Approval Queue', href: '/approval-queue', icon: 'check-circle', badge: true },
  { label: 'Contacts', href: '/contacts', icon: 'users' },
  { label: 'Partners', href: '/partners', icon: 'handshake' },
  { label: 'Transactions', href: '/transactions', icon: 'file-text' },
  { label: 'Campaigns', href: '/campaigns', icon: 'send' },
  { label: 'Social Media', href: '/social', icon: 'share-2' },
  { label: 'Map', href: '/map', icon: 'map-pin' },
  { label: 'Scheduling', href: '/scheduling', icon: 'calendar' },
  { label: 'Canva Studio', href: '/canva', icon: 'palette' },
  { label: 'SEO', href: '/seo', icon: 'trending-up' },
  { label: 'Testimonials', href: '/testimonials', icon: 'star' },
  { label: 'Mortgage Calc', href: '/mortgage', icon: 'calculator' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
] as const;
