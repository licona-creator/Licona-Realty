import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component - ignore
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    const { data: testData, error: dbError } = await supabase
      .from('agent_settings')
      .select('id')
      .limit(1);

    const { data: contactsTest, error: contactsError } =
      await supabase
        .from('contacts')
        .select('id')
        .limit(1);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      cookies: {
        count: allCookies.length,
        names: allCookies.map(c => c.name),
      },
      auth: {
        authenticated: !!user,
        userId: user?.id ?? null,
        email: user?.email ?? null,
        error: authError?.message ?? null,
      },
      database: {
        agent_settings: {
          connected: !dbError,
          error: dbError?.message ?? null,
          hint: dbError?.hint ?? null,
          code: dbError?.code ?? null,
          rows: testData?.length ?? null,
        },
        contacts: {
          connected: !contactsError,
          error: contactsError?.message ?? null,
          hint: contactsError?.hint ?? null,
          code: contactsError?.code ?? null,
          rows: contactsTest?.length ?? null,
        },
      },
      env: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
          ?.replace(/https:\/\//, '')
          ?.substring(0, 20) + '...',
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.substring(0, 300) : undefined;
    return NextResponse.json({
      fatalError: message,
      stack,
    }, { status: 500 });
  }
}
