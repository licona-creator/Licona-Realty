/**
 * Voice Engine - Content Generator
 *
 * Generates all client-facing content in Anthony's authentic voice.
 * Every AI draft runs through voice engine before reaching approval queue.
 *
 * This module provides prompt templates for each content type,
 * enforces banned phrases, and tracks voice profile accuracy.
 *
 * NEVER sends anything externally. Prepare and queue only.
 */

import type { VoiceToneMode, LanguagePreference } from '@/types/database';
import {
  VOICE_TONE_PROFILES,
  checkBannedPhrases,
  getEmailSignature,
} from './engine';

// ============================================
// Content Generation Prompt Templates
// ============================================

interface ContentPrompt {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Build a system prompt for the AI that embodies Anthony's voice.
 */
function buildSystemPrompt(
  toneMode: VoiceToneMode,
  language: LanguagePreference
): string {
  const profile = VOICE_TONE_PROFILES[toneMode];

  return `You are writing as Anthony Licona, a bilingual real estate agent in the DFW (Dallas-Fort Worth) market.
You write in his authentic voice - not corporate, not scripted, genuinely personal.

VOICE PROFILE:
- Casual and direct in conversational messages
- Warm and genuine - relationship first, business second, always
- Never pushy, never salesy, never scripted
- Real language a person says out loud - not marketing copy
- Short punchy sentences in casual messages - no paragraph walls
- Not every message mentions real estate - some are just human moments

TONE MODE: ${profile.label}
${profile.guidelines.map((g) => `- ${g}`).join('\n')}

LANGUAGE: ${language === 'es' ? 'Write in Spanish naturally - not a literal translation. Write the way a bilingual DFW agent would actually say it.' : language === 'bilingual' ? 'Mix English and Spanish naturally - code-switch like a real bilingual person in DFW would.' : 'Write in English.'}

CRITICAL RULES - NEVER VIOLATE:
- NEVER use em dashes anywhere
- NEVER use these phrases: "I hope this message finds you well", "Don't hesitate to reach out", "As per my last email", "Excited to connect", "Circling back", "Touching base", "Synergy", "At the end of the day", "Game changer", "Innovative solution"
- NEVER start a sentence with "As a real estate professional"
- NEVER end with "Please let me know if you have any questions"
- NEVER use any variation of "I wanted to follow up with you regarding"
- Use hyphens (-) instead of em dashes when needed
- Keep it genuine, warm, and authentically Anthony`;
}

/**
 * Generate a campaign email draft prompt.
 */
export function buildCampaignEmailPrompt(params: {
  contactFirstName: string;
  contactTrackType: string;
  campaignStep: string;
  subject?: string;
  toneMode: VoiceToneMode;
  language: LanguagePreference;
  context?: string;
}): ContentPrompt {
  return {
    systemPrompt: buildSystemPrompt(params.toneMode, params.language),
    userPrompt: `Write a campaign email for ${params.contactFirstName}.

Contact type: ${params.contactTrackType}
Campaign step: ${params.campaignStep}
${params.subject ? `Subject line direction: ${params.subject}` : ''}
${params.context ? `Context: ${params.context}` : ''}

Write both:
1. A subject line (short, personal, no clickbait)
2. The email body

End with Anthony's name but no formal sign-off block. The email signature will be added automatically.
Keep it concise. Warm opening, value in the middle, clear natural close.`,
  };
}

/**
 * Generate a social media caption prompt.
 */
export function buildSocialCaptionPrompt(params: {
  platform: 'instagram' | 'facebook';
  contentPillar: string;
  topic: string;
  toneMode: VoiceToneMode;
  language: LanguagePreference;
  includeHashtags: boolean;
}): ContentPrompt {
  return {
    systemPrompt: buildSystemPrompt(params.toneMode, params.language),
    userPrompt: `Write a ${params.platform} caption for Anthony Licona's real estate account.

Content pillar: ${params.contentPillar}
Topic: ${params.topic}

Rules:
- Sound like a real person posting, not a brand
- Conversational and genuine
- Never ad-like unless it's a paid ad
- ${params.includeHashtags ? 'Include 5-8 relevant DFW-specific hashtags at the end (not a wall of 30 generic tags)' : 'No hashtags needed'}

Provide 3 caption options with different angles:
1. First option
2. Second option (different angle)
3. Third option (different angle)`,
  };
}

/**
 * Generate a holiday/milestone message prompt.
 */
export function buildHolidayMessagePrompt(params: {
  contactFirstName: string;
  occasion: string;
  toneMode: VoiceToneMode;
  language: LanguagePreference;
  includeRealEstate: boolean;
}): ContentPrompt {
  return {
    systemPrompt: buildSystemPrompt(params.toneMode, params.language),
    userPrompt: `Write a ${params.occasion} message to ${params.contactFirstName}.

Rules:
- Sound like a friend texting, not a business
- Warm and genuine
- ${params.includeRealEstate ? 'One casual natural sentence at the end about whether they know anyone looking' : 'NO real estate mention whatsoever - purely personal'}
- Keep it short - this is a text/message, not an essay
- Feel human and real`,
  };
}

/**
 * Generate a testimonial request prompt.
 */
export function buildTestimonialRequestPrompt(params: {
  contactFirstName: string;
  transactionType: string;
  toneMode: VoiceToneMode;
  language: LanguagePreference;
}): ContentPrompt {
  return {
    systemPrompt: buildSystemPrompt(params.toneMode, params.language),
    userPrompt: `Write a post-closing testimonial request to ${params.contactFirstName} who just completed a ${params.transactionType} transaction.

Rules:
- Warm, genuine, thankful
- Not pushy about the review
- Include that a Google review link is attached
- Keep it short and personal
- Express genuine gratitude for trusting Anthony with this`,
  };
}

/**
 * Generate a referral ask prompt.
 */
export function buildReferralAskPrompt(params: {
  contactFirstName: string;
  variant: 'direct' | 'soft';
  toneMode: VoiceToneMode;
  language: LanguagePreference;
}): ContentPrompt {
  return {
    systemPrompt: buildSystemPrompt(params.toneMode, params.language),
    userPrompt: `Write a referral request to ${params.contactFirstName}.

Style: ${params.variant === 'direct' ? 'Direct but warm ask - "If you know anyone..."' : 'Soft indirect - just checking in, naturally mentioning real estate at the end'}

Rules:
- Never pushy
- Relationship first
- Keep it genuinely personal
- Short - 2-3 sentences max`,
  };
}

// ============================================
// Content Post-Processing
// ============================================

/**
 * Process generated content through the voice engine.
 * Checks for banned phrases, removes em dashes, validates tone.
 */
export function processContent(content: string): {
  processed: string;
  violations: string[];
  cleanContent: string;
} {
  // Check for banned phrases
  const violations = checkBannedPhrases(content);

  // Remove em dashes (replace with hyphens)
  let cleanContent = content.replace(/\u2014/g, ' - ');

  // Remove any remaining banned phrases (best effort cleanup)
  for (const phrase of [
    'I hope this message finds you well',
    "Don't hesitate to reach out",
    'Please let me know if you have any questions.',
    'Please let me know if you have any questions',
  ]) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    cleanContent = cleanContent.replace(regex, '').trim();
  }

  // Clean up double spaces
  cleanContent = cleanContent.replace(/  +/g, ' ').trim();

  return {
    processed: cleanContent,
    violations,
    cleanContent,
  };
}

/**
 * Append email signature to campaign email content.
 */
export function appendEmailSignature(
  content: string,
  language: LanguagePreference
): string {
  return `${content}\n\n${getEmailSignature(language)}`;
}

// ============================================
// Voice Profile Tracking
// ============================================

export type EditSeverity = 'unchanged' | 'light_edit' | 'heavy_edit' | 'full_rewrite';

/**
 * Determine edit severity by comparing original and edited content.
 * Used to update voice profile weights.
 */
export function classifyEdit(original: string, edited: string): EditSeverity {
  if (original === edited) return 'unchanged';

  const originalWords = original.split(/\s+/);
  const editedWords = edited.split(/\s+/);

  // Calculate similarity (simple word overlap)
  const originalSet = new Set(originalWords);
  const editedSet = new Set(editedWords);
  const intersection = new Set([...originalSet].filter((w) => editedSet.has(w)));

  const similarity = intersection.size / Math.max(originalSet.size, editedSet.size);

  if (similarity >= 0.85) return 'light_edit';
  if (similarity >= 0.5) return 'heavy_edit';
  return 'full_rewrite';
}
