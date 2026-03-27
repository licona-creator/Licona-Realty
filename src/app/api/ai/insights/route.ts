import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contactId = request.nextUrl.searchParams.get('contact_id');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);

    let query = supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (contactId) {
      query = query.eq('contact_id', contactId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[ai:insights:GET]', error);
      return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
    }

    return NextResponse.json({ insights: data || [] });
  } catch (err) {
    console.error('[ai:insights:GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { contact_id, insight_type, content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const validTypes = ['suggestion', 'analysis', 'market_data', 'strategy', 'warning', 'milestone', 'objection_response'];
    if (!validTypes.includes(insight_type)) {
      return NextResponse.json({ error: 'Invalid insight type' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('ai_insights')
      .insert({
        user_id: user.id,
        contact_id: contact_id || null,
        insight_type,
        content: content.trim(),
        source: 'ai_assistant',
      })
      .select()
      .single();

    if (error) {
      console.error('[ai:insights:POST]', error);
      return NextResponse.json({ error: 'Failed to save insight' }, { status: 500 });
    }

    return NextResponse.json({ insight: data }, { status: 201 });
  } catch (err) {
    console.error('[ai:insights:POST] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
