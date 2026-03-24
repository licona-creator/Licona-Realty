/**
 * Contact Import API
 *
 * Upload CSV or Excel files to bulk import contacts.
 * Features:
 * - Auto-map columns: name, phone, email, address, lead source, track type
 * - Preview and duplicate detection before import
 * - Bulk campaign assignment on import
 * - Server-side validation of all imported data
 * - Audit logging of import operations
 *
 * Two-step process:
 * 1. POST /api/contacts/import/preview - Parse file and return preview
 * 2. POST /api/contacts/import - Confirm and import contacts
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import {
  validateEmail,
  validatePhone,
  sanitizeInput,
} from '@/lib/security/validation';
import { logger } from '@/lib/security/logger';
import Papa from 'papaparse';

const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10MB for import files
const MAX_CONTACTS_PER_IMPORT = 5000;

const VALID_TRACK_TYPES = ['buyer', 'seller', 'landlord', 'tenant', 'investor'];

// Common column name mappings for auto-detection
const COLUMN_MAPPINGS: Record<string, string[]> = {
  first_name: ['first name', 'first_name', 'firstname', 'fname', 'given name', 'nombre'],
  last_name: ['last name', 'last_name', 'lastname', 'lname', 'surname', 'family name', 'apellido'],
  email: ['email', 'e-mail', 'email address', 'correo'],
  phone: ['phone', 'phone number', 'telephone', 'mobile', 'cell', 'telefono'],
  address_line_1: ['address', 'address line 1', 'street', 'street address', 'direccion'],
  city: ['city', 'ciudad'],
  state: ['state', 'st', 'estado'],
  zip_code: ['zip', 'zip code', 'postal code', 'zipcode', 'codigo postal'],
  lead_source: ['source', 'lead source', 'referral source', 'fuente'],
  track_type: ['type', 'track', 'track type', 'lead type', 'tipo'],
};

/**
 * Auto-detect column mappings from CSV headers.
 */
function autoMapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
      if (aliases.includes(normalized)) {
        mapping[header] = field;
        break;
      }
    }
  }

  return mapping;
}

/**
 * POST /api/contacts/import - Parse and import contacts from CSV
 *
 * Request body: FormData with 'file' (CSV/Excel) and optional 'track_type', 'lead_source'
 */
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
    const defaultTrackType = (formData.get('track_type') as string) || 'buyer';
    const defaultLeadSource = formData.get('lead_source') as string | null;
    const mode = (formData.get('mode') as string) || 'preview';

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (file.size > MAX_IMPORT_SIZE) {
      return NextResponse.json(
        { error: 'Import file exceeds maximum size of 10MB.' },
        { status: 400 }
      );
    }

    // Validate track type
    if (!VALID_TRACK_TYPES.includes(defaultTrackType)) {
      return NextResponse.json(
        { error: 'Invalid default track type.' },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();

    // Parse CSV
    const parseResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Failed to parse CSV file.',
          details: parseResult.errors.slice(0, 5).map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const rows = parseResult.data as Record<string, string>[];
    const headers = parseResult.meta.fields || [];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file contains no data rows.' },
        { status: 400 }
      );
    }

    if (rows.length > MAX_CONTACTS_PER_IMPORT) {
      return NextResponse.json(
        { error: `Maximum ${MAX_CONTACTS_PER_IMPORT} contacts per import.` },
        { status: 400 }
      );
    }

    // Auto-map columns
    const columnMapping = autoMapColumns(headers);

    // =============================================
    // PREVIEW MODE - return parsed data with mapping
    // =============================================

    if (mode === 'preview') {
      // Check for potential duplicates by email
      const emails = rows
        .map((row) => {
          const emailCol = Object.entries(columnMapping).find(
            ([, field]) => field === 'email'
          )?.[0];
          return emailCol ? row[emailCol]?.trim().toLowerCase() : null;
        })
        .filter(Boolean);

      let duplicateCount = 0;
      if (emails.length > 0) {
        const { count } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .in('email', emails as string[])
          .eq('is_deleted', false);
        duplicateCount = count || 0;
      }

      return NextResponse.json({
        preview: true,
        totalRows: rows.length,
        headers,
        columnMapping,
        sampleRows: rows.slice(0, 5),
        duplicateCount,
        defaultTrackType,
      });
    }

    // =============================================
    // IMPORT MODE - validate and insert contacts
    // =============================================

    const imported: string[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Extract fields using column mapping
      const getValue = (field: string): string | null => {
        const col = Object.entries(columnMapping).find(
          ([, f]) => f === field
        )?.[0];
        return col ? row[col]?.trim() || null : null;
      };

      const firstName = getValue('first_name');
      const lastName = getValue('last_name');

      if (!firstName || !lastName) {
        errors.push({ row: i + 2, error: 'Missing first or last name' });
        continue;
      }

      // Validate and sanitize
      const contactData: Record<string, unknown> = {
        user_id: user.id,
        first_name: sanitizeInput(firstName, 100),
        last_name: sanitizeInput(lastName, 100),
        track_type: defaultTrackType,
        pipeline_stage: 'new',
        lead_score: 50,
        language_preference: 'en',
        lead_source: defaultLeadSource
          ? sanitizeInput(defaultLeadSource, 100)
          : getValue('lead_source')
            ? sanitizeInput(getValue('lead_source')!, 100)
            : null,
      };

      // Email
      const email = getValue('email');
      if (email) {
        const emailResult = validateEmail(email);
        if (emailResult.valid) {
          contactData.email = emailResult.sanitized;
        }
      }

      // Phone
      const phone = getValue('phone');
      if (phone) {
        const phoneResult = validatePhone(phone);
        if (phoneResult.valid) {
          contactData.phone = phoneResult.sanitized;
        }
      }

      // Address
      const address = getValue('address_line_1');
      if (address) contactData.address_line_1 = sanitizeInput(address, 200);
      const city = getValue('city');
      if (city) contactData.city = sanitizeInput(city, 100);
      const state = getValue('state');
      if (state) contactData.state = sanitizeInput(state, 50);
      const zip = getValue('zip_code');
      if (zip) contactData.zip_code = sanitizeInput(zip, 10);

      // Track type from CSV (if mapped and valid)
      const trackType = getValue('track_type');
      if (trackType && VALID_TRACK_TYPES.includes(trackType.toLowerCase())) {
        contactData.track_type = trackType.toLowerCase();
      }

      const { data, error: insertError } = await supabase
        .from('contacts')
        .insert(contactData)
        .select('id')
        .single();

      if (insertError) {
        errors.push({ row: i + 2, error: insertError.message });
      } else {
        imported.push(data.id);
      }
    }

    // Audit log
    await writeAuditLog({
      userId: user.id,
      action: 'bulk_action',
      resourceType: 'contact_import',
      details: `Imported ${imported.length} contacts from CSV (${errors.length} errors)`,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({
      imported: imported.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 20),
      contactIds: imported,
    });
  } catch (err) {
    logger.error('Contact import error', { error: String(err) });
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
