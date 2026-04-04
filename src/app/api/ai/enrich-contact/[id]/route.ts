import { NextRequest, NextResponse } from 'next/server';
import sanitizeHtml from 'sanitize-html';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/security/logger';
import {
  DISC_PROFILER_SYSTEM_PROMPT,
  calculateEngagementTemperature,
  buildEnrichmentPrompt,
  parseEnrichmentResponse,
} from '@/lib/ai/disc-profiler';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

function sanitizeText(text: string): string {
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }

    // Fetch contact owned by user
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select(
        'id, first_name, last_name, email, phone, track_type, pipeline_stage, language_preference'
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Fetch activities for this contact
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(
        'activity_type, direction, subject, description, activity_date'
      )
      .eq('contact_id', id)
      .order('activity_date', { ascending: false })
      .limit(50);

    if (activitiesError) {
      logger.error('Failed to fetch activities for enrichment', {
        contactId: id,
      });
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    const activityList = activities ?? [];

    // Calculate engagement temperature
    const temperature = calculateEngagementTemperature(activityList);

    // Build prompt
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
      logger.error('Anthropic API error', {
        status: anthropicResponse.status,
      });
      return NextResponse.json(
        { error: 'AI service error' },
        { status: 502 }
      );
    }

    const anthropicData = (await anthropicResponse.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    const responseText =
      anthropicData.content?.[0]?.type === 'text'
        ? anthropicData.content[0].text ?? ''
        : '';

    // Parse response
    const parsed = parseEnrichmentResponse(responseText);

    if (!parsed) {
      logger.error('Failed to parse enrichment response', {
        contactId: id,
      });
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 502 }
      );
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

    // Build update payload
    const updatePayload = {
      disc_type: parsed.disc_type as string | null,
      disc_secondary: (parsed.disc_secondary as string) ?? null,
      disc_confidence: (parsed.disc_confidence as string) ?? null,
      language_preference:
        (parsed.language_preference as string) ?? contact.language_preference,
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

    // Update contact
    const { error: updateError } = await supabase
      .from('contacts')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      logger.error('Failed to update contact with enrichment', {
        contactId: id,
      });
      return NextResponse.json(
        { error: 'Failed to save enrichment data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...updatePayload,
      reasoning: parsed.reasoning ?? null,
    });
  } catch (error) {
    logger.error('Enrichment error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
