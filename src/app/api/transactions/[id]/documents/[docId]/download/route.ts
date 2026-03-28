import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
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

    const { data: doc, error: fetchError } = await supabase
      .from('transaction_documents')
      .select('file_path, document_name')
      .eq('id', docId)
      .eq('transaction_id', id)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('transaction-docs')
      .createSignedUrl(doc.file_path, 3600);

    if (urlError || !signedUrl) {
      console.error('[documents:download] Signed URL error:', urlError);
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    return NextResponse.json({
      url: signedUrl.signedUrl,
      fileName: doc.document_name,
    });
  } catch (err) {
    console.error('[documents:download]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
