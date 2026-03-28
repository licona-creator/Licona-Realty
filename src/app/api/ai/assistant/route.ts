import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ANTHONYS_BRAIN } from '@/lib/ai/anthonys-brain';
import { TEXAS_KNOWLEDGE } from '@/lib/ai/texas-knowledge';
import { getDocumentChecklist, calculateDocumentProgress } from '@/lib/documents/texas-checklist';
import type { TransactionDocument } from '@/lib/documents/texas-checklist';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log('[ai:assistant] API key configured:', !!apiKey);

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
        .select('id, property_address, status, contract_price, closing_date, track_type')
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

      // Fetch saved AI insights for this contact
      let insightsContext = '';
      try {
        const { data: insights } = await supabase
          .from('ai_insights')
          .select('content, insight_type, created_at, is_pinned')
          .eq('contact_id', contactId)
          .eq('user_id', user.id)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);

        if (insights && insights.length > 0) {
          insightsContext = '\n\nSAVED AI INSIGHTS (previous recommendations Anthony saved):\n' +
            insights.map(i =>
              `- [${i.insight_type}${i.is_pinned ? ', PINNED' : ''}] ${i.content.substring(0, 300)}`
            ).join('\n');
        }
      } catch {
        // ai_insights table may not exist yet
      }

      // Fetch email activities (10 most recent)
      const { data: emailActivities } = await supabase
        .from('activities')
        .select('direction, description, activity_date')
        .eq('contact_id', contactId)
        .eq('activity_type', 'email')
        .order('activity_date', { ascending: false })
        .limit(10);

      // Fetch meeting activities (5 most recent)
      const { data: meetingActivities } = await supabase
        .from('activities')
        .select('direction, description, activity_date')
        .eq('contact_id', contactId)
        .eq('activity_type', 'meeting')
        .order('activity_date', { ascending: false })
        .limit(5);

      const activityLog = (activities || []).map(a =>
        `- ${a.activity_date?.split('T')[0] || 'unknown date'}: ${a.activity_type}${a.direction ? ` (${a.direction})` : ''} - ${a.description}`
      ).join('\n');

      // Build transaction log with document progress
      const txEntries: string[] = [];
      for (const t of (transactions || [])) {
        let entry = `- ${t.property_address}: ${t.status}, $${(t.contract_price || 0).toLocaleString()}, closing ${t.closing_date || 'TBD'}`;

        // Fetch document progress for each transaction
        try {
          const { data: txDocs } = await supabase
            .from('transaction_documents')
            .select('document_type, status')
            .eq('transaction_id', t.id);

          if (txDocs) {
            const txChecklist = getDocumentChecklist(t.track_type);
            const txProgress = calculateDocumentProgress(txDocs as unknown as TransactionDocument[], txChecklist);
            entry += `\n  Documents: ${txProgress.uploaded}/${txProgress.total} collected (${txProgress.percentComplete}%)`;
            if (txProgress.missing > 0) {
              const missingDocs = txChecklist
                .filter(c => c.required && !txDocs.some(d => d.document_type === c.type))
                .map(c => c.label);
              if (missingDocs.length > 0) {
                entry += `\n  Missing required: ${missingDocs.join(', ')}`;
              }
            }
          }
        } catch {
          // transaction_documents table may not exist yet
        }

        txEntries.push(entry);
      }
      const txLog = txEntries.join('\n');

      const daysSinceContact = contact.last_contact_date
        ? Math.floor((Date.now() - new Date(contact.last_contact_date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
        : -1;

      // Calculate inbound activities for lead score context
      const inboundCount = (activities || []).filter(a => a.direction === 'inbound').length;
      const hasActiveTransaction = (transactions || []).some(t => !['closed', 'cancelled', 'lost'].includes(t.status));

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
- Inbound Activities: ${inboundCount}
- Has Active Transaction: ${hasActiveTransaction ? 'yes' : 'no'}
${partnerName ? `- Referral Partner: ${partnerName}` : ''}
- Notes: ${contact.notes || 'none'}

ACTIVITY HISTORY (most recent first):
${activityLog || 'No activities logged yet.'}

LINKED TRANSACTIONS:
${txLog || 'No transactions linked.'}

Recent emails with this contact:
${emailActivities && emailActivities.length > 0
  ? emailActivities.map(e => `- [${e.activity_date?.split('T')[0] || 'unknown'}] ${e.direction || 'unknown'}: ${e.description}`).join('\n')
  : 'No email activity synced yet.'}

Upcoming/recent meetings:
${meetingActivities && meetingActivities.length > 0
  ? meetingActivities.map(m => `- [${m.activity_date?.split('T')[0] || 'unknown'}] ${m.direction || ''}: ${m.description}`).join('\n')
  : 'No meeting activity synced yet.'}${insightsContext}`;
    }

    const now = new Date();
    const currentMonth = now.toLocaleString('en-US', { month: 'long' });
    const currentYear = now.getFullYear();

    const systemPrompt = `${ANTHONYS_BRAIN}

${TEXAS_KNOWLEDGE}

Today's date is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

FORMATTING RULES:
- Do not use em dashes. Use regular hyphens.
- Do not use unicode special characters like smart quotes or curly quotes. Use straight quotes and apostrophes.
- Use simple markdown: single asterisks for emphasis, hyphens for lists. Keep formatting clean and minimal.
- Do not use double asterisks for bold in the middle of sentences. Use bold only for headers or key terms at the start of a line.
- Use numbered lists (1. 2. 3.) for sequential steps. Use hyphens for bullet lists.
- Keep paragraphs short - 2-3 sentences max.

CRITICAL RULES:
1. When asked about market data, ALWAYS use web search. Search for "[city] TX housing market ${currentMonth} ${currentYear}" or similar. NEVER use training data for prices, inventory, or market statistics.
2. After searching, cite when the data was published. If older than 30 days, say so.
3. When drafting messages for Spanish-speaking contacts, write in natural conversational Spanish.
4. Reference specific data from the contact's history. Never give generic advice.
5. When suggesting next steps, consider Anthony works full-time M-F and can only do RE before 8am, at lunch, after 5pm, and weekends.
6. Think long-term: every suggestion should build toward relationships and referrals, not just transactions.
7. TREC compliance: never guarantee property values, investment returns, or market timing.
${contactContext}`;

    // Build messages array, filtering out any with empty content
    const historyMessages = Array.isArray(conversationHistory)
      ? conversationHistory
          .filter((m: { role: string; content: string }) => m.role && m.content?.trim())
          .map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))
      : [];

    const messages = [
      ...historyMessages,
      { role: 'user' as const, content: message.trim() },
    ];

    const requestBody = {
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
    };

    console.log('[ai:assistant] Sending request:', {
      model: requestBody.model,
      messageCount: messages.length,
      toolCount: requestBody.tools?.length,
      systemLength: systemPrompt.length,
    });

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text().catch(() => '');
      console.error('[ai:assistant] Anthropic API error:', apiResponse.status, errorBody);
      return NextResponse.json(
        { error: `AI service error (${apiResponse.status}). Please try again.`, details: errorBody },
        { status: apiResponse.status >= 500 ? 502 : apiResponse.status }
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
