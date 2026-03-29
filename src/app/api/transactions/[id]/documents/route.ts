import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDocumentChecklist, calculateProgress } from '@/lib/documents/texas-checklist';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('id, track_type, transaction_type')
      .eq('id', id)
      .single();

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const { data: documents, error: docError } = await supabase
      .from('transaction_documents')
      .select('*')
      .eq('transaction_id', id)
      .order('uploaded_at', { ascending: false });

    if (docError) {
      console.error('[documents:get] Error fetching documents:', docError);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    const effectiveType = transaction.transaction_type || transaction.track_type;
    const checklist = getDocumentChecklist(effectiveType);
    const uploadedTypes = (documents || []).map((d: { document_type: string }) => d.document_type);
    const progress = calculateProgress(checklist, uploadedTypes);

    return NextResponse.json({ documents: documents || [], checklist, progress });
  } catch (err) {
    console.error('[documents:get]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('document_type') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    if (!documentType) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 });
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/heic',
      'image/heif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|heic|doc|docx)$/i)) {
      return NextResponse.json({ error: 'File type not supported. Accepted: PDF, JPG, PNG, DOC, DOCX, HEIC' }, { status: 400 });
    }

    // Validate document_type exists in the current checklist
    const { data: transaction } = await supabase
      .from('transactions')
      .select('track_type, transaction_type')
      .eq('id', id)
      .single();

    if (transaction) {
      const effectiveType = transaction.transaction_type || transaction.track_type;
      const checklist = getDocumentChecklist(effectiveType);
      const validTypes = checklist.map(c => c.type);
      if (!validTypes.includes(documentType)) {
        return NextResponse.json({ error: 'Invalid document type for this transaction' }, { status: 400 });
      }
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${id}/${documentType}/${timestamp}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('transaction-docs')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[documents:upload] Storage error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    const { data: docRecord, error: insertError } = await supabase
      .from('transaction_documents')
      .insert({
        transaction_id: id,
        user_id: user.id,
        document_type: documentType,
        document_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        status: 'received',
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[documents:insert] DB error:', insertError);
      await supabase.storage.from('transaction-docs').remove([filePath]);
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 });
    }

    return NextResponse.json({ document: docRecord }, { status: 201 });
  } catch (err) {
    console.error('[documents:post]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
