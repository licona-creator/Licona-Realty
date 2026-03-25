/**
 * Auth Hook
 *
 * Provides current user state and auth actions.
 * Uses Supabase client for real-time auth state changes.
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      window.location.href = '/auth/login';
    } else {
      console.error('[signOut] Failed:', error.message);
      // Force redirect even on error to clear stale state
      setUser(null);
      window.location.href = '/auth/login';
    }
  }

  return { user, loading, signOut };
}
