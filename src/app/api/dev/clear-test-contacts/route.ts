/**
 * Clear Test Contacts API
 *
 * DELETE /api/dev/clear-test-contacts
 *
 * Removes all contacts where import_source = 'test_seed'
 * along with their linked transactions and activities.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find all test seed contacts
    const { data: testContacts, error: findErr } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('import_source', 'test_seed');

    if (findErr) {
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }

    if (!testContacts || testContacts.length === 0) {
      return NextResponse.json({
        deleted_contacts: 0,
        deleted_transactions: 0,
        deleted_activities: 0,
      });
    }

    const contactIds = testContacts.map(c => c.id);

    // Delete linked activities
    const { count: deletedActivities } = await supabase
      .from('activities')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .in('contact_id', contactIds);

    // Delete linked transactions
    const { count: deletedTransactions } = await supabase
      .from('transactions')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .in('contact_id', contactIds);

    // Delete the contacts themselves
    const { count: deletedContacts } = await supabase
      .from('contacts')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .eq('import_source', 'test_seed');

    return NextResponse.json({
      deleted_contacts: deletedContacts || 0,
      deleted_transactions: deletedTransactions || 0,
      deleted_activities: deletedActivities || 0,
    });
  } catch (err) {
    return NextResponse.json({
      error: 'Internal server error',
      details: String(err),
    }, { status: 500 });
  }
}
