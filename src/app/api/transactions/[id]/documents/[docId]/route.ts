import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['pending', 'received', 'reviewed', 'signed', 'complete'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.status) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = body.status;
      if (body.status === 'signed' && !body.signed_at) {
        updates.signed_at = new Date().toISOString();
      }
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }

    if (body.signed_at) {
      updates.signed_at = body.signed_at;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: doc, error } = await supabase
      .from('transaction_documents')
      .update(updates)
      .eq('id', docId)
      .eq('transaction_id', id)
      .select()
      .single();

    if (error || !doc) {
      console.error('[documents:patch]', error);
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }

    return NextResponse.json({ document: doc });
  } catch (err) {
    console.error('[documents:patch]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get file_path before deleting
    const { data: doc, error: fetchError } = await supabase
      .from('transaction_documents')
      .select('file_path')
      .eq('id', docId)
      .eq('transaction_id', id)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from storage
    if (doc.file_path) {
      await supabase.storage.from('transaction-docs').remove([doc.file_path]);
    }

    // Delete DB record
    const { error: deleteError } = await supabase
      .from('transaction_documents')
      .delete()
      .eq('id', docId)
      .eq('transaction_id', id);

    if (deleteError) {
      console.error('[documents:delete]', deleteError);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[documents:delete]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
