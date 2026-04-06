/**
 * Campaign Defaults Settings Section
 *
 * Default language, tone, timing, and voice engine preferences
 * for all campaign tracks.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAgentSettings } from '@/hooks/useAgentSettings';
import { BRAND } from '@/lib/brand';
import {
  Languages,
  MessageSquare,
  Clock,
  Mic,
  Check,
} from 'lucide-react';

const TRACKS = ['Buyer', 'Seller', 'Landlord', 'Tenant', 'Investor', 'Sphere'] as const;

const TONE_OPTIONS = [
  'Casual Friend',
  'Professional Personal',
  'Formal Business',
  'Warm Mentor',
  'Market Expert',
  'Bilingual Blend',
  'Celebratory',
];

function Toggle({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        onClick={() => onChange(!enabled)}
        className={`
          relative w-10 h-5 rounded-full flex-shrink-0 mt-0.5
          transition-colors duration-200 cursor-pointer
          ${enabled ? 'bg-gold' : 'bg-white/20'}
        `}
      >
        <div
          className={`
            absolute top-0.5 w-4 h-4 rounded-full bg-white shadow
            transition-transform duration-200
            ${enabled ? 'translate-x-5' : 'translate-x-0.5'}
          `}
        />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-inter">{label}</p>
        {description && (
          <p className="text-xs text-white/50 font-inter mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

export function CampaignDefaults() {
  const { success, error: showError } = useToast();
  const { settings, saving, save, error: settingsError } = useAgentSettings();

  // Language defaults per track
  const [languages, setLanguages] = useState<Record<string, string>>(
    Object.fromEntries(TRACKS.map((t) => [t, 'english']))
  );

  // Tone defaults per track
  const [tones, setTones] = useState<Record<string, string>>(
    Object.fromEntries(TRACKS.map((t) => [t, 'Professional Personal']))
  );

  // Timing
  const [defaultSendTime, setDefaultSendTime] = useState('09:00');
  const [respectQuietHours, setRespectQuietHours] = useState(true);
  const [quietStart, setQuietStart] = useState('21:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  const [weekendSending, setWeekendSending] = useState(false);

  // Voice engine
  const [voiceThreshold, setVoiceThreshold] = useState(85);
  const [autoApplyEdits, setAutoApplyEdits] = useState(true);
  const [monthlyVoiceReport, setMonthlyVoiceReport] = useState(true);

  // Save
  const [saved, setSaved] = useState(false);

  // Load saved campaign preferences
  useEffect(() => {
    if (settings?.campaign_preferences) {
      const prefs = settings.campaign_preferences as Record<string, unknown>;
      if (prefs.languages) setLanguages(prefs.languages as Record<string, string>);
      if (prefs.tones) setTones(prefs.tones as Record<string, string>);
      if (prefs.defaultSendTime) setDefaultSendTime(prefs.defaultSendTime as string);
      if (prefs.respectQuietHours !== undefined) setRespectQuietHours(prefs.respectQuietHours as boolean);
      if (prefs.quietStart) setQuietStart(prefs.quietStart as string);
      if (prefs.quietEnd) setQuietEnd(prefs.quietEnd as string);
      if (prefs.weekendSending !== undefined) setWeekendSending(prefs.weekendSending as boolean);
      if (prefs.voiceThreshold !== undefined) setVoiceThreshold(prefs.voiceThreshold as number);
      if (prefs.autoApplyEdits !== undefined) setAutoApplyEdits(prefs.autoApplyEdits as boolean);
      if (prefs.monthlyVoiceReport !== undefined) setMonthlyVoiceReport(prefs.monthlyVoiceReport as boolean);
    }
  }, [settings]);

  async function handleSave() {
    const ok = await save({
      campaign_preferences: {
        languages, tones, defaultSendTime, respectQuietHours,
        quietStart, quietEnd, weekendSending,
        voiceThreshold, autoApplyEdits, monthlyVoiceReport,
      },
    });
    if (ok) {
      setSaved(true);
      success('Campaign Defaults Saved', 'Your campaign preferences have been saved to the database.');
      setTimeout(() => setSaved(false), 3000);
    } else {
      showError('Save Failed', settingsError || 'Could not save campaign defaults. Please try again.');
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Section Header */}
      <div>
        <h2
          className="text-xl font-semibold text-white"
          style={{ fontFamily: BRAND.fonts.playfair }}
        >
          Campaign Defaults
        </h2>
        <p className="text-sm text-white/50 font-inter mt-1">
          Configure default language, tone, timing, and voice engine preferences for each campaign track.
          These are starting defaults. You can always override on each individual campaign.
        </p>
      </div>

      {/* Default Language */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Languages size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-white">Default Language per Track</h3>
        </div>
        <div className="space-y-3">
          {TRACKS.map((track) => (
            <div key={track} className="flex items-center gap-4">
              <span className="text-sm text-white/70 font-inter w-24">{track}:</span>
              <select
                value={languages[track]}
                onChange={(e) => setLanguages({ ...languages, [track]: e.target.value })}
                className="text-sm font-inter rounded-[8px] border border-gold/15 bg-white/5 text-white px-3 py-1.5 flex-1 max-w-xs"
              >
                <option value="english">English</option>
                <option value="spanish">Spanish</option>
                <option value="ask">Ask on each contact</option>
              </select>
            </div>
          ))}
        </div>
      </Card>

      {/* Default Tone */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <MessageSquare size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-white">Default Tone per Track</h3>
        </div>
        <p className="text-xs text-white/50 font-inter mb-4">
          The default tone the system recommends when surfacing campaign options.
          You always have the option to select a different tone.
        </p>
        <div className="space-y-3">
          {TRACKS.map((track) => (
            <div key={track} className="flex items-center gap-4">
              <span className="text-sm text-white/70 font-inter w-24">{track}:</span>
              <select
                value={tones[track]}
                onChange={(e) => setTones({ ...tones, [track]: e.target.value })}
                className="text-sm font-inter rounded-[8px] border border-gold/15 bg-white/5 text-white px-3 py-1.5 flex-1 max-w-xs"
              >
                {TONE_OPTIONS.map((tone) => (
                  <option key={tone} value={tone}>{tone}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>

      {/* Campaign Timing */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Clock size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-white">Campaign Timing</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-white/70 font-inter w-52">Default send time:</label>
            <input
              type="time"
              value={defaultSendTime}
              onChange={(e) => setDefaultSendTime(e.target.value)}
              className="text-sm font-inter rounded-[8px] border border-gold/15 bg-white/5 text-white px-3 py-1.5"
            />
            <span className="text-xs text-white/50 font-inter">local time</span>
          </div>

          <div className="border-t border-gold/15 pt-4">
            <Toggle
              label="Respect quiet hours"
              description="No campaign messages send during quiet hours"
              enabled={respectQuietHours}
              onChange={setRespectQuietHours}
            />
            {respectQuietHours && (
              <div className="flex items-center gap-3 mt-3 ml-13 pl-[52px]">
                <span className="text-xs text-white/50 font-inter">From</span>
                <input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="text-xs font-inter rounded-[8px] border border-gold/15 bg-white/5 text-white px-2 py-1"
                />
                <span className="text-xs text-white/50 font-inter">to</span>
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="text-xs font-inter rounded-[8px] border border-gold/15 bg-white/5 text-white px-2 py-1"
                />
              </div>
            )}
          </div>

          <div className="border-t border-gold/15 pt-4">
            <Toggle
              label="Weekend sending"
              description="If off, messages scheduled on weekends automatically reschedule to Monday morning"
              enabled={weekendSending}
              onChange={setWeekendSending}
            />
          </div>
        </div>
      </Card>

      {/* Voice Engine */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Mic size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-white">Voice Engine Preferences</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white/70 font-inter">Voice accuracy threshold</label>
              <span className="text-sm font-montserrat font-semibold text-gold">{voiceThreshold}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              value={voiceThreshold}
              onChange={(e) => setVoiceThreshold(Number(e.target.value))}
              className="w-full accent-gold"
            />
            <p className="text-xs text-white/50 font-inter mt-1">
              Messages below this confidence level are flagged for heavier review in the approval queue.
            </p>
          </div>

          <div className="border-t border-gold/15 pt-4">
            <Toggle
              label="Auto-apply voice edits"
              description="If you make the same edit 3 or more times, the voice engine asks if it should apply this as a permanent rule"
              enabled={autoApplyEdits}
              onChange={setAutoApplyEdits}
            />
          </div>

          <div className="border-t border-gold/15 pt-4">
            <Toggle
              label="Monthly voice report"
              description="Receive a monthly summary of voice engine accuracy and learned patterns"
              enabled={monthlyVoiceReport}
              onChange={setMonthlyVoiceReport}
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-2">
        <Button variant="accent" size="lg" onClick={handleSave} loading={saving}>
          {saved ? (
            <>
              <Check size={16} className="mr-2" />
              Changes Saved
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}
