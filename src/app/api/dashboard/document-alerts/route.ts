import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDocumentChecklist, calculateProgress } from '@/lib/documents/texas-checklist';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    const fourteenDaysOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get active transactions with closing dates within 14 days
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, property_address, closing_date, track_type, transaction_type, status')
      .gte('closing_date', today)
      .lte('closing_date', fourteenDaysOut)
      .not('status', 'in', '("closed","cancelled","lost")');

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ alerts: [] });
    }

    const alerts: Array<{
      transactionId: string;
      address: string;
      daysToClose: number;
      percentComplete: number;
      cmrUploaded: number;
      cmrTotal: number;
      missingCount: number;
      urgency: 'red' | 'amber';
    }> = [];

    for (const tx of transactions) {
      const { data: docs } = await supabase
        .from('transaction_documents')
        .select('document_type, status')
        .eq('transaction_id', tx.id);

      const effectiveType = tx.transaction_type || tx.track_type;
      const checklist = getDocumentChecklist(effectiveType);
      const uploadedTypes = (docs || []).map(d => d.document_type);
      const progress = calculateProgress(checklist, uploadedTypes);

      if (progress.cmr.percent < 100) {
        const days = Math.floor(
          (new Date(tx.closing_date + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        alerts.push({
          transactionId: tx.id,
          address: tx.property_address,
          daysToClose: days,
          percentComplete: progress.cmr.percent,
          cmrUploaded: progress.cmr.uploaded,
          cmrTotal: progress.cmr.total,
          missingCount: progress.cmr.total - progress.cmr.uploaded,
          urgency: days <= 7 ? 'red' : 'amber',
        });
      }
    }

    return NextResponse.json({ alerts });
  } catch (err) {
    console.error('[document-alerts]', err);
    return NextResponse.json({ alerts: [] });
  }
}
