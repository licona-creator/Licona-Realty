import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI Assistant not configured. Add your Anthropic API key in Vercel environment variables.' },
        { status: 503 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contactId, message, conversationHistory } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Build contact context if contactId provided
    let contactContext = '';
    if (contactId) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('is_deleted', false)
        .single();

      if (!contact) {
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
      }

      const { data: activities } = await supabase
        .from('activities')
        .select('activity_type, direction, description, activity_date')
        .eq('contact_id', contactId)
        .order('activity_date', { ascending: false })
        .limit(20);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('property_address, status, contract_price, closing_date, track_type')
        .eq('contact_id', contactId);

      let partnerName = '';
      if (contact.referral_partner_id) {
        const { data: partner } = await supabase
          .from('referral_partners')
          .select('first_name, last_name, company')
          .eq('id', contact.referral_partner_id)
          .single();
        if (partner) {
          partnerName = `${partner.first_name} ${partner.last_name || ''}`.trim();
          if (partner.company) partnerName += ` (${partner.company})`;
        }
      }

      const activityLog = (activities || []).map(a =>
        `- ${a.activity_date?.split('T')[0] || 'unknown date'}: ${a.activity_type}${a.direction ? ` (${a.direction})` : ''} - ${a.description}`
      ).join('\n');

      const txLog = (transactions || []).map(t =>
        `- ${t.property_address}: ${t.status}, $${(t.contract_price || 0).toLocaleString()}, closing ${t.closing_date || 'TBD'}`
      ).join('\n');

      const daysSinceContact = contact.last_contact_date
        ? Math.floor((Date.now() - new Date(contact.last_contact_date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
        : -1;

      contactContext = `
CURRENT CONTACT: ${contact.first_name} ${contact.last_name}
- Phone: ${contact.phone || 'none'}
- Email: ${contact.email || 'none'}
- Track: ${contact.track_type}
- Pipeline Stage: ${contact.pipeline_stage}
- Language: ${contact.language_preference === 'es' ? 'Spanish' : contact.language_preference === 'bilingual' ? 'Bilingual' : 'English'}
- Lead Source: ${contact.lead_source || 'unknown'}
- Budget: ${contact.budget || 'not set'}
- Location Preference: ${contact.location_preference || 'not set'}
- Follow-Up Notes: ${contact.follow_up_notes || 'none'}
- Next Follow-Up: ${contact.next_follow_up_date || 'not scheduled'}
- Days Since Last Contact: ${daysSinceContact >= 0 ? daysSinceContact : 'never contacted'}
${partnerName ? `- Referral Partner: ${partnerName}` : ''}
- Notes: ${contact.notes || 'none'}

ACTIVITY HISTORY (most recent first):
${activityLog || 'No activities logged yet.'}

LINKED TRANSACTIONS:
${txLog || 'No transactions linked.'}`;
    }

    const systemPrompt = `You are the AI assistant for Licona Realty, helping Anthony Licona manage his real estate business in the DFW metroplex.

ABOUT ANTHONY:
- 25 year old bilingual (English/Spanish) real estate agent at Central Metro Realty
- TREC License: 0821484-SA
- Serves Denton County, Collin County, and Dallas County
- Competitive edge: bilingual service for Spanish-speaking families
- Income goal: replace day job income through real estate ($50K-$70K/year, roughly 7 deals)
- Commission structure: 100% after cap
- Primary lead source: referral partner Ana who works with lenders and Spanish-speaking clients (2 closings from 5 leads = 40% close rate)
- Secondary source: Qazzoo leads (being canceled, 0 closings from 12 leads)
- Working a full-time remote job M-F, does real estate in pockets of time
- Posts on Instagram @liconarealty (Canva only, no reels/video, bilingual content)
- Mom Karla Licona runs a separate Facebook page in Spanish supporting the business

DFW MARKET CONTEXT:
- Target price range: $250K-$400K
- Key areas: Denton County (Denton, Corinth, Aubrey, Celina, Lewisville), Collin County (McKinney, Frisco, Allen, Plano), Dallas County (Dallas, Mesquite, Irving)
- Market is shifting toward buyers: longer days on market, more inventory, sellers offering concessions
- Hispanic population is 30%+ in Dallas County, 20%+ in Denton County, creating strong demand for bilingual service

CURRENT PIPELINE:
- Active transaction: 1725 Lemonwood Circle, Mesquite TX, $250,000, closing April 2, 2026 (buyer: Aimee Serrano via Ana)
- Prior closing: Rigoberto (December 2025, also via Ana)
- 12 total contacts in various pipeline stages

YOUR ROLE:
- Draft follow-up messages that sound like Anthony (casual, warm, professional, never salesy)
- If a contact's language is Spanish, draft in Spanish
- Suggest specific next actions based on the contact's pipeline position and history
- Provide DFW market data when asked (use web search for current data)
- Help with objection handling, negotiation strategy, and deal analysis
- Be direct. No fluff. No generic advice. Reference the specific contact's data.
- Think long-term: every suggestion should build toward a relationship, not just a transaction
- TREC compliance: never make guarantees about property values or investment returns
- When suggesting to move a lead to nurture or cold, explain why based on the data
- When Anthony feels overwhelmed, help him prioritize by urgency and likelihood to close
${contactContext}`;

    const messages = [
      ...((conversationHistory || []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      }))),
      { role: 'user', content: message },
    ];

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
          },
        ],
        messages,
      }),
    });

    if (!apiResponse.ok) {
      const errBody = await apiResponse.text().catch(() => '');
      console.error('[ai:assistant] API error:', apiResponse.status, errBody);
      return NextResponse.json(
        { error: `AI service error (${apiResponse.status}). Please try again.` },
        { status: 500 }
      );
    }

    const data = await apiResponse.json();

    const textContent = (data.content || [])
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { text: string }) => block.text)
      .join('\n\n');

    return NextResponse.json({
      response: textContent || 'I could not generate a response. Please try again.',
      contactId: contactId || null,
    });
  } catch (err) {
    console.error('[ai:assistant] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
