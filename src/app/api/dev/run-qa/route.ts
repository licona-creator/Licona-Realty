/**
 * QA Test Runner API
 *
 * POST /api/dev/run-qa
 *
 * Runs 7 test groups against live database using qa_test import_source.
 * Each group creates data, runs assertions, and cleans up.
 * Final sweep deletes all qa_test records.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  getUpcomingBirthdays,
  getPostCloseCheckIns,
  getGoneQuietContacts,
} from '@/lib/nurture/milestone-engine';
import {
  generateBirthdayMessage,
  generateHolidayMessage,
  generatePostCloseMessage,
} from '@/lib/nurture/message-generator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

interface GroupResult {
  group: string;
  tests: TestResult[];
  passed: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function randomPhone(): string {
  const suffix = String(Math.floor(Math.random() * 9000000) + 1000000);
  return `+1972${suffix}`;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST() {
  const startTime = Date.now();

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = user.id;
    const groups: GroupResult[] = [];
    const allCreatedContactIds: string[] = [];

    // -----------------------------------------------------------------------
    // Helper: create a qa_test contact
    // -----------------------------------------------------------------------
    async function createContact(fields: Record<string, unknown>): Promise<string> {
      const row: Record<string, unknown> = {
        user_id: userId,
        first_name: 'QA',
        last_name: 'Test',
        phone: randomPhone(),
        track_type: 'sphere',
        pipeline_stage: 'new',
        language_preference: 'en',
        lead_score: 50,
        import_source: 'qa_test',
        ...fields,
      };
      const { data, error } = await supabase
        .from('contacts')
        .insert(row)
        .select('id')
        .single();
      if (error || !data) throw new Error(`Create contact failed: ${error?.message}`);
      allCreatedContactIds.push(data.id);
      return data.id;
    }

    // Helper: cleanup contacts by ids (plus linked data)
    async function cleanupContacts(ids: string[]) {
      if (ids.length === 0) return;
      await supabase.from('activities').delete().in('contact_id', ids);
      await supabase.from('transactions').delete().in('contact_id', ids);
      await supabase.from('contacts').delete().in('id', ids);
    }

    // Helper: run a single test
    async function runTest(name: string, fn: () => Promise<void>): Promise<TestResult> {
      try {
        await fn();
        return { name, passed: true };
      } catch (err) {
        return { name, passed: false, error: String(err instanceof Error ? err.message : err) };
      }
    }

    // Helper: run a group of tests
    async function runGroup(
      groupName: string,
      tests: Array<{ name: string; fn: () => Promise<void> }>
    ): Promise<GroupResult> {
      const results: TestResult[] = [];
      for (const t of tests) {
        results.push(await runTest(t.name, t.fn));
      }
      const passed = results.filter(r => r.passed).length;
      return { group: groupName, tests: results, passed, failed: results.length - passed };
    }

    // =====================================================================
    // GROUP 1: SCHEMA VALIDATION
    // =====================================================================
    {
      const g = await runGroup('Schema Validation', [
        {
          name: 'Contact columns exist',
          fn: async () => {
            const { data } = await supabase
              .from('contacts')
              .select('id, first_name, last_name, email, phone, track_type, pipeline_stage, disc_type, language_preference, next_follow_up_date, birthday_month, birthday_day, birthday_year, engagement_temperature, is_deleted, import_source, company, job_title, lead_score')
              .limit(1);
            assert(data !== null, 'Contact columns query returned null');
          },
        },
        {
          name: 'track_type enum has all 6 values',
          fn: async () => {
            const types: string[] = ['buyer', 'seller', 'landlord', 'tenant', 'investor', 'sphere'];
            for (const t of types) {
              const id = await createContact({ track_type: t, last_name: `TrackEnum_${t}` });
              const { data } = await supabase.from('contacts').select('track_type').eq('id', id).single();
              assert(data?.track_type === t, `Expected track_type ${t}, got ${data?.track_type}`);
            }
          },
        },
        {
          name: 'Activities table columns exist',
          fn: async () => {
            const { data } = await supabase
              .from('activities')
              .select('id, user_id, contact_id, activity_type, direction, description, activity_date, subject, metadata, created_at')
              .limit(1);
            assert(data !== null, 'Activities columns query returned null');
          },
        },
        {
          name: 'Transactions table columns exist',
          fn: async () => {
            const { data } = await supabase
              .from('transactions')
              .select('id, user_id, contact_id, track_type, property_address, status, contract_price, closing_date, checklist, parties, notes, commission_gross, commission_net, deal_type, created_at, updated_at')
              .limit(1);
            assert(data !== null, 'Transactions columns query returned null');
          },
        },
      ]);
      groups.push(g);
    }

    // =====================================================================
    // GROUP 2: CONTACT LIFECYCLE
    // =====================================================================
    {
      const localIds: string[] = [];

      const g = await runGroup('Contact Lifecycle', [
        {
          name: 'Create minimal + read back',
          fn: async () => {
            const id = await createContact({ first_name: 'QA', last_name: 'Minimal' });
            localIds.push(id);
            const { data } = await supabase
              .from('contacts')
              .select('first_name, last_name, import_source')
              .eq('id', id)
              .single();
            assert(data?.first_name === 'QA', 'first_name mismatch');
            assert(data?.last_name === 'Minimal', 'last_name mismatch');
            assert(data?.import_source === 'qa_test', 'import_source mismatch');
          },
        },
        {
          name: 'Create with ALL fields + read back',
          fn: async () => {
            const now = new Date();
            const id = await createContact({
              first_name: 'QA',
              last_name: 'FullFields',
              email: 'qa-full@test.liconarealty.com',
              disc_type: 'I',
              disc_secondary: 'D',
              disc_confidence: 'high',
              birthday_month: now.getMonth() + 1,
              birthday_day: now.getDate(),
              birthday_year: 1990,
              company: 'QA Corp',
              job_title: 'Tester',
              language_preference: 'es',
              engagement_temperature: 'hot',
              track_type: 'buyer',
              pipeline_stage: 'qualifying',
              notes: 'QA full field test',
              budget: '500000',
              address_line_1: '100 QA Blvd',
              city: 'Frisco',
              state: 'TX',
              zip_code: '75034',
            });
            localIds.push(id);
            const { data } = await supabase
              .from('contacts')
              .select('disc_type, disc_secondary, disc_confidence, birthday_month, birthday_day, birthday_year, company, job_title, language_preference, engagement_temperature, track_type, pipeline_stage, budget, city, state')
              .eq('id', id)
              .single();
            assert(data?.disc_type === 'I', 'disc_type mismatch');
            assert(data?.disc_secondary === 'D', 'disc_secondary mismatch');
            assert(data?.disc_confidence === 'high', 'disc_confidence mismatch');
            assert(data?.birthday_year === 1990, 'birthday_year mismatch');
            assert(data?.company === 'QA Corp', 'company mismatch');
            assert(data?.language_preference === 'es', 'language_preference mismatch');
            assert(data?.engagement_temperature === 'hot', 'engagement_temperature mismatch');
            assert(data?.track_type === 'buyer', 'track_type mismatch');
            assert(data?.pipeline_stage === 'qualifying', 'pipeline_stage mismatch');
            assert(data?.city === 'Frisco', 'city mismatch');
          },
        },
        {
          name: 'Update disc_type D to S',
          fn: async () => {
            const id = await createContact({ disc_type: 'D', last_name: 'DiscUpdate' });
            localIds.push(id);
            await supabase.from('contacts').update({ disc_type: 'S' }).eq('id', id);
            const { data } = await supabase.from('contacts').select('disc_type').eq('id', id).single();
            assert(data?.disc_type === 'S', `Expected S, got ${data?.disc_type}`);
          },
        },
        {
          name: 'Delete + verify gone',
          fn: async () => {
            const id = await createContact({ last_name: 'ToDelete' });
            localIds.push(id);
            await supabase.from('contacts').delete().eq('id', id);
            const { data } = await supabase.from('contacts').select('id').eq('id', id).single();
            assert(!data, 'Contact should be deleted');
            // Remove from allCreatedContactIds since already deleted
            const idx = allCreatedContactIds.indexOf(id);
            if (idx !== -1) allCreatedContactIds.splice(idx, 1);
          },
        },
        {
          name: 'Unicode name stored correctly',
          fn: async () => {
            const id = await createContact({ first_name: 'QA_Jos\u00e9', last_name: 'Unicode' });
            localIds.push(id);
            const { data } = await supabase.from('contacts').select('first_name').eq('id', id).single();
            assert(data?.first_name === 'QA_Jos\u00e9', `Unicode mismatch: got "${data?.first_name}"`);
          },
        },
      ]);
      groups.push(g);
    }

    // =====================================================================
    // GROUP 3: FOLLOW-UP SYSTEM E2E
    // =====================================================================
    {
      const localIds: string[] = [];
      const localActivityIds: string[] = [];

      const g = await runGroup('Follow-Up System E2E', [
        {
          name: 'Contact with follow-up today appears in query',
          fn: async () => {
            const today = dateStr(new Date());
            const id = await createContact({
              last_name: 'FollowUpToday',
              next_follow_up_date: today,
              disc_type: 'D',
              engagement_temperature: 'hot',
            });
            localIds.push(id);

            const tomorrow = dateStr(daysFromNow(1));
            const { data } = await supabase
              .from('contacts')
              .select('id')
              .lte('next_follow_up_date', tomorrow)
              .eq('is_deleted', false)
              .eq('import_source', 'qa_test')
              .eq('id', id);
            assert(data !== null && data.length > 0, 'Contact should appear in follow-up query');
          },
        },
        {
          name: 'Done action: activity created + date moved',
          fn: async () => {
            const today = dateStr(new Date());
            const id = await createContact({
              last_name: 'FollowUpDone',
              next_follow_up_date: today,
              pipeline_stage: 'nurturing',
            });
            localIds.push(id);

            // Simulate done action: insert activity
            const { data: act } = await supabase
              .from('activities')
              .insert({
                contact_id: id,
                user_id: userId,
                activity_type: 'text',
                direction: 'outbound',
                description: 'Follow-up completed',
                activity_date: new Date().toISOString(),
              })
              .select('id, activity_type, direction')
              .single();
            assert(act !== null, 'Activity should be created');
            assert(act?.activity_type === 'text', 'Activity type should be text');
            assert(act?.direction === 'outbound', 'Direction should be outbound');
            if (act) localActivityIds.push(act.id);

            // Update next_follow_up_date (nurturing = 3 days)
            const nextDate = dateStr(daysFromNow(3));
            await supabase
              .from('contacts')
              .update({ next_follow_up_date: nextDate })
              .eq('id', id);

            const { data: updated } = await supabase
              .from('contacts')
              .select('next_follow_up_date')
              .eq('id', id)
              .single();
            assert(updated?.next_follow_up_date !== null, 'next_follow_up_date should not be null');
            assert(
              updated?.next_follow_up_date !== today,
              'next_follow_up_date should have moved from today'
            );
          },
        },
        {
          name: 'Snooze: date moved + not in follow-up query',
          fn: async () => {
            const today = dateStr(new Date());
            const id = await createContact({
              last_name: 'FollowUpSnooze',
              next_follow_up_date: today,
            });
            localIds.push(id);

            // Snooze 3 days
            const snoozed = dateStr(daysFromNow(3));
            await supabase
              .from('contacts')
              .update({ next_follow_up_date: snoozed })
              .eq('id', id);

            const { data: check } = await supabase
              .from('contacts')
              .select('next_follow_up_date')
              .eq('id', id)
              .single();
            assert(check?.next_follow_up_date === snoozed, 'Date should be snoozed');

            // Should NOT appear in tomorrow query
            const tomorrow = dateStr(daysFromNow(1));
            const { data: query } = await supabase
              .from('contacts')
              .select('id')
              .lte('next_follow_up_date', tomorrow)
              .eq('is_deleted', false)
              .eq('id', id);
            assert(query !== null && query.length === 0, 'Snoozed contact should not appear in follow-up query');
          },
        },
        {
          name: 'Skip remove: next_follow_up_date set to null',
          fn: async () => {
            const today = dateStr(new Date());
            const id = await createContact({
              last_name: 'FollowUpSkip',
              next_follow_up_date: today,
            });
            localIds.push(id);

            await supabase
              .from('contacts')
              .update({ next_follow_up_date: null })
              .eq('id', id);

            const { data: check } = await supabase
              .from('contacts')
              .select('next_follow_up_date')
              .eq('id', id)
              .single();
            assert(check?.next_follow_up_date === null, 'next_follow_up_date should be null after skip remove');
          },
        },
      ]);
      groups.push(g);

      // Cleanup local activities
      if (localActivityIds.length > 0) {
        await supabase.from('activities').delete().in('id', localActivityIds);
      }
    }

    // =====================================================================
    // GROUP 4: NURTURE - BIRTHDAYS
    // =====================================================================
    {
      const localIds: string[] = [];

      const g = await runGroup('Nurture - Birthdays', [
        {
          name: 'Birthday today: days_until = 0',
          fn: async () => {
            const now = new Date();
            const id = await createContact({
              last_name: 'BdayToday',
              birthday_month: now.getMonth() + 1,
              birthday_day: now.getDate(),
              birthday_year: 1990,
            });
            localIds.push(id);

            const { data } = await supabase
              .from('contacts')
              .select('id, first_name, last_name, birthday_month, birthday_day, birthday_year, disc_type, language_preference, track_type, created_at, phone, email')
              .eq('id', id)
              .single();
            assert(data !== null, 'Contact should exist');

            const results = getUpcomingBirthdays([data!], 7, now);
            assert(results.length === 1, `Expected 1 birthday, got ${results.length}`);
            assert(results[0].days_until === 0, `Expected days_until=0, got ${results[0].days_until}`);
          },
        },
        {
          name: 'Birthday tomorrow: days_until = 1',
          fn: async () => {
            const now = new Date();
            const tom = daysFromNow(1);
            const id = await createContact({
              last_name: 'BdayTomorrow',
              birthday_month: tom.getMonth() + 1,
              birthday_day: tom.getDate(),
              birthday_year: 1985,
            });
            localIds.push(id);

            const { data } = await supabase
              .from('contacts')
              .select('id, first_name, last_name, birthday_month, birthday_day, birthday_year, disc_type, language_preference, track_type, created_at, phone, email')
              .eq('id', id)
              .single();

            const results = getUpcomingBirthdays([data!], 7, now);
            assert(results.length === 1, `Expected 1 birthday, got ${results.length}`);
            assert(results[0].days_until === 1, `Expected days_until=1, got ${results[0].days_until}`);
          },
        },
        {
          name: 'Birthday 8 days out: NOT in 7-day window',
          fn: async () => {
            const now = new Date();
            const eightDays = daysFromNow(8);
            const id = await createContact({
              last_name: 'Bday8Days',
              birthday_month: eightDays.getMonth() + 1,
              birthday_day: eightDays.getDate(),
              birthday_year: 1992,
            });
            localIds.push(id);

            const { data } = await supabase
              .from('contacts')
              .select('id, first_name, last_name, birthday_month, birthday_day, birthday_year, disc_type, language_preference, track_type, created_at, phone, email')
              .eq('id', id)
              .single();

            const results = getUpcomingBirthdays([data!], 7, now);
            assert(results.length === 0, `Expected 0 birthdays, got ${results.length}`);
          },
        },
        {
          name: 'turning_age calculated correctly',
          fn: async () => {
            const now = new Date();
            const birthYear = now.getFullYear() - 30;
            const id = await createContact({
              last_name: 'BdayAge30',
              birthday_month: now.getMonth() + 1,
              birthday_day: now.getDate(),
              birthday_year: birthYear,
            });
            localIds.push(id);

            const { data } = await supabase
              .from('contacts')
              .select('id, first_name, last_name, birthday_month, birthday_day, birthday_year, disc_type, language_preference, track_type, created_at, phone, email')
              .eq('id', id)
              .single();

            const results = getUpcomingBirthdays([data!], 7, now);
            assert(results.length === 1, 'Expected 1 birthday');
            assert(results[0].turning_age === 30, `Expected turning_age=30, got ${results[0].turning_age}`);
          },
        },
        {
          name: 'Null year: turning_age = null',
          fn: async () => {
            const now = new Date();
            const id = await createContact({
              last_name: 'BdayNoYear',
              birthday_month: now.getMonth() + 1,
              birthday_day: now.getDate(),
              birthday_year: null,
            });
            localIds.push(id);

            const { data } = await supabase
              .from('contacts')
              .select('id, first_name, last_name, birthday_month, birthday_day, birthday_year, disc_type, language_preference, track_type, created_at, phone, email')
              .eq('id', id)
              .single();

            const results = getUpcomingBirthdays([data!], 7, now);
            assert(results.length === 1, 'Expected 1 birthday');
            assert(results[0].turning_age === null, `Expected turning_age=null, got ${results[0].turning_age}`);
          },
        },
      ]);
      groups.push(g);
    }

    // =====================================================================
    // GROUP 5: NURTURE - POST-CLOSE
    // =====================================================================
    {
      const localIds: string[] = [];
      const localTxIds: string[] = [];
      const localActIds: string[] = [];

      async function createClosedDeal(contactId: string, daysAgoClose: number): Promise<string> {
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            contact_id: contactId,
            track_type: 'buyer',
            property_address: `${daysAgoClose} QA Test Ave`,
            status: 'closed',
            closing_date: dateStr(daysAgo(daysAgoClose)),
            checklist: [],
            parties: [],
            notes: [],
          })
          .select('id')
          .single();
        if (error || !data) throw new Error(`Create transaction failed: ${error?.message}`);
        localTxIds.push(data.id);
        return data.id;
      }

      const contactSelect = 'id, first_name, last_name, birthday_month, birthday_day, birthday_year, disc_type, language_preference, track_type, created_at, phone, email';

      const g = await runGroup('Nurture - Post-Close', [
        {
          name: '30-day milestone detected',
          fn: async () => {
            const now = new Date();
            const id = await createContact({ last_name: 'PC30', track_type: 'buyer', pipeline_stage: 'closed' });
            localIds.push(id);
            const txId = await createClosedDeal(id, 30);

            const { data: contact } = await supabase.from('contacts').select(contactSelect).eq('id', id).single();
            const { data: txs } = await supabase.from('transactions').select('id, contact_id, property_address, status, closing_date, track_type').eq('id', txId);

            const results = getPostCloseCheckIns([contact!], txs || [], [], now);
            assert(results.length >= 1, `Expected at least 1 milestone, got ${results.length}`);
            assert(results[0].milestone_type === '30day', `Expected 30day, got ${results[0].milestone_type}`);
          },
        },
        {
          name: '90-day milestone detected',
          fn: async () => {
            const now = new Date();
            const id = await createContact({ last_name: 'PC90', track_type: 'buyer', pipeline_stage: 'closed' });
            localIds.push(id);
            const txId = await createClosedDeal(id, 90);

            const { data: contact } = await supabase.from('contacts').select(contactSelect).eq('id', id).single();
            const { data: txs } = await supabase.from('transactions').select('id, contact_id, property_address, status, closing_date, track_type').eq('id', txId);

            const results = getPostCloseCheckIns([contact!], txs || [], [], now);
            assert(results.length >= 1, `Expected at least 1 milestone, got ${results.length}`);
            assert(results[0].milestone_type === '90day', `Expected 90day, got ${results[0].milestone_type}`);
          },
        },
        {
          name: '1-year milestone detected',
          fn: async () => {
            const now = new Date();
            const id = await createContact({ last_name: 'PC365', track_type: 'buyer', pipeline_stage: 'closed' });
            localIds.push(id);
            const txId = await createClosedDeal(id, 365);

            const { data: contact } = await supabase.from('contacts').select(contactSelect).eq('id', id).single();
            const { data: txs } = await supabase.from('transactions').select('id, contact_id, property_address, status, closing_date, track_type').eq('id', txId);

            const results = getPostCloseCheckIns([contact!], txs || [], [], now);
            assert(results.length >= 1, `Expected at least 1 milestone, got ${results.length}`);
            assert(results[0].milestone_type === '1year', `Expected 1year, got ${results[0].milestone_type}`);
          },
        },
        {
          name: 'Completion detection: 30day skipped when activity exists',
          fn: async () => {
            const now = new Date();
            const id = await createContact({ last_name: 'PCComplete', track_type: 'buyer', pipeline_stage: 'closed' });
            localIds.push(id);
            const txId = await createClosedDeal(id, 30);

            // Create activity 28 days ago (within 7 days of 30-day milestone)
            const { data: act } = await supabase
              .from('activities')
              .insert({
                user_id: userId,
                contact_id: id,
                activity_type: 'text',
                direction: 'outbound',
                description: 'QA test outreach',
                activity_date: daysAgo(28).toISOString(),
              })
              .select('id')
              .single();
            if (act) localActIds.push(act.id);

            const { data: contact } = await supabase.from('contacts').select(contactSelect).eq('id', id).single();
            const { data: txs } = await supabase.from('transactions').select('id, contact_id, property_address, status, closing_date, track_type').eq('id', txId);
            const { data: acts } = await supabase.from('activities').select('id, contact_id, activity_type, direction, description, activity_date').eq('contact_id', id);

            const results = getPostCloseCheckIns([contact!], txs || [], acts || [], now);
            // 30day should be skipped; next milestone is 90day
            if (results.length > 0) {
              assert(results[0].milestone_type === '90day', `Expected 90day (30day skipped), got ${results[0].milestone_type}`);
            }
            // If no results, that is also acceptable (all milestones future)
          },
        },
      ]);
      groups.push(g);

      // Cleanup
      if (localActIds.length > 0) await supabase.from('activities').delete().in('id', localActIds);
      if (localTxIds.length > 0) await supabase.from('transactions').delete().in('id', localTxIds);
    }

    // =====================================================================
    // GROUP 6: NURTURE - SILENCE DETECTION
    // =====================================================================
    {
      const localIds: string[] = [];
      const localActIds: string[] = [];

      const contactSelect = 'id, first_name, last_name, birthday_month, birthday_day, birthday_year, disc_type, language_preference, track_type, created_at, phone, email';

      const g = await runGroup('Nurture - Silence Detection', [
        {
          name: 'No activities + created 90 days ago: detected',
          fn: async () => {
            const now = new Date();
            const id = await createContact({ last_name: 'Quiet90' });
            localIds.push(id);

            // Backdate created_at
            await supabase
              .from('contacts')
              .update({ created_at: daysAgo(90).toISOString() })
              .eq('id', id);

            const { data: contact } = await supabase.from('contacts').select(contactSelect).eq('id', id).single();

            const results = getGoneQuietContacts([contact!], [], 60, now);
            assert(results.length === 1, `Expected 1 gone-quiet, got ${results.length}`);
            assert(results[0].days_silent >= 90, `Expected days_silent >= 90, got ${results[0].days_silent}`);
          },
        },
        {
          name: 'Activity 30 days ago: NOT detected (under 60-day threshold)',
          fn: async () => {
            const now = new Date();
            const id = await createContact({ last_name: 'Active30' });
            localIds.push(id);

            const { data: act } = await supabase
              .from('activities')
              .insert({
                user_id: userId,
                contact_id: id,
                activity_type: 'text',
                direction: 'outbound',
                description: 'QA recent activity',
                activity_date: daysAgo(30).toISOString(),
              })
              .select('id')
              .single();
            if (act) localActIds.push(act.id);

            const { data: contact } = await supabase.from('contacts').select(contactSelect).eq('id', id).single();
            const { data: acts } = await supabase.from('activities').select('id, contact_id, activity_type, direction, description, activity_date').eq('contact_id', id);

            const results = getGoneQuietContacts([contact!], acts || [], 60, now);
            assert(results.length === 0, `Expected 0 gone-quiet, got ${results.length}`);
          },
        },
        {
          name: 'Activity 65 days ago: detected',
          fn: async () => {
            const now = new Date();
            const id = await createContact({ last_name: 'Quiet65' });
            localIds.push(id);

            const { data: act } = await supabase
              .from('activities')
              .insert({
                user_id: userId,
                contact_id: id,
                activity_type: 'text',
                direction: 'outbound',
                description: 'QA old activity',
                activity_date: daysAgo(65).toISOString(),
              })
              .select('id')
              .single();
            if (act) localActIds.push(act.id);

            const { data: contact } = await supabase.from('contacts').select(contactSelect).eq('id', id).single();
            const { data: acts } = await supabase.from('activities').select('id, contact_id, activity_type, direction, description, activity_date').eq('contact_id', id);

            const results = getGoneQuietContacts([contact!], acts || [], 60, now);
            assert(results.length === 1, `Expected 1 gone-quiet, got ${results.length}`);
          },
        },
      ]);
      groups.push(g);

      if (localActIds.length > 0) await supabase.from('activities').delete().in('id', localActIds);
    }

    // =====================================================================
    // GROUP 7: MESSAGE GENERATION
    // =====================================================================
    {
      const EM_DASH = '\u2014';

      const g = await runGroup('Message Generation', [
        {
          name: 'Birthday D-type English contains first_name',
          fn: async () => {
            const msg = generateBirthdayMessage(
              { first_name: 'Carlos', language_preference: 'en', disc_type: 'D' },
              null
            );
            assert(msg.message.includes('Carlos'), 'Should contain first_name');
            assert(msg.message.length > 0, 'Should not be empty');
          },
        },
        {
          name: 'Birthday I-type Spanish contains Feliz',
          fn: async () => {
            const msg = generateBirthdayMessage(
              { first_name: 'Maria', language_preference: 'es', disc_type: 'I' },
              null
            );
            assert(msg.message.includes('Feliz'), 'Should contain "Feliz"');
          },
        },
        {
          name: 'Post-close 30day contains property address',
          fn: async () => {
            const msg = generatePostCloseMessage(
              { first_name: 'Jake', language_preference: 'en', disc_type: 'S' },
              '30day',
              '30-day check-in',
              '123 Oak Dr'
            );
            assert(msg.message.includes('123 Oak Dr'), 'Should contain property address');
          },
        },
        {
          name: 'Post-close 1year C-type contains value/market/worth',
          fn: async () => {
            const msg = generatePostCloseMessage(
              { first_name: 'Lisa', language_preference: 'en', disc_type: 'C' },
              '1year',
              '1-year anniversary',
              '456 Elm St'
            );
            const lower = msg.message.toLowerCase();
            assert(
              lower.includes('worth') || lower.includes('market') || lower.includes('value') || lower.includes('investment'),
              `Expected "worth", "market", "value", or "investment" in: "${msg.message}"`
            );
          },
        },
        {
          name: 'Holiday Christmas Spanish contains Navidad',
          fn: async () => {
            const msg = generateHolidayMessage(
              { first_name: 'Ana', language_preference: 'es', disc_type: 'D' },
              'Christmas'
            );
            assert(msg.message.includes('Navidad'), 'Should contain "Navidad"');
          },
        },
        {
          name: 'All messages: no em dashes, length <= 500',
          fn: async () => {
            const contacts = [
              { first_name: 'Test', language_preference: 'en', disc_type: 'D' as const },
              { first_name: 'Test', language_preference: 'es', disc_type: 'I' as const },
              { first_name: 'Test', language_preference: 'en', disc_type: 'S' as const },
              { first_name: 'Test', language_preference: 'en', disc_type: 'C' as const },
              { first_name: 'Test', language_preference: 'en', disc_type: null },
            ];

            const allMessages: string[] = [];

            for (const c of contacts) {
              allMessages.push(generateBirthdayMessage(c, null).message);
              allMessages.push(generateBirthdayMessage(c, 30).message);
              allMessages.push(generateHolidayMessage(c, 'Christmas').message);
              allMessages.push(generateHolidayMessage(c, 'Thanksgiving').message);
              allMessages.push(generatePostCloseMessage(c, '30day', '30-day', '123 St').message);
              allMessages.push(generatePostCloseMessage(c, '90day', '90-day', '123 St').message);
              allMessages.push(generatePostCloseMessage(c, '1year', '1-year', '123 St').message);
            }

            for (const msg of allMessages) {
              assert(!msg.includes(EM_DASH), `Em dash found in: "${msg}"`);
              assert(msg.length <= 500, `Message too long (${msg.length}): "${msg.slice(0, 50)}..."`);
            }
          },
        },
      ]);
      groups.push(g);
    }

    // =====================================================================
    // FINAL CLEANUP
    // =====================================================================
    // Delete all qa_test contacts and linked data
    const { data: qaContacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('import_source', 'qa_test');

    if (qaContacts && qaContacts.length > 0) {
      const ids = qaContacts.map(c => c.id);
      await supabase.from('activities').delete().in('contact_id', ids);
      await supabase.from('transactions').delete().in('contact_id', ids);
      await supabase.from('contacts').delete().in('id', ids);
    }

    // =====================================================================
    // RESPONSE
    // =====================================================================
    const totalTests = groups.reduce((sum, g) => sum + g.tests.length, 0);
    const totalPassed = groups.reduce((sum, g) => sum + g.passed, 0);
    const totalFailed = groups.reduce((sum, g) => sum + g.failed, 0);

    return NextResponse.json({
      total_tests: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      duration_ms: Date.now() - startTime,
      groups,
      all_passed: totalFailed === 0,
    });
  } catch (err) {
    // Emergency cleanup
    try {
      const supabase = await createServerSupabaseClient();
      const { data: qaContacts } = await supabase
        .from('contacts')
        .select('id')
        .eq('import_source', 'qa_test');
      if (qaContacts && qaContacts.length > 0) {
        const ids = qaContacts.map(c => c.id);
        await supabase.from('activities').delete().in('contact_id', ids);
        await supabase.from('transactions').delete().in('contact_id', ids);
        await supabase.from('contacts').delete().in('id', ids);
      }
    } catch {
      // Cleanup failed silently
    }

    return NextResponse.json({
      error: 'QA runner failed',
      details: String(err instanceof Error ? err.message : err),
      duration_ms: Date.now() - startTime,
    }, { status: 500 });
  }
}
