/**
 * Database Setup API
 *
 * Runs database migrations against Supabase.
 * Only works when tables don't exist yet (safe to call multiple times).
 * Uses the service role key for admin access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: NextRequest) {
  // Simple protection - require a setup key
  const body = await request.json().catch(() => ({}));
  if (body.key !== 'licona-setup-2024') {
    return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 });
  }

  const admin = createAdminClient();
  const results: string[] = [];
  const errors: string[] = [];

  // Read migration files
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const migrationFiles = ['001_initial_schema.sql', '002_storage_buckets.sql'];

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    if (!fs.existsSync(filePath)) {
      errors.push(`Migration file not found: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf-8');

    // Split SQL into individual statements
    const statements = sql
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        const { error } = await admin.rpc('exec_sql', { sql_string: statement + ';' });
        if (error) {
          // Check if it's a "already exists" error - that's fine
          if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
            results.push(`SKIP (already exists): ${statement.slice(0, 60)}...`);
          } else {
            errors.push(`${error.message}: ${statement.slice(0, 80)}...`);
          }
        } else {
          results.push(`OK: ${statement.slice(0, 60)}...`);
        }
      } catch (err) {
        errors.push(`Exception: ${(err as Error).message} - ${statement.slice(0, 60)}...`);
      }
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    results_count: results.length,
    errors_count: errors.length,
    results: results.slice(0, 20),
    errors: errors.slice(0, 20),
  });
}

export async function GET() {
  // Check if database is set up by trying to query a table
  const admin = createAdminClient();

  try {
    const { error } = await admin.from('contacts').select('id').limit(1);
    if (error) {
      return NextResponse.json({
        status: 'not_setup',
        message: 'Database tables have not been created yet. Run the migrations in the Supabase SQL Editor.',
        instructions: [
          '1. Go to your Supabase Dashboard → SQL Editor',
          '2. Copy the contents of supabase/migrations/001_initial_schema.sql',
          '3. Paste into the SQL Editor and click "Run"',
          '4. Copy the contents of supabase/migrations/002_storage_buckets.sql',
          '5. Paste into the SQL Editor and click "Run"',
          '6. Refresh this page to verify'
        ]
      });
    }
    return NextResponse.json({ status: 'ready', message: 'Database is set up and ready!' });
  } catch {
    return NextResponse.json({
      status: 'error',
      message: 'Cannot connect to Supabase. Check your environment variables.'
    });
  }
}
