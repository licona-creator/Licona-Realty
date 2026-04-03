/**
 * Auth Hook
 *
 * Provides current user state and auth actions.
 * Uses Supabase client for real-time auth state changes.
 * Clears MFA grace period cookie on explicit sign-out.
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        window.location.href = '/auth/login';
      }
      if (event === 'SIGNED_IN' && window.location.pathname.startsWith('/auth/login')) {
        window.location.href = '/dashboard';
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    // Clear MFA grace period cookie so next login requires 2FA
    document.cookie = 'mfa_verified_at=;path=/;max-age=0;SameSite=Strict';
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/auth/login';
  }

  return { user, loading, signOut };
}
