/**
 * Today API - War Room daily briefing endpoint
 *
 * Aggregates contacts, transactions, activities into a single
 * revenue-intelligence payload for the Today page.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { FINANCIALS, calculateTrueNet } from '@/lib/financials';

function getTimeWord(): { en: string; es: string } {
  const ctHour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'America/Chicago',
    }).format(new Date())
  );
  if (ctHour >= 5 && ctHour < 12) return { en: 'morning', es: 'dias' };
  if (ctHour >= 12 && ctHour < 17) return { en: 'afternoon', es: 'tardes' };
  return { en: 'evening', es: 'noches' };
}

function formatDate(): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  }).format(new Date());
}

function generateMessage(
  firstName: string,
  discType: string | null,
  language: string | null,
  reason: 'followup' | 'birthday' | 'quiet'
): string {
  const isSpanish = language === 'es' || language === 'spanish';

  if (reason === 'birthday') {
    return isSpanish
      ? `Feliz cumple ${firstName}! Espero que la pases increible.`
      : `Happy birthday ${firstName}! Hope you have a great one.`;
  }

  if (isSpanish) {
    switch (discType) {
      case 'D': return `Que onda ${firstName}, te tengo unos datos del mercado en tu area. Te los mando?`;
      case 'I': return `Que onda ${firstName}, como andas? Cualquier cosa que necesites con bienes raices, aqui andamos.`;
      case 'S': return `Hola ${firstName}, nomas pasando a saludar. Sin prisa, nomas queria ver como andabas.`;
      case 'C': return `Que tal ${firstName}, tengo unos numeros del mercado de tu zona. Te interesa que los revisemos?`;
      default: return `Que onda ${firstName}, nomas queria saludar. Cualquier cosa que ocupes con bienes raices, aqui andamos.`;
    }
  }

  switch (discType) {
    case 'D': return `Hey ${firstName}, quick update on the market in your area. Want me to send you some numbers?`;
    case 'I': return `Hey ${firstName}, been a minute! How's everything going? Let me know if you need anything on the real estate side.`;
    case 'S': return `Hi ${firstName}, just checking in. No rush on anything, just wanted to see how you're doing.`;
    case 'C': return `Hey ${firstName}, pulled some market data for your area. Happy to walk through the numbers if you're interested.`;
    default: return `Hey ${firstName}, just wanted to check in and see how things are going. Anything I can help with on the real estate side?`;
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const in14Days = new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];
    const in30Days = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
    const ago24Hours = new Date(now.getTime() - 86400000).toISOString();
    const ago30Days = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
    const ago3Days = new Date(now.getTime() - 3 * 86400000).toISOString().split('T')[0];
    const ago14Days = new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0];
    const yearStart = `${now.getFullYear()}-01-01`;

    // Parallel queries
    const [
      allTransactionsRes,
      overdueFollowupsRes,
      goneQuietRes,
      birthdayRes,
      newLeadsRes,
      recentActivitiesRes,
      allContactsCountRes,
      coldContactsRes,
      anaContactRes,
    ] = await Promise.all([
      // All transactions this year
      supabase
        .from('transactions')
        .select('id, property_address, status, contract_price, closing_date, checklist, contact_id, commission_gross, commission_net, commission_rate, referral_fee, parties, contacts(id, first_name, last_name, phone, language_preference, referred_by_contact_id)')
        .eq('user_id', user.id),

      // Overdue follow-ups
      supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, disc_type, language_preference, track_type, next_follow_up_date, last_contact_date')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .lt('next_follow_up_date', todayStr)
        .order('next_follow_up_date', { ascending: true })
        .limit(10),

      // Gone quiet (30+ days)
      supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, disc_type, language_preference, track_type, last_contact_date')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .not('last_contact_date', 'is', null)
        .lt('last_contact_date', ago30Days)
        .order('last_contact_date', { ascending: true })
        .limit(5),

      // Birthdays within 7 days
      supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, disc_type, language_preference, birthday_month, birthday_day')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .not('birthday_month', 'is', null)
        .not('birthday_day', 'is', null),

      // New leads (last 24 hours)
      supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, track_type')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .in('track_type', ['buyer', 'seller'])
        .gte('created_at', ago24Hours)
        .limit(3),

      // Recent activities for streak calc (last 30 days)
      supabase
        .from('activities')
        .select('activity_date')
        .eq('user_id', user.id)
        .gte('activity_date', ago30Days)
        .order('activity_date', { ascending: false }),

      // Total overdue count
      supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .lt('next_follow_up_date', todayStr),

      // Cold contacts (for pipeline cold power move)
      supabase
        .from('contacts')
        .select('id, first_name, last_name, phone')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .not('phone', 'is', null)
        .not('last_contact_date', 'is', null)
        .lt('last_contact_date', ago3Days)
        .order('last_contact_date', { ascending: true })
        .limit(3),

      // Find Ana (referral partner)
      supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, last_contact_date')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .ilike('first_name', 'Ana%')
        .limit(5),
    ]);

    const allTransactions = allTransactionsRes.data || [];
    const overdueContacts = overdueFollowupsRes.data || [];
    const overdueCount = allContactsCountRes.count || 0;

    // Commission calculations
    const closedThisYear = allTransactions.filter(
      t => t.status === 'closed' && t.closing_date && t.closing_date >= yearStart
    );
    const activeDeals = allTransactions.filter(
      t => !['closed', 'cancelled', 'lost'].includes(t.status)
    );

    let ytdCommission = 0;
    for (const t of closedThisYear) {
      const net = parseFloat(String(t.commission_net || '0'));
      ytdCommission += net - FINANCIALS.CMR_TRANSACTION_FEE;
    }

    let pendingIncome = 0;
    for (const t of activeDeals) {
      const net = parseFloat(String(t.commission_net || '0'));
      if (net > 0) pendingIncome += net - FINANCIALS.CMR_TRANSACTION_FEE;
    }

    // Deals closing within 30 days
    const closingSoonDeals = activeDeals
      .filter(d => d.closing_date && d.closing_date >= todayStr && d.closing_date <= in30Days)
      .sort((a, b) => (a.closing_date || '').localeCompare(b.closing_date || ''));

    // Follow-up streak
    let streak = 0;
    if (recentActivitiesRes.data && recentActivitiesRes.data.length > 0) {
      const activityDates = new Set(
        recentActivitiesRes.data.map(a => a.activity_date?.split('T')[0]).filter(Boolean)
      );
      const checkDate = new Date(now);
      checkDate.setHours(0, 0, 0, 0);
      // Check today first, then go backward
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (activityDates.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // If today has no activity but yesterday does, start from yesterday
          if (streak === 0) {
            checkDate.setDate(checkDate.getDate() - 1);
            const yesterdayStr = checkDate.toISOString().split('T')[0];
            if (activityDates.has(yesterdayStr)) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
              continue;
            }
          }
          break;
        }
      }
    }

    // Greeting with context
    const tw = getTimeWord();
    const useSpanish = Math.random() < 0.2;
    let greeting = '';
    let nextClosingDeal = closingSoonDeals[0];
    if (nextClosingDeal) {
      const daysToClose = Math.floor(
        (new Date(nextClosingDeal.closing_date + 'T00:00:00').getTime() - now.getTime()) / 86400000
      );
      const netIncoming = calculateTrueNet(
        parseFloat(String(nextClosingDeal.commission_net || nextClosingDeal.commission_gross || '0')),
        parseFloat(String(nextClosingDeal.referral_fee || '0'))
      );
      if (daysToClose <= 14) {
        greeting = useSpanish
          ? `Buenas ${tw.es}, Anthony. ${daysToClose} dias para cerrar. $${netIncoming.toLocaleString()} en camino.`
          : `Good ${tw.en}, Anthony. ${daysToClose} days to closing. $${netIncoming.toLocaleString()} incoming.`;
      }
    }
    if (!greeting && overdueCount > 0) {
      greeting = useSpanish
        ? `Buenas ${tw.es}, Anthony. ${overdueCount} persona${overdueCount !== 1 ? 's' : ''} esperando noticias tuyas.`
        : `Good ${tw.en}, Anthony. ${overdueCount} ${overdueCount === 1 ? 'person' : 'people'} waiting to hear from you.`;
    }
    if (!greeting) {
      greeting = useSpanish
        ? `Buenas ${tw.es}, Anthony. Hora de construir el pipeline.`
        : `Good ${tw.en}, Anthony. Time to build the pipeline.`;
    }

    // Power Move
    type PowerMove = {
      label: string;
      action: string;
      button_type: 'call' | 'text' | 'open';
      button_label: string;
      href: string;
    };
    let powerMove: PowerMove | null = null;

    // Priority 1: Deal closing within 7 days + incomplete docs
    for (const deal of closingSoonDeals) {
      if (!deal.closing_date || deal.closing_date > in7Days) continue;
      const checklist = deal.checklist as Array<{ is_completed?: boolean; label?: string }> | null;
      if (checklist && checklist.length > 0) {
        const incomplete = checklist.find(c => !c.is_completed);
        if (incomplete) {
          const parties = deal.parties as Array<{ name?: string; phone?: string; role?: string }> | null;
          const partyToCall = parties?.find(p => p.phone);
          powerMove = {
            label: "TODAY'S POWER MOVE",
            action: partyToCall
              ? `Call ${partyToCall.name} about ${incomplete.label || 'missing document'} for ${deal.property_address}`
              : `Handle "${incomplete.label || 'missing document'}" for ${deal.property_address}`,
            button_type: partyToCall ? 'call' : 'open',
            button_label: partyToCall ? `Call ${partyToCall.name?.split(' ')[0]}` : 'Open Deal',
            href: partyToCall?.phone ? `tel:${partyToCall.phone.replace(/\D/g, '')}` : `/transactions/${deal.id}`,
          };
          break;
        }
      }
    }

    // Priority 2: Deal closing within 14 days
    if (!powerMove) {
      for (const deal of closingSoonDeals) {
        if (!deal.closing_date || deal.closing_date > in14Days) continue;
        const checklist = deal.checklist as Array<{ is_completed?: boolean }> | null;
        const total = checklist?.length || 0;
        const done = checklist?.filter(c => c.is_completed).length || 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 100;
        powerMove = {
          label: "TODAY'S POWER MOVE",
          action: `Review closing checklist for ${deal.property_address}. ${pct}% complete.`,
          button_type: 'open',
          button_label: 'Open Deal',
          href: `/transactions/${deal.id}`,
        };
        break;
      }
    }

    // Priority 3: New lead in last 24 hours
    if (!powerMove && newLeadsRes.data && newLeadsRes.data.length > 0) {
      const lead = newLeadsRes.data[0];
      powerMove = {
        label: "TODAY'S POWER MOVE",
        action: `NEW LEAD: Call ${lead.first_name} today. Speed wins deals.`,
        button_type: lead.phone ? 'call' : 'open',
        button_label: lead.phone ? 'Call Now' : 'View Contact',
        href: lead.phone ? `tel:${lead.phone.replace(/\D/g, '')}` : `/contacts/${lead.id}`,
      };
    }

    // Priority 4: Most overdue follow-up
    if (!powerMove && overdueContacts.length > 0) {
      const contact = overdueContacts[0];
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(contact.next_follow_up_date + 'T00:00:00').getTime()) / 86400000
      );
      powerMove = {
        label: "TODAY'S POWER MOVE",
        action: `Follow up with ${contact.first_name}${contact.last_name ? ' ' + contact.last_name : ''}. It's been ${daysOverdue} days.`,
        button_type: contact.phone ? 'text' : 'open',
        button_label: contact.phone ? 'Send Text' : 'View Contact',
        href: contact.phone
          ? `sms:${contact.phone.replace(/\D/g, '')}&body=${encodeURIComponent(generateMessage(contact.first_name, contact.disc_type, contact.language_preference, 'followup'))}`
          : `/contacts/${contact.id}`,
      };
    }

    // Priority 5: Pipeline cold
    if (!powerMove && coldContactsRes.data && coldContactsRes.data.length >= 1) {
      const names = coldContactsRes.data.map(c => c.first_name).slice(0, 3);
      powerMove = {
        label: "TODAY'S POWER MOVE",
        action: `Your pipeline is going cold. Text ${names.join(', ')}${names.length > 1 ? '' : ''} today.`,
        button_type: 'open',
        button_label: 'View Contacts',
        href: '/contacts',
      };
    }

    // Money Moves (deals closing within 30 days)
    const moneyMoves = closingSoonDeals.map(deal => {
      const daysLeft = Math.floor(
        (new Date(deal.closing_date + 'T00:00:00').getTime() - now.getTime()) / 86400000
      );
      const contactRaw = deal.contacts as unknown;
      const contact = Array.isArray(contactRaw) ? contactRaw[0] : contactRaw;
      const contactName = contact ? `${(contact as { first_name: string }).first_name} ${((contact as { last_name?: string }).last_name || '')}`.trim() : '';
      const checklist = deal.checklist as Array<{ is_completed?: boolean }> | null;
      const total = checklist?.length || 0;
      const done = checklist?.filter(c => c.is_completed).length || 0;
      const pct = total > 0 ? Math.round((done / total) * 100) : 100;
      const parties = deal.parties as Array<{ name?: string; phone?: string; role?: string }> | null;
      const callableParty = parties?.find(p => p.phone);

      return {
        transaction_id: deal.id,
        contact_id: deal.contact_id,
        address: deal.property_address,
        contact_name: contactName,
        days_to_close: daysLeft,
        doc_completion_pct: pct,
        doc_done: done,
        doc_total: total,
        party_name: callableParty?.name || null,
        party_phone: callableParty?.phone || null,
        party_role: callableParty?.role || null,
      };
    });

    // Nurture (top 5 contacts needing attention)
    interface NurtureCard {
      contact_id: string;
      name: string;
      first_name: string;
      reason: string;
      reason_type: 'overdue' | 'birthday' | 'quiet';
      days: number;
      disc_type: string | null;
      language: string | null;
      track_type: string;
      suggested_message: string;
      phone: string;
    }
    const nurtureCards: NurtureCard[] = [];

    // Overdue follow-ups
    for (const c of overdueContacts) {
      if (!c.phone) continue;
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(c.next_follow_up_date + 'T00:00:00').getTime()) / 86400000
      );
      nurtureCards.push({
        contact_id: c.id,
        name: `${c.first_name} ${c.last_name || ''}`.trim(),
        first_name: c.first_name,
        reason: `Overdue ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`,
        reason_type: 'overdue',
        days: daysOverdue,
        disc_type: c.disc_type,
        language: c.language_preference,
        track_type: c.track_type,
        suggested_message: generateMessage(c.first_name, c.disc_type, c.language_preference, 'followup'),
        phone: c.phone,
      });
    }

    // Birthdays
    if (birthdayRes.data) {
      for (const c of birthdayRes.data) {
        if (!c.phone || !c.birthday_month || !c.birthday_day) continue;
        if (nurtureCards.some(n => n.contact_id === c.id)) continue;
        const bDate = new Date(now.getFullYear(), c.birthday_month - 1, c.birthday_day);
        if (bDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
          bDate.setFullYear(bDate.getFullYear() + 1);
        }
        const diffDays = Math.floor((bDate.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
        if (diffDays >= 0 && diffDays <= 7) {
          const dayLabel = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`;
          nurtureCards.push({
            contact_id: c.id,
            name: `${c.first_name} ${c.last_name || ''}`.trim(),
            first_name: c.first_name,
            reason: `Birthday ${dayLabel.toLowerCase()}`,
            reason_type: 'birthday',
            days: diffDays,
            disc_type: c.disc_type,
            language: c.language_preference,
            track_type: 'sphere',
            suggested_message: generateMessage(c.first_name, c.disc_type, c.language_preference, 'birthday'),
            phone: c.phone,
          });
        }
      }
    }

    // Gone quiet
    if (goneQuietRes.data) {
      for (const c of goneQuietRes.data) {
        if (!c.phone) continue;
        if (nurtureCards.some(n => n.contact_id === c.id)) continue;
        const daysSilent = Math.floor((now.getTime() - new Date(c.last_contact_date!).getTime()) / 86400000);
        nurtureCards.push({
          contact_id: c.id,
          name: `${c.first_name} ${c.last_name || ''}`.trim(),
          first_name: c.first_name,
          reason: `Quiet for ${daysSilent} days`,
          reason_type: 'quiet',
          days: daysSilent,
          disc_type: c.disc_type,
          language: c.language_preference,
          track_type: c.track_type,
          suggested_message: generateMessage(c.first_name, c.disc_type, c.language_preference, 'followup'),
          phone: c.phone,
        });
      }
    }

    // Ana lead source insight
    let anaInsight: {
      ana_name: string;
      ana_deals: number;
      total_deals: number;
      ana_phone: string | null;
      ana_last_contact: string | null;
      days_since_contact: number | null;
    } | null = null;

    if (anaContactRes.data && anaContactRes.data.length > 0) {
      // Find Ana with a referral partner role
      const ana = anaContactRes.data[0];
      // Count deals where contact was referred by Ana
      const anaDeals = allTransactions.filter(t => {
        const contactRaw = t.contacts as unknown;
        const contact = Array.isArray(contactRaw) ? contactRaw[0] : contactRaw;
        return contact && (contact as { referred_by_contact_id?: string }).referred_by_contact_id === ana.id;
      }).length;

      if (anaDeals > 0 || allTransactions.length > 0) {
        const daysSince = ana.last_contact_date
          ? Math.floor((now.getTime() - new Date(ana.last_contact_date).getTime()) / 86400000)
          : null;
        anaInsight = {
          ana_name: `${ana.first_name} ${ana.last_name || ''}`.trim(),
          ana_deals: anaDeals,
          total_deals: allTransactions.length,
          ana_phone: ana.phone,
          ana_last_contact: ana.last_contact_date,
          days_since_contact: daysSince,
        };
      }
    }

    // Deal dots for commission ring
    const dealDots = Array.from({ length: FINANCIALS.DEALS_GOAL }, (_, i) => {
      if (i < closedThisYear.length) return 'closed' as const;
      if (i < closedThisYear.length + activeDeals.length) return 'active' as const;
      return 'empty' as const;
    });

    return NextResponse.json({
      greeting,
      date: formatDate(),
      commission: {
        ytd_earned: Math.max(0, ytdCommission),
        pending: Math.max(0, pendingIncome),
        goal: FINANCIALS.ANNUAL_COMMISSION_GOAL,
        deals_closed: closedThisYear.length,
        deals_active: activeDeals.length,
        deals_goal: FINANCIALS.DEALS_GOAL,
        deal_dots: dealDots,
      },
      power_move: powerMove,
      streak,
      money_moves: moneyMoves,
      nurture: nurtureCards.slice(0, 5),
      ana_insight: anaInsight,
      overdue_count: overdueCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load today data', details: message }, { status: 500 });
  }
}
