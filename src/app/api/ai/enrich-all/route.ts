import { NextRequest, NextResponse } from 'next/server';
import sanitizeHtml from 'sanitize-html';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/security/logger';
import { getDisplayName } from '@/lib/format';
import {
  DISC_PROFILER_SYSTEM_PROMPT,
  calculateEngagementTemperature,
  buildEnrichmentPrompt,
  parseEnrichmentResponse,
} from '@/lib/ai/disc-profiler';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_CONTACTS = 10;
const DELAY_MS = 2000;

function sanitizeText(text: string): string {
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }

    // Auth: user session OR CRON_SECRET
    const supabase = await createServerSupabaseClient();
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    let userId: string | null = null;
    let isCron = false;

    if (
      cronSecret &&
      authHeader === `Bearer ${cronSecret}`
    ) {
      isCron = true;
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
    }

    // Query contacts needing enrichment
    let query = supabase
      .from('contacts')
      .select(
        'id, first_name, last_name, email, phone, track_type, pipeline_stage, language_preference, user_id'
      )
      .eq('is_deleted', false)
      .or(
        'last_enriched_at.is.null,last_enriched_at.lt.' +
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      );

    if (!isCron && userId) {
      query = query.eq('user_id', userId);
    }

    const { data: contacts, error: contactsError } = await query;

    if (contactsError) {
      logger.error('Failed to fetch contacts for batch enrichment');
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      );
    }

    const allContacts = contacts ?? [];

    // Filter by activity count >= 2
    const eligible: typeof allContacts = [];
    const insufficientData: string[] = [];

    for (const contact of allContacts) {
      const { count } = await supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('contact_id', contact.id);

      if ((count ?? 0) >= 2) {
        eligible.push(contact);
      } else {
        insufficientData.push(
          getDisplayName(contact)
        );
      }
    }

    // Process max 10
    const toProcess = eligible.slice(0, MAX_CONTACTS);
    const skipped = eligible.length - toProcess.length;

    const results: Array<{
      name: string;
      disc_type: string | null;
      disc_secondary: string | null;
      confidence: string | null;
      temperature: string;
    }> = [];
    const errors: string[] = [];

    for (let i = 0; i < toProcess.length; i++) {
      const contact = toProcess[i];

      try {
        // Fetch activities
        const { data: activities } = await supabase
          .from('activities')
          .select(
            'activity_type, direction, subject, description, activity_date'
          )
          .eq('contact_id', contact.id)
          .order('activity_date', { ascending: false })
          .limit(50);

        const activityList = activities ?? [];
        const temperature = calculateEngagementTemperature(activityList);
        const userMessage = buildEnrichmentPrompt(contact, activityList);

        // Call Anthropic API
        const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: DISC_PROFILER_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
          }),
        });

        if (!anthropicResponse.ok) {
          errors.push(
            `${getDisplayName(contact)}: API error ${anthropicResponse.status}`
          );
          continue;
        }

        const anthropicData = (await anthropicResponse.json()) as {
          content: Array<{ type: string; text?: string }>;
        };
        const responseText =
          anthropicData.content?.[0]?.type === 'text'
            ? anthropicData.content[0].text ?? ''
            : '';

        const parsed = parseEnrichmentResponse(responseText);

        if (!parsed) {
          errors.push(
            `${getDisplayName(contact)}: Failed to parse response`
          );
          continue;
        }

        // Sanitize text fields
        const personalityBrief =
          typeof parsed.personality_brief === 'string'
            ? sanitizeText(parsed.personality_brief)
            : null;
        const communicationTips =
          typeof parsed.communication_tips === 'string'
            ? sanitizeText(parsed.communication_tips)
            : null;

        const updatePayload = {
          disc_type: parsed.disc_type as string | null,
          disc_secondary: (parsed.disc_secondary as string) ?? null,
          disc_confidence: (parsed.disc_confidence as string) ?? null,
          language_preference:
            (parsed.language_preference as string) ??
            contact.language_preference,
          engagement_temperature: temperature,
          personality_brief: personalityBrief,
          communication_tips: communicationTips,
          buying_motivation:
            typeof parsed.buying_motivation === 'string'
              ? parsed.buying_motivation
              : null,
          silence_meaning:
            typeof parsed.silence_meaning === 'string'
              ? parsed.silence_meaning
              : null,
          last_enriched_at: new Date().toISOString(),
        };

        await supabase
          .from('contacts')
          .update(updatePayload)
          .eq('id', contact.id);

        results.push({
          name: getDisplayName(contact),
          disc_type: (parsed.disc_type as string) ?? null,
          disc_secondary: (parsed.disc_secondary as string) ?? null,
          confidence: (parsed.disc_confidence as string) ?? null,
          temperature,
        });
      } catch (err) {
        errors.push(
          `${getDisplayName(contact)}: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }

      // Delay between API calls (skip after last)
      if (i < toProcess.length - 1) {
        await delay(DELAY_MS);
      }
    }

    return NextResponse.json({
      enriched: results.length,
      skipped,
      insufficient_data: insufficientData.length,
      errors: errors.length,
      results,
    });
  } catch (error) {
    logger.error('Batch enrichment error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
