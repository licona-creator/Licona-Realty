/**
 * vCard Contact Import API
 *
 * POST /api/contacts/import/vcf
 *
 * Accepts a JSON body with an array of contacts to import from a parsed vCard file.
 * Batch inserts in groups of 50 to avoid timeouts.
 * Triggers non-blocking geocoding for contacts with addresses.
 * Sets import_source = 'iphone_vcf' on all imported contacts.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import { sanitizeInput } from '@/lib/security/validation';
import { logger } from '@/lib/security/logger';

const BATCH_SIZE = 50;
const MAX_CONTACTS = 5000;

interface ImportContact {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  birthday_month: number | null;
  birthday_day: number | null;
  birthday_year: number | null;
  company: string;
  job_title: string;
  address_line_1: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
  import_source: string;
}

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const ua = getUserAgent(request);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const contacts: ImportContact[] = body.contacts;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts provided.' }, { status: 400 });
    }

    if (contacts.length > MAX_CONTACTS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_CONTACTS} contacts per import.` },
        { status: 400 }
      );
    }

    let importedCount = 0;
    let errorCount = 0;
    const errorDetails: string[] = [];
    const importedIds: string[] = [];

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);

      const rows = batch.map((c) => {
        const firstName = sanitizeInput(c.first_name || '', 100);
        const lastName = sanitizeInput(c.last_name || '', 100);

        // Format phone to E.164 if it looks like a US number
        let phone: string | null = null;
        if (c.phone) {
          const digits = c.phone.replace(/[^\d]/g, '');
          if (digits.length === 10) {
            phone = `+1${digits}`;
          } else if (digits.length === 11 && digits.startsWith('1')) {
            phone = `+${digits}`;
          } else if (digits.length > 0) {
            phone = `+${digits}`;
          }
        }

        return {
          user_id: user.id,
          first_name: firstName || 'Unknown',
          last_name: lastName || '',
          email: c.email ? sanitizeInput(c.email, 254).toLowerCase() : null,
          phone,
          track_type: 'sphere' as const,
          pipeline_stage: 'new' as const,
          lead_score: 50,
          language_preference: 'en' as const,
          birthday_month: c.birthday_month,
          birthday_day: c.birthday_day,
          birthday_year: c.birthday_year,
          company: c.company ? sanitizeInput(c.company, 200) : null,
          job_title: c.job_title ? sanitizeInput(c.job_title, 200) : null,
          address_line_1: c.address_line_1 ? sanitizeInput(c.address_line_1, 200) : null,
          city: c.city ? sanitizeInput(c.city, 100) : null,
          state: c.state ? sanitizeInput(c.state, 50) : null,
          zip_code: c.zip_code ? sanitizeInput(c.zip_code, 10) : null,
          notes: c.notes ? sanitizeInput(c.notes, 2000) : null,
          import_source: 'iphone_vcf',
          next_follow_up_date: null,
        };
      });

      const { data, error } = await supabase
        .from('contacts')
        .insert(rows)
        .select('id, address_line_1, city, state, zip_code');

      if (error) {
        errorCount += batch.length;
        errorDetails.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else if (data) {
        importedCount += data.length;
        importedIds.push(...data.map((d) => d.id));

        // Non-blocking geocoding for contacts with addresses
        const geoKey = process.env.GOOGLE_GEOCODING_KEY;
        if (geoKey) {
          for (const contact of data) {
            const fullAddress = [contact.address_line_1, contact.city, contact.state, contact.zip_code]
              .filter(Boolean)
              .join(', ');
            if (fullAddress) {
              fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${geoKey}`
              )
                .then((res) => res.json())
                .then((geoData) => {
                  if (geoData.status === 'OK' && geoData.results?.[0]) {
                    const result = geoData.results[0];
                    const loc = result.geometry?.location;
                    const comps = result.address_components || [];
                    const getComp = (type: string): string | null => {
                      const c = comps.find(
                        (comp: { types: string[]; long_name: string }) => comp.types.includes(type)
                      );
                      return c ? c.long_name : null;
                    };
                    const geoUpdate: Record<string, unknown> = {};
                    if (loc?.lat) geoUpdate.latitude = loc.lat;
                    if (loc?.lng) geoUpdate.longitude = loc.lng;
                    const neighborhood = getComp('neighborhood') || getComp('sublocality');
                    if (neighborhood) geoUpdate.neighborhood = neighborhood;
                    const county = getComp('administrative_area_level_2');
                    if (county) geoUpdate.county = county;
                    if (Object.keys(geoUpdate).length > 0) {
                      supabase.from('contacts').update(geoUpdate).eq('id', contact.id).then(() => {});
                    }
                  }
                })
                .catch(() => {
                  // Geocoding failure is non-blocking
                });
            }
          }
        }
      }
    }

    // Audit log
    await writeAuditLog({
      userId: user.id,
      action: 'bulk_action',
      resourceType: 'contact_import_vcf',
      details: `Imported ${importedCount} contacts from vCard (${errorCount} errors)`,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({
      imported: importedCount,
      errors: errorCount,
      error_details: errorDetails,
      contact_ids: importedIds,
    });
  } catch (err) {
    logger.error('vCard import error', { error: String(err) });
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
