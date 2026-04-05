import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateUUID } from '@/lib/security/validation';
import { getDisplayName } from '@/lib/format';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch contact
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (contactErr || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Fetch recent activities
    const { data: activities } = await supabase
      .from('activities')
      .select('id, activity_type, direction, description, activity_date')
      .eq('contact_id', id)
      .order('activity_date', { ascending: false })
      .limit(10);

    const recentActivities = activities || [];
    const lastActivity = recentActivities[0] || null;

    // Fetch referral partner name if linked
    let partnerName: string | null = null;
    if (contact.referral_partner_id) {
      const { data: partner } = await supabase
        .from('referral_partners')
        .select('first_name, last_name')
        .eq('id', contact.referral_partner_id)
        .single();
      if (partner) {
        partnerName = getDisplayName(partner);
      }
    }

    // Calculate days since last contact
    let daysSinceContact = -1;
    if (contact.last_contact_date) {
      daysSinceContact = Math.floor(
        (Date.now() - new Date(contact.last_contact_date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)
      );
    } else if (lastActivity) {
      daysSinceContact = Math.floor(
        (Date.now() - new Date(lastActivity.activity_date).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Count outbound activities
    const outboundCount = recentActivities.filter(a => a.direction === 'outbound').length;
    const hasInbound = recentActivities.some(a => a.direction === 'inbound');
    const stage = contact.pipeline_stage;
    const firstName = contact.first_name;

    // Generate suggestion
    let suggestion = '';

    if (stage === 'on_hold') {
      suggestion = 'On hold until their specified date. Do not reach out unless they contact you first.';
    } else if (stage === 'closing') {
      suggestion = 'Active deal. Check on next milestone: walkthrough, closing date, or documents needed.';
    } else if (stage === 'nurturing') {
      suggestion = 'Monthly check-in. Send a specific listing in their area, not a generic "checking in" text.';
    } else if (stage === 'new' && recentActivities.length === 0) {
      suggestion = 'Send opening text. This is a new lead with no contact history.';
    } else if (stage === 'new' && hasInbound) {
      suggestion = 'They responded! Keep the conversation going. Ask about their timeline and what they are looking for specifically.';
    } else if (stage === 'new' && !hasInbound) {
      if (outboundCount <= 2) {
        suggestion = `Day ${daysSinceContact >= 0 ? daysSinceContact : '?'} follow-up. Try calling first, then text if no answer.`;
      } else if (outboundCount <= 4) {
        suggestion = `Day ${daysSinceContact >= 0 ? daysSinceContact : '?'} follow-up. Offer specific value - listings in their area or lender connection.`;
      } else {
        suggestion = 'Multiple outreach attempts with no reply. Consider moving to monthly nurture.';
      }
    } else if (hasInbound) {
      suggestion = 'They have engaged before. Continue the conversation with a relevant update or question about their search.';
    } else {
      suggestion = `Follow up with ${firstName}. Check on their current needs and timeline.`;
    }

    // Generate draft message
    const isSpanish = contact.language_preference === 'es';
    let draftMessage = '';

    if (isSpanish) {
      draftMessage = `Hola ${firstName}`;
      if (contact.location_preference) {
        draftMessage += `, vi algunas propiedades nuevas en ${contact.location_preference}`;
        if (contact.budget) {
          draftMessage += ` dentro de tu presupuesto de ${contact.budget}`;
        }
        draftMessage += '. Te las mando?';
      } else {
        draftMessage += ', te escribo para ver como vas con tu busqueda de propiedad. Hay algo que pueda hacer por ti?';
      }
    } else {
      draftMessage = `Hey ${firstName}`;
      if (contact.location_preference) {
        draftMessage += `, I saw some new listings in ${contact.location_preference}`;
        if (contact.budget) {
          draftMessage += ` in the ${contact.budget} range`;
        }
        draftMessage += '. Want me to send them over?';
      } else {
        draftMessage += ', just checking in on your property search. Anything I can help with?';
      }
    }

    return NextResponse.json({
      suggestion,
      draftMessage,
      daysSinceContact,
      lastActivity,
      contact: {
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        phone: contact.phone,
        email: contact.email,
        pipeline_stage: contact.pipeline_stage,
        track_type: contact.track_type,
        lead_source: contact.lead_source,
        language_preference: contact.language_preference,
        location_preference: contact.location_preference,
        budget: contact.budget,
        follow_up_notes: contact.follow_up_notes,
        next_follow_up_date: contact.next_follow_up_date,
        last_contact_date: contact.last_contact_date,
      },
      partnerName,
      outboundCount,
    });
  } catch (err) {
    console.error('[contacts:suggest]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
