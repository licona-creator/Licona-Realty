/**
 * Agent Settings Hook
 *
 * Fetches and saves agent_settings from the real /api/settings endpoint.
 * Provides loading, saving, and error states.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AgentSettings {
  profile_name?: string | null;
  profile_phone?: string | null;
  profile_email?: string | null;
  profile_bio?: string | null;
  profile_tagline?: string | null;
  profile_title?: string | null;
  profile_brokerage?: string | null;
  profile_license?: string | null;
  profile_website?: string | null;
  profile_instagram?: string | null;
  brand_logo_url?: string | null;
  brand_headshot_url?: string | null;
  notification_preferences?: Record<string, unknown>;
  campaign_preferences?: Record<string, unknown>;
  platform_preferences?: Record<string, unknown>;
}

export function useAgentSettings() {
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.status === 401) {
        setError('Please sign in to access settings');
        setSettings({});
        return;
      }
      if (res.status === 503 || res.status === 500) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Database unavailable. Check Supabase connection.');
      }
      if (!res.ok) throw new Error('Failed to load settings');
      const json = await res.json();
      setSettings(json.settings || {});
      setError(null);
    } catch (err) {
      console.error('[useAgentSettings:load]', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (updates: Partial<AgentSettings>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to save settings');
      }
      const json = await res.json();
      setSettings(json.settings);
      await load();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      console.error('[useAgentSettings:save]', msg);
      setError(msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { settings, loading, saving, error, save, reload: load };
}
