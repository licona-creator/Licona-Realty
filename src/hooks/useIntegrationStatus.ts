/**
 * Integration Status Hook
 *
 * Fetches real connection status from user_integrations table.
 * Returns a map of provider -> connection info for the current user.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface IntegrationInfo {
  connected: boolean;
  provider_email?: string | null;
  scopes?: string[] | null;
  connected_at?: string | null;
  token_expires_at?: string | null;
}

type Provider = 'google' | 'docusign' | 'canva' | 'meta';

export type IntegrationStatusMap = Record<Provider, IntegrationInfo>;

const DEFAULT_STATUS: IntegrationStatusMap = {
  google: { connected: false },
  docusign: { connected: false },
  canva: { connected: false },
  meta: { connected: false },
};

export function useIntegrationStatus() {
  const [status, setStatus] = useState<IntegrationStatusMap>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('user_integrations')
      .select('provider, provider_email, scopes, connected_at, token_expires_at')
      .eq('user_id', user.id);

    const result = { ...DEFAULT_STATUS };
    if (data) {
      for (const row of data) {
        const p = row.provider as Provider;
        if (p in result) {
          result[p] = {
            connected: true,
            provider_email: row.provider_email,
            scopes: row.scopes,
            connected_at: row.connected_at,
            token_expires_at: row.token_expires_at,
          };
        }
      }
    }

    setStatus(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
