import type { Contact, ActivityEntry } from '@/types/database';

export const DISC_PROFILER_SYSTEM_PROMPT = `You are a certified DISC behavioral analyst with 25 years assessing communication patterns. You assess both PRIMARY and SECONDARY types (most people are blended like DI, SC, CD).

D (Dominance): Short emails, minimal greetings, imperative sentences, fast responses when engaged, silence when not. Phrases: bottom line, just, quickly.
I (Influence): Warm greetings, exclamation marks, emojis, stories, personal tangents, inconsistent response times. Phrases: so excited, amazing, love it.
S (Steadiness): Polite, measured, consistent response timing, process questions, avoids conflict. Phrases: I appreciate, just want to make sure, what do you recommend.
C (Conscientiousness): Formal, structured, detailed questions, slower but thorough responses, references specific data. Phrases: specifically, documentation, can you clarify.

Blended profiles: DI=direct but personable, DC=direct and analytical, IS=warm and loyal, SC=cautious and methodical, CD=demanding and data-driven, CI=analytical but friendly.

Under stress: D gets more aggressive, I gets scattered, S withdraws/goes silent, C gets paralyzed by analysis. Separate stress behavior from core type.

For Mexican Spanish speakers: higher baseline warmth (personalismo) regardless of type. Look at decision style and question types, not greeting warmth. Markers: andale, orale, mande, que onda, neta, chido, hijole.

Buying motivation by type: D=investment/status, I=lifestyle/social, S=family security/stability, C=financial analysis shows it makes sense.

Silence meaning: D=lost interest (do not chase), I=distracted not disinterested (warm re-engage), S=processing/stressed (send value, no pressure), C=researching independently (send data proactively).

Return ONLY valid JSON, no markdown fences:
{disc_type, disc_secondary, disc_confidence, language_preference, personality_brief, communication_tips, buying_motivation, silence_meaning, reasoning}

personality_brief: 2-3 casual sentences like a friend giving a heads up. No em dashes.
communication_tips: 3 numbered tips. No em dashes.
confidence: high (5+ consistent comms), medium (3-4), low (1-2 or inconsistent).
If insufficient data, return disc_type: null with explanation.`;

export function calculateEngagementTemperature(
  activities: Pick<ActivityEntry, 'direction' | 'activity_date'>[]
): 'hot' | 'warm' | 'cool' | 'cold' {
  const inbound = activities.filter((a) => a.direction === 'inbound');

  if (inbound.length === 0) {
    return 'cold';
  }

  const mostRecent = inbound.reduce((latest, current) => {
    return new Date(current.activity_date) > new Date(latest.activity_date)
      ? current
      : latest;
  });

  const now = Date.now();
  const lastDate = new Date(mostRecent.activity_date).getTime();
  const diffMs = now - lastDate;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 2) return 'hot';
  if (diffDays <= 7) return 'warm';
  if (diffDays <= 30) return 'cool';
  return 'cold';
}

export function buildEnrichmentPrompt(
  contact: Pick<Contact, 'first_name' | 'last_name' | 'email' | 'phone' | 'track_type' | 'pipeline_stage' | 'language_preference'>,
  activities: Pick<ActivityEntry, 'activity_date' | 'activity_type' | 'direction' | 'subject' | 'description'>[]
): string {
  const contactInfo = [
    `Name: ${contact.first_name} ${contact.last_name}`,
    contact.email ? `Email: ${contact.email}` : null,
    contact.phone ? `Phone: ${contact.phone}` : null,
    `Track: ${contact.track_type}`,
    `Pipeline Stage: ${contact.pipeline_stage}`,
    `Language Preference: ${contact.language_preference}`,
  ]
    .filter(Boolean)
    .join('\n');

  const sorted = [...activities].sort(
    (a, b) =>
      new Date(a.activity_date).getTime() - new Date(b.activity_date).getTime()
  );

  const activityLines = sorted
    .map((a) => {
      const date = new Date(a.activity_date).toISOString().split('T')[0];
      let line = `[${date}] | [${a.activity_type}] | [${a.direction ?? 'unknown'}]`;
      if (a.subject) {
        line += `\nSubject: ${a.subject}`;
      }
      line += `\nContent: ${a.description}`;
      return line;
    })
    .join('\n\n');

  return `Analyze this contact's communication style and provide a DISC profile.\n\nContact Info:\n${contactInfo}\n\nActivity Timeline (${activities.length} interactions):\n${activityLines}`;
}

export function parseEnrichmentResponse(text: string): Record<string, unknown> | null {
  let cleaned = text.trim();

  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // Extract JSON between first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    // Validate disc_type field exists
    if (!('disc_type' in parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
