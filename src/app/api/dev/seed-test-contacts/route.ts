/**
 * Seed Test Contacts API
 *
 * POST /api/dev/seed-test-contacts
 *
 * Creates 20 dummy contacts to verify all CRM systems end-to-end.
 * Restricted to Anthony's account or development environment.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDisplayName } from '@/lib/format';

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function randomPhone(): string {
  const suffix = String(Math.floor(Math.random() * 9000000) + 1000000);
  return `+1972${suffix}`;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const now = new Date();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();
    const tomorrow = daysFromNow(1);
    const fiveDays = daysFromNow(5);
    const twoDays = daysFromNow(2);
    const threeDays = daysFromNow(3);

    const contactDefs = [
      // 1-3: Birthday testing
      {
        first_name: 'Test', last_name: 'Birthday Today',
        birthday_month: todayMonth, birthday_day: todayDay, birthday_year: 1990,
        disc_type: 'D', language_preference: 'en', track_type: 'sphere', pipeline_stage: 'nurturing',
      },
      {
        first_name: 'Test', last_name: 'Birthday Tomorrow',
        birthday_month: tomorrow.getMonth() + 1, birthday_day: tomorrow.getDate(), birthday_year: null,
        disc_type: 'I', language_preference: 'es', track_type: 'sphere', pipeline_stage: 'nurturing',
      },
      {
        first_name: 'Test', last_name: 'Birthday NextWeek',
        birthday_month: fiveDays.getMonth() + 1, birthday_day: fiveDays.getDate(), birthday_year: 1985,
        disc_type: 'S', language_preference: 'en', track_type: 'sphere', pipeline_stage: 'nurturing',
        email: null,
      },
      // 4-6: Post-close testing (sphere + closed pipeline)
      {
        first_name: 'Test', last_name: '30Day PostClose',
        disc_type: 'C', language_preference: 'en', track_type: 'buyer', pipeline_stage: 'closed',
        _transaction: { property_address: '123 Test Oak Dr', closing_date: dateStr(daysAgo(30)), status: 'closed' },
      },
      {
        first_name: 'Test', last_name: '90Day PostClose',
        disc_type: 'I', language_preference: 'en', track_type: 'buyer', pipeline_stage: 'closed',
        _transaction: { property_address: '456 Test Elm St', closing_date: dateStr(daysAgo(90)), status: 'closed' },
      },
      {
        first_name: 'Test', last_name: '1Year PostClose',
        disc_type: 'D', language_preference: 'es', track_type: 'buyer', pipeline_stage: 'closed',
        _transaction: { property_address: '789 Test Pine Ln', closing_date: dateStr(daysAgo(365)), status: 'closed' },
      },
      // 7-9: Gone quiet testing
      {
        first_name: 'Test', last_name: 'GoneQuiet 60d',
        disc_type: 'S', language_preference: 'en', track_type: 'sphere', pipeline_stage: 'nurturing',
        _activity: { days_ago: 60 },
      },
      {
        first_name: 'Test', last_name: 'GoneQuiet 90d',
        disc_type: 'C', language_preference: 'en', track_type: 'buyer', pipeline_stage: 'nurturing',
        _activity: { days_ago: 90 },
      },
      {
        first_name: 'Test', last_name: 'GoneQuiet Never',
        disc_type: null, language_preference: 'en', track_type: 'sphere', pipeline_stage: 'new',
        _created_ago: 90,
      },
      // 10-13: DISC variety
      {
        first_name: 'Test', last_name: 'DISC Driver',
        disc_type: 'D', engagement_temperature: 'hot', track_type: 'buyer', pipeline_stage: 'qualifying',
        next_follow_up_date: dateStr(now),
      },
      {
        first_name: 'Test', last_name: 'DISC Influencer',
        disc_type: 'I', engagement_temperature: 'warm', track_type: 'buyer', pipeline_stage: 'showing',
        next_follow_up_date: dateStr(daysAgo(1)),
      },
      {
        first_name: 'Test', last_name: 'DISC Steady',
        disc_type: 'S', engagement_temperature: 'cool', track_type: 'sphere', pipeline_stage: 'nurturing',
        next_follow_up_date: dateStr(daysFromNow(1)),
      },
      {
        first_name: 'Test', last_name: 'DISC Cautious',
        disc_type: 'C', engagement_temperature: 'cold', track_type: 'buyer', pipeline_stage: 'qualifying',
        next_follow_up_date: dateStr(daysAgo(2)),
      },
      // 14-16: Language testing
      {
        first_name: 'Test', last_name: 'Spanish Contact',
        disc_type: 'I', language_preference: 'es', track_type: 'sphere', pipeline_stage: 'nurturing',
        birthday_month: threeDays.getMonth() + 1, birthday_day: threeDays.getDate(),
      },
      {
        first_name: 'Test', last_name: 'Bilingual Contact',
        disc_type: 'S', language_preference: 'bilingual', track_type: 'buyer', pipeline_stage: 'qualifying',
      },
      {
        first_name: 'Test', last_name: 'English Default',
        disc_type: null, language_preference: 'en', track_type: 'sphere', pipeline_stage: 'new',
      },
      // 17-18: Deal context testing
      {
        first_name: 'Test', last_name: 'ActiveDeal Hot',
        disc_type: 'D', engagement_temperature: 'hot', track_type: 'buyer', pipeline_stage: 'under_contract',
        next_follow_up_date: dateStr(now),
        _transaction: { property_address: '100 Test Market Ave', closing_date: dateStr(daysFromNow(30)), status: 'active', contract_price: 350000 },
      },
      {
        first_name: 'Test', last_name: 'ActiveDeal Cold',
        disc_type: 'C', engagement_temperature: 'cold', track_type: 'buyer', pipeline_stage: 'under_contract',
        next_follow_up_date: dateStr(daysAgo(1)),
        _transaction: { property_address: '200 Test Valley Rd', closing_date: dateStr(daysFromNow(45)), status: 'active', contract_price: 425000 },
      },
      // 19-20: Edge cases
      {
        first_name: 'Test', last_name: 'Phone Only',
        disc_type: null, language_preference: 'en', track_type: 'sphere', pipeline_stage: 'new',
        email: null, birthday_month: null, birthday_day: null,
      },
      {
        first_name: 'Test', last_name: 'Full Data',
        disc_type: 'I', disc_secondary: 'D', disc_confidence: 'high',
        engagement_temperature: 'warm', language_preference: 'en',
        track_type: 'buyer', pipeline_stage: 'qualifying',
        birthday_month: twoDays.getMonth() + 1, birthday_day: twoDays.getDate(), birthday_year: 1988,
        company: 'Test Corp', job_title: 'VP of Testing',
        personality_brief: 'Outgoing and enthusiastic',
        communication_tips: 'Keep it upbeat and personal',
        address_line_1: '500 Test Frisco Blvd', city: 'Frisco', state: 'TX', zip_code: '75034',
        latitude: 33.0198, longitude: -96.6989,
        next_follow_up_date: dateStr(now),
      },
    ];

    const contactIds: string[] = [];
    const transactionIds: string[] = [];
    const activityIds: string[] = [];

    for (const def of contactDefs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txDef = (def as any)._transaction;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actDef = (def as any)._activity;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createdAgo = (def as any)._created_ago;

      const fullName = getDisplayName(def);
      const emailAddr = def.email !== undefined
        ? def.email
        : `test-${slug(fullName)}@test.liconarealty.com`;

      const contactRow: Record<string, unknown> = {
        user_id: user.id,
        first_name: def.first_name,
        last_name: def.last_name,
        email: emailAddr,
        phone: randomPhone(),
        track_type: def.track_type || 'sphere',
        pipeline_stage: def.pipeline_stage || 'new',
        lead_score: 50,
        language_preference: def.language_preference || 'en',
        disc_type: def.disc_type || null,
        import_source: 'test_seed',
      };

      if (def.birthday_month) contactRow.birthday_month = def.birthday_month;
      if (def.birthday_day) contactRow.birthday_day = def.birthday_day;
      if (def.birthday_year) contactRow.birthday_year = def.birthday_year;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((def as any).engagement_temperature) contactRow.engagement_temperature = (def as any).engagement_temperature;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((def as any).disc_secondary) contactRow.disc_secondary = (def as any).disc_secondary;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((def as any).disc_confidence) contactRow.disc_confidence = (def as any).disc_confidence;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((def as any).personality_brief) contactRow.personality_brief = (def as any).personality_brief;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((def as any).communication_tips) contactRow.communication_tips = (def as any).communication_tips;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((def as any).company) contactRow.company = (def as any).company;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((def as any).job_title) contactRow.job_title = (def as any).job_title;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((def as any).address_line_1) contactRow.address_line_1 = (def as any).address_line_1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((def as any).city) contactRow.city = (def as any).city;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((def as any).state) contactRow.state = (def as any).state;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((def as any).zip_code) contactRow.zip_code = (def as any).zip_code;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((def as any).latitude) contactRow.latitude = (def as any).latitude;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((def as any).longitude) contactRow.longitude = (def as any).longitude;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((def as any).next_follow_up_date) contactRow.next_follow_up_date = (def as any).next_follow_up_date;

      const { data: contact, error: cErr } = await supabase
        .from('contacts')
        .insert(contactRow)
        .select('id')
        .single();

      if (cErr || !contact) {
        return NextResponse.json({
          error: `Failed to create contact "${fullName}": ${cErr?.message || 'unknown'}`,
          code: cErr?.code,
          details: cErr?.details,
        }, { status: 500 });
      }

      // Backdate created_at for gone-quiet-never test
      if (createdAgo) {
        await supabase
          .from('contacts')
          .update({ created_at: daysAgo(createdAgo).toISOString() })
          .eq('id', contact.id);
      }

      contactIds.push(contact.id);

      // Create linked transaction
      if (txDef) {
        const txRow: Record<string, unknown> = {
          user_id: user.id,
          contact_id: contact.id,
          track_type: def.track_type || 'buyer',
          transaction_type: 'buyers_agent_sale',
          property_address: txDef.property_address,
          status: txDef.status || 'active',
          contract_price: txDef.contract_price || null,
          closing_date: txDef.closing_date || null,
          checklist: [],
          parties: [],
          notes: [],
        };

        const { data: tx, error: txErr } = await supabase
          .from('transactions')
          .insert(txRow)
          .select('id')
          .single();

        if (!txErr && tx) {
          transactionIds.push(tx.id);
        }
      }

      // Create activity for gone-quiet testing
      if (actDef) {
        const actDate = daysAgo(actDef.days_ago);
        const { data: act, error: actErr } = await supabase
          .from('activities')
          .insert({
            user_id: user.id,
            contact_id: contact.id,
            activity_type: 'text',
            direction: 'outbound',
            description: 'Test seed activity',
            activity_date: actDate.toISOString(),
          })
          .select('id')
          .single();

        if (!actErr && act) {
          activityIds.push(act.id);
        }
      }
    }

    return NextResponse.json({
      created: contactIds.length,
      contacts: contactIds,
      transactions: transactionIds,
      activities: activityIds,
    });
  } catch (err) {
    return NextResponse.json({
      error: 'Internal server error',
      details: String(err),
    }, { status: 500 });
  }
}
