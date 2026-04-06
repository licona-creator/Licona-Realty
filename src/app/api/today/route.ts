/**
 * Today API - JARVIS daily briefing endpoint
 *
 * Aggregates data from contacts, transactions, and activities
 * to build a morning briefing for Anthony.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function getGreeting(): string {
  const hour = new Date().getHours();
  const spanishGreetings = [
    'Buenos dias, Anthony',
    'Buenas tardes, Anthony',
    'Buenas noches, Anthony',
  ];
  const englishGreetings = [
    'Good morning, Anthony',
    'Good afternoon, Anthony',
    'Good evening, Anthony',
  ];

  // Alternate: ~20% chance Spanish
  const useSpanish = Math.random() < 0.2;
  const greetings = useSpanish ? spanishGreetings : englishGreetings;

  if (hour < 12) return greetings[0];
  if (hour < 17) return greetings[1];
  return greetings[2];
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function generateSuggestedMessage(
  name: string,
  reason: string,
  discType: string | null,
  language: string | null
): string {
  const firstName = name.split(' ')[0];

  // Birthday messages
  if (reason.toLowerCase().includes('birthday')) {
    if (language === 'es') {
      return `Feliz cumpleanos, ${firstName}! Espero que tengas un dia increible. Un abrazo.`;
    }
    return `Happy birthday, ${firstName}! Hope you have an amazing day.`;
  }

  // DISC-based messages
  if (language === 'es') {
    if (discType === 'D') return `Hola ${firstName}, queria preguntarte algo rapido. Tienes un momento?`;
    if (discType === 'I') return `Hola ${firstName}, estaba pensando en ti. Como va todo?`;
    if (discType === 'S') return `Hola ${firstName}, solo queria saludarte y ver como estas. Sin prisa.`;
    if (discType === 'C') return `Hola ${firstName}, tengo unos datos del mercado que te pueden interesar.`;
    return `Hola ${firstName}, como estas? Solo queria saludarte.`;
  }

  if (discType === 'D') return `Hey ${firstName}, quick question - do you have a minute?`;
  if (discType === 'I') return `Hey ${firstName}, been thinking about you! How's everything going?`;
  if (discType === 'S') return `Hi ${firstName}, just checking in to see how you're doing. No rush on anything.`;
  if (discType === 'C') return `Hi ${firstName}, wanted to share some market numbers for your area.`;
  return `Hey ${firstName}, just wanted to check in. How's everything going?`;
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const in14Days = new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];
    const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const ago30Days = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
    const ago7Days = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Parallel queries
    const [
      closingSoonRes,
      overdueFollowupsRes,
      goneQuietRes,
      activeDealsRes,
      recentClosedRes,
      contactsTouchedRes,
      allOverdueRes,
      birthdayRes,
    ] = await Promise.all([
      // Deals closing within 14 days
      supabase
        .from('transactions')
        .select('id, property_address, status, contract_price, closing_date, checklist, contact_id, contacts(first_name, last_name)')
        .eq('user_id', user.id)
        .neq('status', 'closed')
        .neq('status', 'cancelled')
        .neq('status', 'lost')
        .gte('closing_date', todayStr)
        .lte('closing_date', in14Days)
        .order('closing_date', { ascending: true })
        .limit(5),

      // Overdue follow-ups (buyers/sellers first)
      supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, disc_type, language_preference, track_type, next_follow_up_date, last_contact_date')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .lt('next_follow_up_date', todayStr)
        .order('next_follow_up_date', { ascending: true })
        .limit(5),

      // Gone quiet (no activity in 30+ days)
      supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, disc_type, language_preference, track_type, last_contact_date')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .in('track_type', ['buyer', 'seller', 'sphere'])
        .lt('last_contact_date', ago30Days)
        .not('last_contact_date', 'is', null)
        .order('last_contact_date', { ascending: true })
        .limit(3),

      // Active deals count + pipeline
      supabase
        .from('transactions')
        .select('id, contract_price, closing_date, status')
        .eq('user_id', user.id)
        .not('status', 'in', '("closed","cancelled","lost")'),

      // Recently closed deals (for grow section)
      supabase
        .from('transactions')
        .select('id, property_address, closing_date, contact_id')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .gte('closing_date', ago7Days)
        .limit(3),

      // Contacts touched this week
      supabase
        .from('activities')
        .select('contact_id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('activity_date', weekStartStr),

      // Total overdue count
      supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .lt('next_follow_up_date', todayStr),

      // Birthdays this week
      supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, disc_type, language_preference, birthday_month, birthday_day')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .not('birthday_month', 'is', null)
        .not('birthday_day', 'is', null),
    ]);

    // Build Money Moves
    const moneyMoves: Array<{
      type: 'closing_soon' | 'document_gap' | 'follow_up_hot';
      title: string;
      subtitle: string;
      action: string;
      contact_id?: string;
      transaction_id?: string;
      urgency: 'high' | 'medium' | 'low';
    }> = [];

    // Closing soon deals
    if (closingSoonRes.data) {
      for (const deal of closingSoonRes.data) {
        const daysLeft = Math.floor(
          (new Date(deal.closing_date + 'T00:00:00').getTime() - now.getTime()) / 86400000
        );
        const contactRaw = deal.contacts as unknown;
        const contact = Array.isArray(contactRaw) ? contactRaw[0] as { first_name: string; last_name: string } | undefined : contactRaw as { first_name: string; last_name: string } | null;
        const contactName = contact ? `${contact.first_name} ${contact.last_name}`.trim() : '';

        // Check checklist completion
        let checklistPct = 100;
        if (deal.checklist && Array.isArray(deal.checklist)) {
          const total = deal.checklist.length;
          const done = deal.checklist.filter((c: { completed?: boolean }) => c.completed).length;
          checklistPct = total > 0 ? Math.round((done / total) * 100) : 100;
        }

        moneyMoves.push({
          type: 'closing_soon',
          title: deal.property_address || 'Deal',
          subtitle: `Closing in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}${contactName ? ` with ${contactName}` : ''}${checklistPct < 100 ? ` - ${checklistPct}% docs complete` : ''}`,
          action: 'Review deal details',
          transaction_id: deal.id,
          contact_id: deal.contact_id || undefined,
          urgency: daysLeft <= 3 ? 'high' : daysLeft <= 7 ? 'medium' : 'low',
        });
      }
    }

    // Hot follow-ups (buyers/sellers overdue)
    if (overdueFollowupsRes.data) {
      for (const c of overdueFollowupsRes.data) {
        if (!['buyer', 'seller'].includes(c.track_type)) continue;
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(c.next_follow_up_date + 'T00:00:00').getTime()) / 86400000
        );
        moneyMoves.push({
          type: 'follow_up_hot',
          title: `${c.first_name} ${c.last_name || ''}`.trim(),
          subtitle: `${c.track_type === 'buyer' ? 'Buyer' : 'Seller'} follow-up overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`,
          action: 'Reach out now',
          contact_id: c.id,
          urgency: daysOverdue >= 7 ? 'high' : 'medium',
        });
      }
    }

    // Build Nurture
    const nurture: Array<{
      contact_id: string;
      name: string;
      reason: string;
      disc_type?: string | null;
      language?: string | null;
      suggested_message: string;
      phone: string;
      action_type: 'text' | 'call';
    }> = [];

    // Overdue follow-ups for nurture
    if (overdueFollowupsRes.data) {
      for (const c of overdueFollowupsRes.data) {
        if (!c.phone) continue;
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(c.next_follow_up_date + 'T00:00:00').getTime()) / 86400000
        );
        const name = `${c.first_name} ${c.last_name || ''}`.trim();
        const lang = c.language_preference === 'es' ? 'es' : null;
        nurture.push({
          contact_id: c.id,
          name,
          reason: `Overdue follow-up (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''})`,
          disc_type: c.disc_type,
          language: lang,
          suggested_message: generateSuggestedMessage(name, 'overdue', c.disc_type, lang),
          phone: c.phone,
          action_type: 'text',
        });
      }
    }

    // Birthdays this week
    if (birthdayRes.data) {
      const todayMonth = now.getMonth() + 1;
      const todayDay = now.getDate();
      for (const c of birthdayRes.data) {
        if (!c.phone || !c.birthday_month || !c.birthday_day) continue;
        // Check if birthday is within next 7 days
        const bDate = new Date(now.getFullYear(), c.birthday_month - 1, c.birthday_day);
        const diffDays = Math.floor((bDate.getTime() - now.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays <= 7) {
          const name = `${c.first_name} ${c.last_name || ''}`.trim();
          const lang = c.language_preference === 'es' ? 'es' : null;
          const dayLabel = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`;
          nurture.push({
            contact_id: c.id,
            name,
            reason: `Birthday ${dayLabel.toLowerCase()}`,
            disc_type: c.disc_type,
            language: lang,
            suggested_message: generateSuggestedMessage(name, 'birthday', c.disc_type, lang),
            phone: c.phone,
            action_type: 'text',
          });
        }
      }
    }

    // Gone quiet
    if (goneQuietRes.data) {
      for (const c of goneQuietRes.data) {
        if (!c.phone) continue;
        // Skip if already in nurture
        if (nurture.some(n => n.contact_id === c.id)) continue;
        const daysSilent = c.last_contact_date
          ? Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / 86400000)
          : 0;
        const name = `${c.first_name} ${c.last_name || ''}`.trim();
        const lang = c.language_preference === 'es' ? 'es' : null;
        nurture.push({
          contact_id: c.id,
          name,
          reason: `Gone quiet (${daysSilent} days)`,
          disc_type: c.disc_type,
          language: lang,
          suggested_message: generateSuggestedMessage(name, 'quiet', c.disc_type, lang),
          phone: c.phone,
          action_type: 'text',
        });
      }
    }

    // Build Grow
    const grow: Array<{
      type: 'content_idea' | 'milestone';
      title: string;
      description: string;
    }> = [];

    if (recentClosedRes.data && recentClosedRes.data.length > 0) {
      for (const deal of recentClosedRes.data) {
        grow.push({
          type: 'content_idea',
          title: 'Just Sold post',
          description: `Share the win for ${deal.property_address || 'your recent closing'}. Tag the happy buyer and thank your team.`,
        });
      }
    }

    // Static content ideas
    const contentIdeas = [
      { title: 'Market Update', description: 'Share what you are seeing in the DFW market this week. Prices, inventory, buyer demand.' },
      { title: 'Tip of the Week', description: 'Share a home buying or selling tip. Keep it simple and helpful.' },
      { title: 'Behind the Scenes', description: 'Show what a day looks like. Inspections, showings, paperwork - the real stuff.' },
      { title: 'Client Spotlight', description: 'With permission, share a client success story or testimonial.' },
    ];
    const dayIndex = now.getDay();
    if (grow.length === 0) {
      grow.push({
        type: 'content_idea',
        ...contentIdeas[dayIndex % contentIdeas.length],
      });
    }

    // Stats
    const activeDealsList = activeDealsRes.data || [];
    const pipelineValue = activeDealsList.reduce((sum, d) => sum + (d.contract_price || 0), 0);
    let daysToNextClosing: number | null = null;
    const nextClosing = activeDealsList
      .filter(d => d.closing_date)
      .sort((a, b) => new Date(a.closing_date!).getTime() - new Date(b.closing_date!).getTime())[0];
    if (nextClosing?.closing_date) {
      daysToNextClosing = Math.floor(
        (new Date(nextClosing.closing_date + 'T00:00:00').getTime() - now.getTime()) / 86400000
      );
    }

    return NextResponse.json({
      greeting: getGreeting(),
      date: formatDate(),
      money_moves: moneyMoves,
      nurture: nurture.slice(0, 8),
      grow,
      stats: {
        active_deals: activeDealsList.length,
        pipeline_value: pipelineValue,
        days_to_next_closing: daysToNextClosing,
        contacts_touched_this_week: contactsTouchedRes.count || 0,
        overdue_followups: allOverdueRes.count || 0,
      },
    });
  } catch (err) {
    console.error('Today API error:', err);
    return NextResponse.json({ error: 'Failed to load today data' }, { status: 500 });
  }
}
