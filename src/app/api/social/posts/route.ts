/**
 * Social Posts API
 *
 * CRUD for social media posts with content pillar tracking,
 * approval queue integration, and analytics capture.
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
  const platform = searchParams.get('platform');
  const pillar = searchParams.get('pillar');
  const status = searchParams.get('status');

  let query = supabase
    .from('social_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (platform) query = query.eq('platform', platform);
  if (pillar) query = query.eq('content_pillar', pillar);
  if (status === 'published') query = query.not('published_at', 'is', null);
  if (status === 'scheduled') query = query.is('published_at', null).not('scheduled_time', 'is', null);

  const { data, error } = await query.limit(50);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }

  return NextResponse.json({ posts: data || [] });
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
  const { platform, content_pillar, caption, hashtags, language, scheduled_time, is_bilingual } = body;

  if (!platform || !content_pillar || !caption) {
    return NextResponse.json({ error: 'Platform, content pillar, and caption are required' }, { status: 400 });
  }

  const sanitizedCaption = sanitizePlainText(caption);

  // Create the social post
  const { data: post, error: postError } = await supabase
    .from('social_posts')
    .insert({
      user_id: user.id,
      platform,
      content_pillar,
      caption: sanitizedCaption,
      hashtags: hashtags || [],
      language: language || 'en',
      is_bilingual: is_bilingual || false,
      scheduled_time: scheduled_time || null,
    })
    .select()
    .single();

  if (postError) {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }

  // Route to approval queue
  await supabase.from('approval_queue').insert({
    user_id: user.id,
    item_type: 'social_post',
    subject: `${platform} - ${content_pillar.replace('_', ' ')}`,
    content: sanitizedCaption,
    tone_mode: 'casual_friend',
    status: 'pending',
    urgency_level: 3,
    trigger_source: 'social_media_create',
  });

  return NextResponse.json({ post }, { status: 201 });
}
