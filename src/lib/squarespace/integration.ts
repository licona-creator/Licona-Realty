/**
 * Squarespace / LiconaRealty.com Integration
 *
 * Manages SEO content injection, lead form handling,
 * and page analytics for the public-facing website.
 * Embeddable widgets: mortgage calculator, booking form, testimonials.
 */

import { BRAND } from '@/lib/brand';

// Embeddable widget URLs for Squarespace
export const EMBEDDABLE_WIDGETS = {
  mortgage_calculator: '/mortgage',
  booking_form: '/book',
  testimonials: '/testimonials',
} as const;

// SEO meta tags for public pages
export function generateSEOMeta(page: string): Record<string, string> {
  const base = {
    'og:site_name': 'Licona Realty',
    'og:type': 'website',
    'og:locale': 'en_US',
    'og:locale:alternate': 'es_US',
    'twitter:card': 'summary_large_image',
    'twitter:site': '@liconarealty',
  };

  const pages: Record<string, Record<string, string>> = {
    home: {
      title: `${BRAND.agent.name} | ${BRAND.agent.title} | ${BRAND.tagline}`,
      description: `Bilingual North Texas realtor specializing in DFW residential real estate. ${BRAND.agent.bilingual}. Smart Moves. Simple Decisions.`,
      keywords: 'DFW realtor, North Texas real estate, bilingual realtor Dallas, Spanish speaking agent DFW, buy home Dallas',
    },
    mortgage: {
      title: 'Free DFW Mortgage Calculator | Licona Realty',
      description: 'Calculate your DFW home affordability. Free bilingual mortgage calculator. English and Spanish. Get personalized results.',
      keywords: 'DFW mortgage calculator, home affordability Dallas, how much house can I afford Texas',
    },
    testimonials: {
      title: 'Client Reviews | Licona Realty',
      description: `See what clients say about working with ${BRAND.agent.name}. Real reviews from DFW homebuyers and sellers.`,
      keywords: 'Licona Realty reviews, Dallas realtor reviews, DFW real estate agent testimonials',
    },
    booking: {
      title: 'Schedule a Consultation | Licona Realty',
      description: `Book a free consultation with ${BRAND.agent.name}. Buyer consultations, seller strategy, investor meetings. ${BRAND.agent.bilingual}.`,
      keywords: 'schedule realtor consultation DFW, book real estate agent Dallas, free home buying consultation',
    },
  };

  return {
    ...base,
    ...pages[page] || pages.home,
  };
}

// Generate structured data for the agent
export function getAgentStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: BRAND.agent.name,
    jobTitle: BRAND.agent.title,
    telephone: BRAND.agent.phoneE164,
    email: BRAND.agent.email,
    url: BRAND.agent.websiteUrl,
    image: `${BRAND.agent.websiteUrl}/anthony-licona.jpg`,
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'TX',
      addressCountry: 'US',
    },
    worksFor: {
      '@type': 'RealEstateAgent',
      name: BRAND.agent.brokerage,
    },
    knowsLanguage: ['English', 'Spanish'],
    areaServed: {
      '@type': 'Place',
      name: 'Dallas-Fort Worth Metroplex',
    },
    sameAs: [BRAND.agent.instagramUrl],
  };
}

// Embed code generator for Squarespace
export function generateEmbedCode(widget: keyof typeof EMBEDDABLE_WIDGETS, baseUrl: string): string {
  const url = `${baseUrl}${EMBEDDABLE_WIDGETS[widget]}`;
  return `<iframe src="${url}" width="100%" height="700" frameborder="0" style="border: none; border-radius: 12px;" loading="lazy" title="Licona Realty ${widget.replace('_', ' ')}"></iframe>`;
}
