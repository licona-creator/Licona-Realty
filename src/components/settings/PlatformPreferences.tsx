/**
 * Platform Preferences Settings Section
 *
 * Display, language, date/time, and lead/contact preferences.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAgentSettings } from '@/hooks/useAgentSettings';
import { BRAND } from '@/lib/brand';
import { useTheme } from '@/components/providers/ThemeProvider';
import {
  Monitor,
  Globe,
  Clock,
  Users,
  Check,
  Sun,
  Moon,
  Laptop,
  Map,
  LayoutGrid,
  List,
  Table,
} from 'lucide-react';

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

type ThemeOption = 'dark' | 'light' | 'system';
type MapView = 'satellite' | 'roadmap' | 'terrain';
type PipelineView = 'kanban' | 'list' | 'table';

export function PlatformPreferences() {
  const { success, error: showError } = useToast();
  const { settings, saving, save, error: settingsError } = useAgentSettings();

  // Display - wired to ThemeProvider
  const { theme, setTheme } = useTheme();
  const [mapView, setMapView] = useState<MapView>('roadmap');
  const [pipelineView, setPipelineView] = useState<PipelineView>('kanban');

  // Language
  const [uiLanguage, setUiLanguage] = useState<'en' | 'es'>('en');
  const [contentLanguage, setContentLanguage] = useState<'en_first' | 'es_first' | 'match'>('en_first');

  // Date/time
  const [timezone, setTimezone] = useState('America/Chicago');
  const [dateFormat, setDateFormat] = useState<'MM/DD/YYYY' | 'DD/MM/YYYY'>('MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState<'12' | '24'>('12');

  // Lead preferences
  const [leadExpiryDays, setLeadExpiryDays] = useState(30);
  const [duplicateDetection, setDuplicateDetection] = useState<'strict' | 'moderate' | 'off'>('strict');
  const [autoGeocode, setAutoGeocode] = useState(true);

  // Save
  const [saved, setSaved] = useState(false);

  // Load saved platform preferences
  useEffect(() => {
    if (settings?.platform_preferences) {
      const p = settings.platform_preferences as Record<string, unknown>;
      if (p.mapView) setMapView(p.mapView as MapView);
      if (p.pipelineView) setPipelineView(p.pipelineView as PipelineView);
      if (p.uiLanguage) setUiLanguage(p.uiLanguage as 'en' | 'es');
      if (p.contentLanguage) setContentLanguage(p.contentLanguage as 'en_first' | 'es_first' | 'match');
      if (p.timezone) setTimezone(p.timezone as string);
      if (p.dateFormat) setDateFormat(p.dateFormat as 'MM/DD/YYYY' | 'DD/MM/YYYY');
      if (p.timeFormat) setTimeFormat(p.timeFormat as '12' | '24');
      if (p.leadExpiryDays !== undefined) setLeadExpiryDays(p.leadExpiryDays as number);
      if (p.duplicateDetection) setDuplicateDetection(p.duplicateDetection as 'strict' | 'moderate' | 'off');
      if (p.autoGeocode !== undefined) setAutoGeocode(p.autoGeocode as boolean);
    }
  }, [settings]);

  async function handleSave() {
    const ok = await save({
      platform_preferences: {
        mapView, pipelineView, uiLanguage, contentLanguage,
        timezone, dateFormat, timeFormat,
        leadExpiryDays, duplicateDetection, autoGeocode,
      },
    });
    if (ok) {
      setSaved(true);
      success('Preferences Saved', 'Your platform preferences have been saved to the database.');
      setTimeout(() => setSaved(false), 3000);
    } else {
      showError('Save Failed', settingsError || 'Could not save platform preferences. Please try again.');
    }
  }

  const themeOptions: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={14} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={14} /> },
    { value: 'system', label: 'System', icon: <Laptop size={14} /> },
  ];

  const mapOptions: { value: MapView; label: string }[] = [
    { value: 'roadmap', label: 'Roadmap' },
    { value: 'satellite', label: 'Satellite' },
    { value: 'terrain', label: 'Terrain' },
  ];

  const pipelineOptions: { value: PipelineView; label: string; icon: React.ReactNode }[] = [
    { value: 'kanban', label: 'Kanban', icon: <LayoutGrid size={14} /> },
    { value: 'list', label: 'List', icon: <List size={14} /> },
    { value: 'table', label: 'Table', icon: <Table size={14} /> },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Section Header */}
      <div>
        <h2
          className="text-xl font-semibold text-white"
          style={{ fontFamily: BRAND.fonts.playfair }}
        >
          Platform Preferences
        </h2>
        <p className="text-sm text-white/50 font-inter mt-1">
          Customize how the platform looks and behaves for you.
        </p>
      </div>

      {/* Display Preferences */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Monitor size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-white">Display</h3>
        </div>
        <div className="space-y-5">
          {/* Theme */}
          <div>
            <label className="text-sm text-white/70 font-inter block mb-2">Appearance</label>
            <div className="flex rounded-[8px] border border-gold/15 overflow-hidden w-fit">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`
                    flex items-center gap-1.5 px-4 py-2 text-xs font-montserrat font-medium
                    transition-colors duration-200
                    ${theme === opt.value ? 'bg-gold text-navy' : 'text-white/50 hover:bg-white/5'}
                  `}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Map View */}
          <div>
            <label className="text-sm text-white/70 font-inter block mb-2">Default map view</label>
            <div className="flex rounded-[8px] border border-gold/15 overflow-hidden w-fit">
              {mapOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMapView(opt.value)}
                  className={`
                    flex items-center gap-1.5 px-4 py-2 text-xs font-montserrat font-medium
                    transition-colors duration-200
                    ${mapView === opt.value ? 'bg-gold text-navy' : 'text-white/50 hover:bg-white/5'}
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pipeline View */}
          <div>
            <label className="text-sm text-white/70 font-inter block mb-2">Default pipeline view</label>
            <div className="flex rounded-[8px] border border-gold/15 overflow-hidden w-fit">
              {pipelineOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPipelineView(opt.value)}
                  className={`
                    flex items-center gap-1.5 px-4 py-2 text-xs font-montserrat font-medium
                    transition-colors duration-200
                    ${pipelineView === opt.value ? 'bg-gold text-navy' : 'text-white/50 hover:bg-white/5'}
                  `}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Language */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Globe size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-white">Language</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-white/70 font-inter w-52">Platform UI language:</label>
            <select
              value={uiLanguage}
              onChange={(e) => setUiLanguage(e.target.value as 'en' | 'es')}
              className="text-sm font-inter rounded-[8px] border border-gold/15 bg-white/5 text-white px-3 py-1.5"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-white/70 font-inter w-52">Default content language:</label>
            <select
              value={contentLanguage}
              onChange={(e) => setContentLanguage(e.target.value as 'en_first' | 'es_first' | 'match')}
              className="text-sm font-inter rounded-[8px] border border-gold/15 bg-white/5 text-white px-3 py-1.5"
            >
              <option value="en_first">English first</option>
              <option value="es_first">Spanish first</option>
              <option value="match">Match contact preference</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Date & Time */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Clock size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-white">Date & Time</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-white/70 font-inter w-52">Time zone:</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="text-sm font-inter rounded-[8px] border border-gold/15 bg-white/5 text-white px-3 py-1.5"
            >
              <option value="America/Chicago">Central Time (CT) - Dallas/Fort Worth</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-white/70 font-inter w-52">Date format:</label>
            <div className="flex rounded-[8px] border border-gold/15 overflow-hidden">
              <button
                onClick={() => setDateFormat('MM/DD/YYYY')}
                className={`px-3 py-1.5 text-xs font-montserrat font-medium transition-colors ${
                  dateFormat === 'MM/DD/YYYY' ? 'bg-gold text-navy' : 'text-white/50 hover:bg-white/5'
                }`}
              >
                MM/DD/YYYY
              </button>
              <button
                onClick={() => setDateFormat('DD/MM/YYYY')}
                className={`px-3 py-1.5 text-xs font-montserrat font-medium transition-colors ${
                  dateFormat === 'DD/MM/YYYY' ? 'bg-gold text-navy' : 'text-white/50 hover:bg-white/5'
                }`}
              >
                DD/MM/YYYY
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-white/70 font-inter w-52">Time format:</label>
            <div className="flex rounded-[8px] border border-gold/15 overflow-hidden">
              <button
                onClick={() => setTimeFormat('12')}
                className={`px-3 py-1.5 text-xs font-montserrat font-medium transition-colors ${
                  timeFormat === '12' ? 'bg-gold text-navy' : 'text-white/50 hover:bg-white/5'
                }`}
              >
                12-hour
              </button>
              <button
                onClick={() => setTimeFormat('24')}
                className={`px-3 py-1.5 text-xs font-montserrat font-medium transition-colors ${
                  timeFormat === '24' ? 'bg-gold text-navy' : 'text-white/50 hover:bg-white/5'
                }`}
              >
                24-hour
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Lead & Contact Preferences */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Users size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-white">Lead & Contact Preferences</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white/70 font-inter">Default lead expiry (days of inactivity)</label>
              <span className="text-sm font-montserrat font-semibold text-gold">{leadExpiryDays} days</span>
            </div>
            <input
              type="range"
              min={7}
              max={90}
              value={leadExpiryDays}
              onChange={(e) => setLeadExpiryDays(Number(e.target.value))}
              className="w-full accent-gold"
            />
            <p className="text-xs text-white/50 font-inter mt-1">
              Leads with no activity for this many days are surfaced as stale lead alerts.
            </p>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-4">
              <label className="text-sm text-white/70 font-inter w-52">Duplicate detection:</label>
              <select
                value={duplicateDetection}
                onChange={(e) => setDuplicateDetection(e.target.value as 'strict' | 'moderate' | 'off')}
                className="text-sm font-inter rounded-[8px] border border-gold/15 bg-white/5 text-white px-3 py-1.5"
              >
                <option value="strict">Strict (flag any matching phone or email)</option>
                <option value="moderate">Moderate (flag exact matches only)</option>
                <option value="off">Off</option>
              </select>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <Toggle
              label="Auto-geocode new contacts"
              description="Automatically geocode contact addresses when added to the CRM"
              enabled={autoGeocode}
              onChange={setAutoGeocode}
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
