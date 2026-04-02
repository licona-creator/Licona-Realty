/**
 * Market Intelligence API
 *
 * Fetches real market data per zip code using Anthropic AI with web search.
 * Caches results in market_data_cache table with 7-day TTL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/security/logger';

const CACHE_TTL_DAYS = 7;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const zip = request.nextUrl.searchParams.get('zip');
    if (!zip || !/^\d{5}$/.test(zip)) {
      return NextResponse.json({ error: 'Valid 5-digit zip code required' }, { status: 400 });
    }

    // Check cache first
    const { data: cached } = await supabase
      .from('market_data_cache')
      .select('*')
      .eq('zip_code', zip)
      .single();

    if (cached) {
      const fetchedAt = new Date(cached.fetched_at).getTime();
      const now = Date.now();
      const isExpired = now - fetchedAt > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

      if (!isExpired) {
        return NextResponse.json({ data: cached, source: 'cache' });
      }
    }

    // Fetch fresh data from Anthropic with web search
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    let marketData: {
      median_price: number | null;
      avg_dom: number | null;
      homes_sold: number | null;
      new_listings: number | null;
      inventory_level: number | null;
      list_to_sale_ratio: number | null;
      market_summary: string | null;
      data_source: string | null;
    } | null = null;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{
            role: 'user',
            content: `Search for current real estate market data for zip code ${zip} in the Dallas-Fort Worth metroplex, Texas. Find: median home price, average days on market, homes sold in last 30 days, new listings, inventory level, and list-to-sale price ratio. Use Redfin, Realtor.com, or Zillow data. Return ONLY a JSON object with these exact keys: median_price (number), avg_dom (number), homes_sold (number), new_listings (number), inventory_level (number), list_to_sale_ratio (number like 0.97), market_summary (one sentence), data_source (which site the data came from). No other text, just the JSON.`
          }]
        })
      });

      if (!response.ok) {
        logger.error('Anthropic API error', { status: response.status });
        if (cached) {
          return NextResponse.json({ data: cached, source: 'stale_cache' });
        }
        return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 502 });
      }

      const result = await response.json();

      // Extract text content from the response
      let textContent = '';
      for (const block of result.content || []) {
        if (block.type === 'text') {
          textContent += block.text;
        }
      }

      // Parse JSON from the response (may be wrapped in markdown code block)
      const jsonMatch = textContent.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        marketData = {
          median_price: typeof parsed.median_price === 'number' ? parsed.median_price : null,
          avg_dom: typeof parsed.avg_dom === 'number' ? parsed.avg_dom : null,
          homes_sold: typeof parsed.homes_sold === 'number' ? parsed.homes_sold : null,
          new_listings: typeof parsed.new_listings === 'number' ? parsed.new_listings : null,
          inventory_level: typeof parsed.inventory_level === 'number' ? parsed.inventory_level : null,
          list_to_sale_ratio: typeof parsed.list_to_sale_ratio === 'number' ? parsed.list_to_sale_ratio : null,
          market_summary: typeof parsed.market_summary === 'string' ? parsed.market_summary : null,
          data_source: typeof parsed.data_source === 'string' ? parsed.data_source : null,
        };
      }
    } catch (aiErr) {
      logger.error('AI market data fetch failed', { error: String(aiErr) });
      if (cached) {
        return NextResponse.json({ data: cached, source: 'stale_cache' });
      }
      return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 502 });
    }

    if (!marketData) {
      if (cached) {
        return NextResponse.json({ data: cached, source: 'stale_cache' });
      }
      return NextResponse.json({ error: 'Could not parse market data' }, { status: 502 });
    }

    // Upsert into cache
    const now = new Date().toISOString();
    const { data: upserted, error: upsertError } = await supabase
      .from('market_data_cache')
      .upsert({
        zip_code: zip,
        ...marketData,
        fetched_at: now,
        updated_at: now,
      }, { onConflict: 'zip_code' })
      .select()
      .single();

    if (upsertError) {
      logger.error('Failed to cache market data', { error: upsertError.message });
      // Still return the data even if caching failed
      return NextResponse.json({
        data: { zip_code: zip, ...marketData, fetched_at: now },
        source: 'fresh',
      });
    }

    return NextResponse.json({ data: upserted, source: 'fresh' });
  } catch (err) {
    logger.error('Market intel error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
