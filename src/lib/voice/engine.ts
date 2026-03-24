/**
 * Licona Realty Voice and Tone Engine
 *
 * Anthony's voice profile - hardcoded baseline, continuously refined.
 * Every AI-generated client-facing content runs through this engine
 * before reaching the approval queue.
 *
 * Voice engine NEVER sends anything externally. It prepares and queues only.
 */

import type { VoiceToneMode, LanguagePreference } from '@/types/database';

// ============================================
// Banned Phrases - hardcoded, NEVER used anywhere
// ============================================

export const BANNED_PHRASES: string[] = [
  'I hope this message finds you well',
  "Don't hesitate to reach out",
  'As per my last email',
  'Excited to connect',
  'Circling back',
  'Touching base',
  'Synergy',
  'At the end of the day',
  'Game changer',
  'Innovative solution',
  'I wanted to follow up with you regarding',
  'As a real estate professional',
  'Please let me know if you have any questions',
];

// Patterns for dynamic detection of banned phrase variants
const BANNED_PATTERNS: RegExp[] = [
  /I\s+wanted\s+to\s+follow\s+up\s+with\s+you\s+regarding/i,
  /As\s+a\s+real\s+estate\s+professional/i,
  /Please\s+let\s+me\s+know\s+if\s+you\s+have\s+any\s+questions\.?\s*$/i,
  /\u2014/g, // Em dashes banned everywhere
];

// ============================================
// Voice Tone Profiles
// ============================================

export interface VoiceToneProfile {
  mode: VoiceToneMode;
  label: string;
  description: string;
  guidelines: string[];
}

export const VOICE_TONE_PROFILES: Record<VoiceToneMode, VoiceToneProfile> = {
  casual_friend: {
    mode: 'casual_friend',
    label: 'Casual Friend',
    description: 'Warm, genuine, like texting a friend. For sphere contacts, warm leads, post-closing check-ins.',
    guidelines: [
      'Short punchy sentences - no paragraph walls',
      'Sounds like a real person texting, not a script',
      'Warm and genuine - relationship first, business second',
      'Occasional humor and personality encouraged',
      'Never mentions real estate unless naturally relevant',
      'No formal greetings or sign-offs',
    ],
  },
  professional_personal: {
    mode: 'professional_personal',
    label: 'Professional Personal',
    description: 'Professional but still personal. For new leads, formal follow-ups, email campaigns.',
    guidelines: [
      'Professional tone but never stiff or robotic',
      'Still sounds like Anthony, just more buttoned up',
      'Clear and direct - gets to the point',
      'Warm opening, value-driven middle, clear next step',
      'Uses proper grammar but keeps it conversational',
    ],
  },
  bilingual_casual: {
    mode: 'bilingual_casual',
    label: 'Bilingual Casual',
    description: 'English and Spanish mixed naturally. Like a bilingual DFW agent would actually talk.',
    guidelines: [
      'Natural code-switching - not forced translation',
      'Spanish written the way a bilingual DFW agent would actually say it',
      'Mix of English and Spanish in the same message when natural',
      'Cultural warmth and genuineness',
      'Never a literal word-for-word translation',
    ],
  },
  bilingual_professional: {
    mode: 'bilingual_professional',
    label: 'Bilingual Professional',
    description: 'Formal bilingual for official communications.',
    guidelines: [
      'Proper Spanish grammar and formality',
      'Professional tone in both languages',
      'Respectful and clear',
      'Can include both languages or choose one based on context',
    ],
  },
  celebratory: {
    mode: 'celebratory',
    label: 'Celebratory',
    description: 'Excitement and genuine happiness. For under contract, just closed, milestones.',
    guidelines: [
      'Genuine excitement - celebrating the client, not the agent',
      'Humble and warm, never boastful',
      'Short and energetic',
      'Focus on what this means for the client',
      'Sacramento script headlines allowed: "Just Closed!" "Under Contract!" "Congratulations!"',
    ],
  },
  empathetic: {
    mode: 'empathetic',
    label: 'Empathetic',
    description: 'Sensitive and supportive. For credit challenges, divorce, financial stress, job changes.',
    guidelines: [
      'Lead with understanding, not solutions',
      'Acknowledge the difficulty of their situation',
      'Patient and non-judgmental',
      'Never pushy or salesy',
      'Offer help without pressure',
      'Respect their timeline and decisions',
    ],
  },
  investor_analytical: {
    mode: 'investor_analytical',
    label: 'Investor Analytical',
    description: 'Data-first but still personal. For investor communications.',
    guidelines: [
      'Lead with numbers and data',
      'Clear ROI and market analysis',
      'Still personal - this is Anthony sharing insights, not a report',
      'Direct and efficient',
      'Include specific DFW market data when relevant',
    ],
  },
};

// ============================================
// Quick Adjustment Options
// ============================================

export const VOICE_ADJUSTMENTS = [
  'More casual',
  'More professional',
  'Shorter',
  'Add some personality',
  'Translate to Spanish',
  'Make it bilingual',
  'Remove the sales feel',
  'Make it warmer',
  'Start over',
] as const;

export type VoiceAdjustment = (typeof VOICE_ADJUSTMENTS)[number];

// ============================================
// Voice Engine Core Functions
// ============================================

/**
 * Check content for banned phrases and em dashes.
 * Returns list of violations found.
 */
export function checkBannedPhrases(content: string): string[] {
  const violations: string[] = [];

  // Check exact banned phrases (case insensitive)
  for (const phrase of BANNED_PHRASES) {
    if (content.toLowerCase().includes(phrase.toLowerCase())) {
      violations.push(`Banned phrase detected: "${phrase}"`);
    }
  }

  // Check pattern-based bans
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(content)) {
      const patternName = pattern.source.includes('\u2014')
        ? 'Em dash detected (banned in all platform content)'
        : `Banned pattern matched: ${pattern.source}`;
      if (!violations.includes(patternName)) {
        violations.push(patternName);
      }
    }
  }

  return violations;
}

/**
 * Get the voice profile for a given tone mode.
 */
export function getVoiceProfile(mode: VoiceToneMode): VoiceToneProfile {
  return VOICE_TONE_PROFILES[mode];
}

/**
 * Determine the recommended tone mode based on context.
 */
export function recommendToneMode(context: {
  trackType?: string;
  isSphere?: boolean;
  isHoliday?: boolean;
  isMilestone?: boolean;
  isFormalDocument?: boolean;
  hasFinancialStress?: boolean;
  language?: LanguagePreference;
}): VoiceToneMode {
  if (context.hasFinancialStress) return 'empathetic';
  if (context.isMilestone) return 'celebratory';
  if (context.isFormalDocument && context.language === 'es') return 'bilingual_professional';
  if (context.isFormalDocument) return 'professional_personal';
  if (context.language === 'bilingual') return 'bilingual_casual';
  if (context.isSphere || context.isHoliday) return 'casual_friend';
  if (context.trackType === 'investor') return 'investor_analytical';
  return 'professional_personal';
}

/**
 * Format the social media post footer bar.
 * Every post includes this - it's a business card.
 */
export function getSocialPostFooter(includeLicense = true): string {
  const footer = 'Anthony Licona | Realtor | (469) 968-7688 | licona@liconarealty.com';
  return includeLicense ? `${footer}\nTREC Lic. 0821484-SA` : footer;
}

/**
 * Get the email signature block for campaign emails.
 */
export function getEmailSignature(language: LanguagePreference = 'en'): string {
  const lines = [
    'Anthony Licona',
    'North Texas Realtor',
    language === 'es' ? 'Hablo Español' : '',
    'Central Metro Realty',
    '(469) 968-7688',
    'licona@liconarealty.com',
    'LiconaRealty.com',
    '',
    'Smart Moves. Simple Decisions.',
    '',
    'TREC Lic. 0821484-SA',
  ].filter(Boolean);

  return lines.join('\n');
}
