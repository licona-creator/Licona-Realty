/**
 * Brand Asset Upload API
 *
 * POST - Uploads a brand asset (logo or headshot) to Supabase Storage
 *        and saves the public URL to agent_settings.
 *
 * Accepts multipart form data:
 *   file       - The image file (jpeg, png, webp)
 *   asset_type - "logo" or "headshot"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const BUCKET = 'profile-assets';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const assetType = formData.get('asset_type') as string | null;

  if (!file || !assetType) {
    return NextResponse.json({ error: 'file and asset_type are required' }, { status: 400 });
  }

  if (!['logo', 'headshot'].includes(assetType)) {
    return NextResponse.json({ error: 'asset_type must be "logo" or "headshot"' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File must be JPEG, PNG, or WebP' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const storagePath = `${user.id}/${assetType}-${Date.now()}.${ext}`;

  // Upload to Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error('[upload:brand-asset]', uploadError);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  // Save URL to agent_settings
  const column = assetType === 'logo' ? 'brand_logo_url' : 'brand_headshot_url';
  const { error: saveError } = await supabase
    .from('agent_settings')
    .upsert(
      { user_id: user.id, [column]: publicUrl, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (saveError) {
    console.error('[upload:brand-asset:save]', saveError);
    return NextResponse.json({ error: 'Upload succeeded but failed to save URL' }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl, asset_type: assetType });
}
