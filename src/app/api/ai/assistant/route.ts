import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSystemAIPrompt, getDealAIPrompt, getContactAIPrompt } from '@/lib/ai/system-prompts';
import { getDocumentChecklist, calculateDocumentProgress } from '@/lib/documents/texas-checklist';
import type { TransactionDocument } from '@/lib/documents/texas-checklist';

type AIMode = 'system' | 'deal' | 'contact';

function inferMode(body: { mode?: string; contactId?: string; transactionId?: string }): AIMode {
  if (body.mode === 'deal' || body.mode === 'contact' || body.mode === 'system') return body.mode;
  if (body.transactionId) return 'deal';
  if (body.contactId) return 'contact';
  return 'system';
}

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
    const { contactId, transactionId, message, conversationHistory } = body;
    const mode = inferMode(body);

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let systemPrompt = '';

    // ========== SYSTEM MODE ==========
    if (mode === 'system') {
      // Fetch pipeline data from the pipeline endpoint logic inline
      const today = new Date().toISOString().split('T')[0];

      const [contactsRes, transactionsRes, partnersRes, activitiesRes] = await Promise.all([
        supabase
          .from('contacts')
          .select('id, first_name, last_name, track_type, pipeline_stage, phone, email, lead_source, next_follow_up_date, last_contact_date, language_preference, budget, location_preference, follow_up_notes, notes')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('transactions')
          .select('id, property_address, status, contract_price, closing_date, contact_id, track_type, commission_net')
          .order('closing_date', { ascending: true }),
        supabase
          .from('referral_partners')
          .select('id, first_name, last_name, company')
          .order('created_at', { ascending: false }),
        supabase
          .from('activities')
          .select('contact_id, activity_type, direction, description, activity_date')
          .order('activity_date', { ascending: false })
          .limit(100),
      ]);

      const contacts = contactsRes.data || [];
      const transactions = transactionsRes.data || [];
      const partners = partnersRes.data || [];
      const activities = activitiesRes.data || [];

      // Pipeline stage counts
      const stageCounts: Record<string, number> = {};
      for (const c of contacts) {
        stageCounts[c.pipeline_stage] = (stageCounts[c.pipeline_stage] || 0) + 1;
      }

      // Overdue follow-ups
      const overdue = contacts
        .filter(c => c.next_follow_up_date && c.next_follow_up_date < today)
        .map(c => {
          const days = Math.floor((Date.now() - new Date(c.next_follow_up_date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
          return `${c.first_name} ${c.last_name} (${days}d overdue, stage: ${c.pipeline_stage})`;
        });

      // Active leads with recent activity
      const contactActivity: Record<string, string> = {};
      for (const a of activities) {
        if (!contactActivity[a.contact_id]) {
          contactActivity[a.contact_id] = a.activity_date;
        }
      }

      const activeLeads = contacts
        .filter(c => !['closed', 'lost'].includes(c.pipeline_stage))
        .map(c => {
          const lastAct = contactActivity[c.id];
          const daysSince = c.last_contact_date
            ? Math.floor((Date.now() - new Date(c.last_contact_date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
            : -1;
          return {
            name: `${c.first_name} ${c.last_name}`,
            stage: c.pipeline_stage,
            track: c.track_type,
            phone: c.phone,
            language: c.language_preference,
            budget: c.budget,
            location: c.location_preference,
            leadSource: c.lead_source,
            daysSinceContact: daysSince,
            lastActivityDate: lastAct || null,
            followUpNotes: c.follow_up_notes,
          };
        })
        .sort((a, b) => {
          if (a.lastActivityDate && b.lastActivityDate) return b.lastActivityDate.localeCompare(a.lastActivityDate);
          if (a.lastActivityDate) return -1;
          if (b.lastActivityDate) return 1;
          return 0;
        });

      // Partner stats
      const partnerStats = partners.map(p =>
        `${p.first_name} ${p.last_name || ''}${p.company ? ` (${p.company})` : ''}`
      );

      // Upcoming closings
      const activeTransactions = transactions
        .filter(t => t.closing_date && t.closing_date >= today && !['closed', 'lost', 'cancelled'].includes(t.status));

      const upcoming: string[] = [];
      for (const t of activeTransactions) {
        const days = Math.floor((new Date(t.closing_date + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        let line = `${t.property_address}: $${(t.contract_price || 0).toLocaleString()}, ${days}d to close, status: ${t.status}`;

        try {
          const { data: txDocs } = await supabase
            .from('transaction_documents')
            .select('document_type, status')
            .eq('transaction_id', t.id);

          if (txDocs) {
            const cl = getDocumentChecklist(t.track_type);
            const prog = calculateDocumentProgress(txDocs as unknown as TransactionDocument[], cl);
            line += `, docs: ${prog.uploaded}/${prog.total} (${prog.percentComplete}%)`;
            if (prog.percentComplete < 80 && days <= 14) {
              line += ' [DOCUMENT ALERT]';
            }
          }
        } catch {
          // transaction_documents table may not exist
        }

        upcoming.push(line);
      }

      // Closed deals
      const closedDeals = transactions.filter(t => t.status === 'closed');
      const totalRevenue = closedDeals.reduce((sum, t) => sum + (t.commission_net || 0), 0);

      // Recent activities
      const recentActivities = activities.slice(0, 10).map(a => {
        const contact = contacts.find(c => c.id === a.contact_id);
        const contactName = contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown';
        return `- ${a.activity_date?.split('T')[0] || 'unknown'}: ${a.activity_type}${a.direction ? ` (${a.direction})` : ''} with ${contactName} - ${a.description || 'no description'}`;
      }).join('\n');

      const pipelineData = `
PIPELINE SUMMARY:
- Total contacts: ${contacts.length}
- By stage: ${Object.entries(stageCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}
- Closed deals: ${closedDeals.length} ($${totalRevenue.toLocaleString()} net commission)

OVERDUE FOLLOW-UPS (${overdue.length}):
${overdue.length > 0 ? overdue.map(o => `- ${o}`).join('\n') : '- None'}

ACTIVE LEADS (${activeLeads.length}, sorted by most recent activity):
${activeLeads.map(l => `- ${l.name}: ${l.stage} (${l.track}), ${l.daysSinceContact >= 0 ? l.daysSinceContact + 'd since contact' : 'never contacted'}, source: ${l.leadSource || 'unknown'}${l.budget ? ', budget: ' + l.budget : ''}${l.location ? ', area: ' + l.location : ''}`).join('\n')}

REFERRAL PARTNERS:
${partnerStats.length > 0 ? partnerStats.map(p => `- ${p}`).join('\n') : '- None'}

UPCOMING CLOSINGS:
${upcoming.length > 0 ? upcoming.map(u => `- ${u}`).join('\n') : '- None'}

RECENT ACTIVITIES (last 10):
${recentActivities || '- None'}`;

      systemPrompt = getSystemAIPrompt(pipelineData);
    }

    // ========== DEAL MODE ==========
    else if (mode === 'deal') {
      if (!transactionId) {
        return NextResponse.json({ error: 'transactionId is required for deal mode' }, { status: 400 });
      }

      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (!transaction) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }

      // Fetch linked contact
      let contactInfo = 'No contact linked';
      if (transaction.contact_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('first_name, last_name, phone, email, language_preference, pipeline_stage, track_type')
          .eq('id', transaction.contact_id)
          .single();

        if (contact) {
          contactInfo = `${contact.first_name} ${contact.last_name} - Phone: ${contact.phone || 'none'}, Email: ${contact.email || 'none'}, Language: ${contact.language_preference || 'en'}, Stage: ${contact.pipeline_stage}, Track: ${contact.track_type}`;
        }
      }

      // Fetch activities for this transaction
      const { data: txActivities } = await supabase
        .from('activities')
        .select('activity_type, direction, description, activity_date')
        .eq('contact_id', transaction.contact_id)
        .order('activity_date', { ascending: false })
        .limit(20);

      const activityLog = (txActivities || []).map(a =>
        `- ${a.activity_date?.split('T')[0] || 'unknown'}: ${a.activity_type}${a.direction ? ` (${a.direction})` : ''} - ${a.description || 'no description'}`
      ).join('\n');

      // Calculate days to close
      let daysToClose = 'N/A';
      if (transaction.closing_date) {
        const days = Math.floor((new Date(transaction.closing_date + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        daysToClose = `${days} days`;
      }

      // Checklist progress
      const completedItems = (transaction.checklist || []).filter((i: { is_completed: boolean }) => i.is_completed).length;
      const totalItems = (transaction.checklist || []).length;

      const dealData = `
Property: ${transaction.property_address}${transaction.property_city ? `, ${transaction.property_city}` : ''}${transaction.property_state ? `, ${transaction.property_state}` : ''} ${transaction.property_zip || ''}
Status: ${transaction.status}
Track Type: ${transaction.track_type}
Contract Price: $${(transaction.contract_price || 0).toLocaleString()}
Closing Date: ${transaction.closing_date || 'TBD'}
Days to Close: ${daysToClose}
Linked Contact: ${contactInfo}
Checklist Progress: ${completedItems}/${totalItems} items completed
Key Dates: ${transaction.key_dates ? JSON.stringify(transaction.key_dates) : 'None set'}
Commission Rate: ${transaction.commission_rate || 'not set'}%
Referral Fee: ${transaction.referral_fee || 0}%
Gross Commission: $${(transaction.commission_gross || 0).toLocaleString()}
Net Commission: $${(transaction.commission_net || 0).toLocaleString()}
Notes: ${transaction.notes ? (transaction.notes as Array<{ content: string }>).map((n: { content: string }) => n.content).join('; ') : 'None'}
Parties: ${transaction.parties ? (transaction.parties as Array<{ role: string; name: string }>).map((p: { role: string; name: string }) => `${p.role}: ${p.name}`).join(', ') : 'None'}

RECENT ACTIVITY:
${activityLog || 'No activities logged.'}`;

      // Fetch document status
      let documentsData = 'Document tracking not yet set up for this transaction.';
      try {
        const { data: txDocs } = await supabase
          .from('transaction_documents')
          .select('document_type, status, uploaded_at')
          .eq('transaction_id', transactionId);

        if (txDocs && txDocs.length > 0) {
          const checklist = getDocumentChecklist(transaction.track_type);
          const progress = calculateDocumentProgress(txDocs as unknown as TransactionDocument[], checklist);

          const uploaded = txDocs.filter(d => d.status === 'uploaded' || d.status === 'approved');
          const missing = checklist.filter(c => c.required && !txDocs.some(d => d.document_type === c.type));

          documentsData = `Overall: ${progress.uploaded}/${progress.total} documents (${progress.percentComplete}% complete)

Uploaded/Approved:
${uploaded.length > 0 ? uploaded.map(d => `- ${d.document_type}: ${d.status}`).join('\n') : '- None'}

Missing CMR-Required:
${missing.length > 0 ? missing.map(d => `- ${d.label} (${d.type})`).join('\n') : '- All required documents collected'}`;
        }
      } catch {
        // transaction_documents table may not exist yet
      }

      systemPrompt = getDealAIPrompt(dealData, documentsData);
    }

    // ========== CONTACT MODE ==========
    else if (mode === 'contact') {
      if (!contactId) {
        return NextResponse.json({ error: 'contactId is required for contact mode' }, { status: 400 });
      }

      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('is_deleted', false)
        .single();

      if (!contact) {
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
      }

      // Fetch last 30 activities (more than before for better history)
      const { data: activities } = await supabase
        .from('activities')
        .select('activity_type, direction, description, activity_date')
        .eq('contact_id', contactId)
        .order('activity_date', { ascending: false })
        .limit(30);

      // Fetch linked transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, property_address, status, contract_price, closing_date, track_type')
        .eq('contact_id', contactId);

      // Fetch referral partner info
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

      // Saved AI insights
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

      const daysSinceContact = contact.last_contact_date
        ? Math.floor((Date.now() - new Date(contact.last_contact_date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
        : -1;

      const inboundCount = (activities || []).filter(a => a.direction === 'inbound').length;
      const hasActiveTransaction = (transactions || []).some(t => !['closed', 'cancelled', 'lost'].includes(t.status));

      const contactData = `
Name: ${contact.first_name} ${contact.last_name}
Phone: ${contact.phone || 'none'}
Email: ${contact.email || 'none'}
Track: ${contact.track_type}
Pipeline Stage: ${contact.pipeline_stage}
Language: ${contact.language_preference === 'es' ? 'Spanish' : contact.language_preference === 'bilingual' ? 'Bilingual' : 'English'}
Lead Source: ${contact.lead_source || 'unknown'}
Budget: ${contact.budget || 'not set'}
Location Preference: ${contact.location_preference || 'not set'}
Follow-Up Notes: ${contact.follow_up_notes || 'none'}
Next Follow-Up: ${contact.next_follow_up_date || 'not scheduled'}
Days Since Last Contact: ${daysSinceContact >= 0 ? daysSinceContact : 'never contacted'}
Inbound Activities: ${inboundCount}
Has Active Transaction: ${hasActiveTransaction ? 'yes' : 'no'}
${partnerName ? `Referral Partner: ${partnerName}` : ''}
Notes: ${contact.notes || 'none'}${insightsContext}`;

      const activitiesData = (activities || []).map(a =>
        `- ${a.activity_date?.split('T')[0] || 'unknown date'}: ${a.activity_type}${a.direction ? ` (${a.direction})` : ''} - ${a.description}`
      ).join('\n') || 'No activities logged yet.';

      // Build transaction log with document progress
      const txEntries: string[] = [];
      for (const t of (transactions || [])) {
        let entry = `- ${t.property_address}: ${t.status}, $${(t.contract_price || 0).toLocaleString()}, closing ${t.closing_date || 'TBD'}`;

        try {
          const { data: txDocs } = await supabase
            .from('transaction_documents')
            .select('document_type, status')
            .eq('transaction_id', t.id);

          if (txDocs) {
            const txChecklist = getDocumentChecklist(t.track_type);
            const txProgress = calculateDocumentProgress(txDocs as unknown as TransactionDocument[], txChecklist);
            entry += `\n  Documents: ${txProgress.uploaded}/${txProgress.total} collected (${txProgress.percentComplete}%)`;
          }
        } catch {
          // transaction_documents table may not exist yet
        }

        txEntries.push(entry);
      }
      const transactionsData = txEntries.join('\n') || 'No transactions linked.';

      systemPrompt = getContactAIPrompt(contactData, activitiesData, transactionsData);
    }

    // Build messages array
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
      mode,
    });
  } catch (err) {
    console.error('[ai:assistant] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
