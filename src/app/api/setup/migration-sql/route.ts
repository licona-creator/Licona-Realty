/**
 * Serves the combined migration SQL for the setup page copy button.
 */

import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const files = ['001_initial_schema.sql', '002_storage_buckets.sql'];

  let combinedSQL = '';
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    if (fs.existsSync(filePath)) {
      combinedSQL += `-- ========== ${file} ==========\n\n`;
      combinedSQL += fs.readFileSync(filePath, 'utf-8');
      combinedSQL += '\n\n';
    }
  }

  if (!combinedSQL) {
    return NextResponse.json({ error: 'Migration files not found' }, { status: 404 });
  }

  return NextResponse.json({ sql: combinedSQL });
}
