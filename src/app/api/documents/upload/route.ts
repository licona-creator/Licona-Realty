/**
 * Document Upload API
 *
 * Handles file uploads from iPhone camera roll, Files app, or desktop.
 * Supported formats: PDF, Word, Excel, JPG, PNG.
 *
 * Security:
 * - File type validated by magic bytes, not just file extension
 * - Maximum file size: 25MB
 * - All files stored in Supabase Storage with private URLs
 * - Never publicly accessible
 * - Upload audited to audit_logs
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import { validateUUID, sanitizeInput } from '@/lib/security/validation';
import { logger } from '@/lib/security/logger';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Magic bytes for allowed file types
const MAGIC_BYTES: Record<string, { signatures: number[][]; extensions: string[] }> = {
  'application/pdf': {
    signatures: [[0x25, 0x50, 0x44, 0x46]], // %PDF
    extensions: ['.pdf'],
  },
  'image/jpeg': {
    signatures: [[0xFF, 0xD8, 0xFF]],
    extensions: ['.jpg', '.jpeg'],
  },
  'image/png': {
    signatures: [[0x89, 0x50, 0x4E, 0x47]],
    extensions: ['.png'],
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    signatures: [[0x50, 0x4B, 0x03, 0x04]], // ZIP-based (docx)
    extensions: ['.docx'],
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    signatures: [[0x50, 0x4B, 0x03, 0x04]], // ZIP-based (xlsx)
    extensions: ['.xlsx'],
  },
};

const VALID_CATEGORIES = [
  'contract', 'disclosure', 'inspection', 'identification',
  'correspondence', 'photo', 'other',
];

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const ua = getUserAgent(request);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const contactId = formData.get('contact_id') as string | null;
    const transactionId = formData.get('transaction_id') as string | null;
    const category = (formData.get('category') as string) || 'other';

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds maximum size of 25MB.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'File is empty.' },
        { status: 400 }
      );
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid document category.' },
        { status: 400 }
      );
    }

    // Validate contact_id and transaction_id UUIDs if provided
    if (contactId && !validateUUID(contactId)) {
      return NextResponse.json({ error: 'Invalid contact ID.' }, { status: 400 });
    }
    if (transactionId && !validateUUID(transactionId)) {
      return NextResponse.json({ error: 'Invalid transaction ID.' }, { status: 400 });
    }

    // Validate MIME type
    const allowedTypes = Object.keys(MAGIC_BYTES);
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed. Allowed: PDF, Word, Excel, JPG, PNG.` },
        { status: 400 }
      );
    }

    // Validate magic bytes
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const typeConfig = MAGIC_BYTES[file.type];

    const matchesMagicBytes = typeConfig.signatures.some((sig) =>
      sig.every((byte, i) => bytes[i] === byte)
    );

    if (!matchesMagicBytes) {
      logger.warn('File upload rejected: magic bytes mismatch', {
        declaredType: file.type,
        fileName: sanitizeInput(file.name, 100),
      });
      return NextResponse.json(
        { error: 'File content does not match its declared type. Upload rejected.' },
        { status: 400 }
      );
    }

    // Generate secure storage path: {user_id}/{uuid}.{ext}
    const fileId = uuidv4();
    const extension = typeConfig.extensions[0];
    const storagePath = `${user.id}/${fileId}${extension}`;

    // Upload to Supabase Storage (private bucket)
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('File upload failed', { error: uploadError.message });
      return NextResponse.json(
        { error: 'File upload failed.' },
        { status: 500 }
      );
    }

    // Create document record in database
    const { data: doc, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        contact_id: contactId,
        transaction_id: transactionId,
        file_name: sanitizeInput(file.name, 255),
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        category,
      })
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file on DB error
      await supabase.storage.from('documents').remove([storagePath]);
      logger.error('Document record creation failed', { error: dbError.message });
      return NextResponse.json(
        { error: 'Failed to create document record.' },
        { status: 500 }
      );
    }

    // Audit log - no PII
    await writeAuditLog({
      userId: user.id,
      action: 'record_create',
      resourceType: 'document',
      resourceId: doc.id,
      details: `Uploaded ${category} document (${file.type}, ${file.size} bytes)`,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err) {
    logger.error('Document upload error', { error: String(err) });
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
