/**
 * SEO Analytics API
 *
 * Track keyword positions, organic traffic, and lead captures
 * from LiconaRealty.com. Dashboard data for SEO performance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { sanitizePlainText } from '@/lib/security/validation';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateCheck = checkRateLimit(ip, 'api');
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('seo_analytics')
    .select('*')
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch SEO data' }, { status: 500 });
  }

  // Aggregate stats
  const entries = data || [];
  const totalVisits = entries.reduce((sum, e) => sum + (e.organic_visits || 0), 0);
  const totalLeads = entries.reduce((sum, e) => sum + (e.lead_captures || 0), 0);

  // Top keywords
  const keywordMap = new Map<string, { visits: number; leads: number; position: number | null }>();
  for (const entry of entries) {
    const existing = keywordMap.get(entry.keyword) || { visits: 0, leads: 0, position: null };
    existing.visits += entry.organic_visits || 0;
    existing.leads += entry.lead_captures || 0;
    if (entry.estimated_position) existing.position = entry.estimated_position;
    keywordMap.set(entry.keyword, existing);
  }

  const topKeywords = Array.from(keywordMap.entries())
    .map(([keyword, stats]) => ({ keyword, ...stats }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10);

  return NextResponse.json({
    analytics: entries,
    summary: {
      totalVisits,
      totalLeads,
      conversionRate: totalVisits > 0 ? ((totalLeads / totalVisits) * 100).toFixed(1) : '0',
      topKeywords,
      period: `${days} days`,
    },
  });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateCheckPost = checkRateLimit(ip, 'api');
  if (!rateCheckPost.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { keyword, page_url, estimated_position, organic_visits, lead_captures, date } = body;

  if (!keyword || !page_url) {
    return NextResponse.json({ error: 'Keyword and page URL required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('seo_analytics')
    .insert({
      user_id: user.id,
      keyword: sanitizePlainText(keyword),
      page_url: sanitizePlainText(page_url),
      estimated_position: estimated_position || null,
      organic_visits: organic_visits || 0,
      lead_captures: lead_captures || 0,
      date: date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to record SEO data' }, { status: 500 });
  }

  return NextResponse.json({ entry: data }, { status: 201 });
}
