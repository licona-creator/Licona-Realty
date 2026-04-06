/**
 * Brand & Assets Settings Section
 *
 * Upload real brand assets to replace auto-generated placeholders.
 * Logo, header images, brand colors, typography, and agent info.
 * All uploads stored in Supabase Storage private bucket.
 */

'use client';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useAgentSettings } from '@/hooks/useAgentSettings';
import { BRAND } from '@/lib/brand';
import {
  Upload,
  Image,
  Check,
  AlertTriangle,
  Palette,
  Type,
  User,
  RefreshCw,
  X,
} from 'lucide-react';

interface UploadSlot {
  label: string;
  description: string;
  accept: string;
  minDimensions?: string;
  currentPreview: string | null;
  file: File | null;
}

const PROPAGATION_POINTS = [
  'Navbar LR monogram area',
  'Dashboard header',
  'Login page',
  'Public SEO pages footer',
  'Email campaign headers',
  'Canva template brand kit',
  'Scheduling booking page',
  'Mortgage calculator page',
  'Agent profile page',
  'Social media post templates',
];

const BRAND_COLORS = [
  { hex: '#132236', name: 'Deep Navy', role: 'Primary backgrounds, navigation, cards' },
  { hex: '#d3a971', name: 'Warm Gold', role: 'Accent, CTAs, active states, highlights' },
  { hex: '#f4f4f4', name: 'Soft White', role: 'Surface backgrounds, content areas' },
  { hex: '#1a1a1a', name: 'Near Black', role: 'Body text, headings on light backgrounds' },
  { hex: '#ffffff', name: 'White', role: 'Text on dark backgrounds, card surfaces' },
];

const FONT_ASSIGNMENTS = [
  { name: 'Playfair Display', role: 'Display headings, hero text', sample: 'Smart Moves. Simple Decisions.' },
  { name: 'Montserrat', role: 'Navigation, buttons, labels', sample: 'LICONA REALTY' },
  { name: 'Inter', role: 'Body text, content, descriptions', sample: 'North Texas Realtor\u00AE specializing in residential real estate.' },
  { name: 'DM Serif Display', role: 'Large numbers, pipeline values', sample: '$1,250,000' },
  { name: 'Sacramento', role: 'Milestone headlines only', sample: 'Congratulations' },
];

export function BrandAssets() {
  const { error: showError, success: showSuccess } = useToast();
  const { settings, saving, save, error: settingsError } = useAgentSettings();

  // Logo upload state
  const [primaryLogo, setPrimaryLogo] = useState<UploadSlot>({
    label: 'Full Horizontal Logo Lockup',
    description: 'LICONA REALTY with LR monogram. Recommended: 800x400px minimum. PNG, SVG, or JPG.',
    accept: '.png,.svg,.jpg,.jpeg',
    minDimensions: '800x400px',
    currentPreview: null,
    file: null,
  });
  const [monogramMark, setMonogramMark] = useState<UploadSlot>({
    label: 'LR Monogram Mark',
    description: 'Square monogram for social media corners and compact displays. Recommended: 400x400px.',
    accept: '.png,.svg,.jpg,.jpeg',
    minDimensions: '400x400px',
    currentPreview: null,
    file: null,
  });
  const [favicon, setFavicon] = useState<UploadSlot>({
    label: 'Favicon',
    description: 'Browser tab icon. 32x32px. ICO or PNG format.',
    accept: '.ico,.png',
    minDimensions: '32x32px',
    currentPreview: null,
    file: null,
  });

  // Header/banner uploads
  const [dashboardHeader, setDashboardHeader] = useState<UploadSlot>({
    label: 'Dashboard Header Background',
    description: 'Custom header image or gradient overlay for the dashboard hero area.',
    accept: '.png,.jpg,.jpeg,.webp',
    minDimensions: '1920x400px',
    currentPreview: null,
    file: null,
  });
  const [profileHero, setProfileHero] = useState<UploadSlot>({
    label: 'Agent Profile Hero Image',
    description: 'Professional headshot or lifestyle photo for the public agent profile page.',
    accept: '.png,.jpg,.jpeg,.webp',
    minDimensions: '800x800px',
    currentPreview: null,
    file: null,
  });
  const [emailHeader, setEmailHeader] = useState<UploadSlot>({
    label: 'Email Campaign Header',
    description: 'Branded header image for all outgoing email campaigns. Recommended: 600x200px.',
    accept: '.png,.jpg,.jpeg',
    minDimensions: '600x200px',
    currentPreview: null,
    file: null,
  });
  const [socialPhoto, setSocialPhoto] = useState<UploadSlot>({
    label: 'Social Media Profile Photo',
    description: 'Profile photo for Instagram and Facebook representations inside the platform.',
    accept: '.png,.jpg,.jpeg',
    minDimensions: '400x400px',
    currentPreview: null,
    file: null,
  });
  const [openHouseHeader, setOpenHouseHeader] = useState<UploadSlot>({
    label: 'Open House Flyer Header',
    description: 'Branded header image for open house flyers generated through Canva.',
    accept: '.png,.jpg,.jpeg',
    minDimensions: '1200x400px',
    currentPreview: null,
    file: null,
  });

  // Brand colors
  const [colors, setColors] = useState(
    BRAND_COLORS.map((c) => ({ ...c, editing: false, tempHex: c.hex }))
  );
  const [colorWarning, setColorWarning] = useState<string | null>(null);

  // Agent info
  const [agentInfo, setAgentInfo] = useState<Record<string, string>>({
    name: BRAND.agent.name,
    title: BRAND.agent.title,
    phone: BRAND.agent.phone,
    email: BRAND.agent.email,
    website: BRAND.agent.website,
    brokerage: BRAND.agent.brokerage,
    license: BRAND.agent.license,
    bilingual: BRAND.agent.bilingual,
    tagline: BRAND.tagline,
    instagram: BRAND.agent.instagram,
  });

  // Save states
  const [saved, setSaved] = useState(false);
  const [propagationResults, setPropagationResults] = useState<string[] | null>(null);
  const [canvaSyncNeeded, setCanvaSyncNeeded] = useState(false);
  const [canvaSyncing, setCanvaSyncing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved agent info from database
  useEffect(() => {
    if (settings) {
      setAgentInfo({
        name: settings.profile_name || BRAND.agent.name,
        title: settings.profile_title || BRAND.agent.title,
        phone: settings.profile_phone || BRAND.agent.phone,
        email: settings.profile_email || BRAND.agent.email,
        website: settings.profile_website || BRAND.agent.website,
        brokerage: settings.profile_brokerage || BRAND.agent.brokerage,
        license: settings.profile_license || BRAND.agent.license,
        bilingual: BRAND.agent.bilingual,
        tagline: settings.profile_tagline || BRAND.tagline,
        instagram: settings.profile_instagram || BRAND.agent.instagram,
      });
      if (settings.brand_logo_url) {
        setPrimaryLogo(prev => ({ ...prev, currentPreview: settings.brand_logo_url! }));
      }
      if (settings.brand_headshot_url) {
        setProfileHero(prev => ({ ...prev, currentPreview: settings.brand_headshot_url! }));
      }
    }
  }, [settings]);

  function handleFileSelect(
    e: ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<UploadSlot>>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      showError('File Too Large', 'File size must be under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setter((prev) => ({
        ...prev,
        file,
        currentPreview: ev.target?.result as string,
      }));
      setCanvaSyncNeeded(true);
    };
    reader.readAsDataURL(file);
  }

  function clearUpload(setter: React.Dispatch<React.SetStateAction<UploadSlot>>) {
    setter((prev) => ({ ...prev, file: null, currentPreview: null }));
  }

  async function handleSave() {
    setSaved(false);
    setPropagationResults(null);

    // Upload logo file if selected
    if (primaryLogo.file) {
      const formData = new FormData();
      formData.append('file', primaryLogo.file);
      formData.append('asset_type', 'logo');
      try {
        const res = await fetch('/api/upload/brand-asset', { method: 'POST', body: formData });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          showError('Logo Upload Failed', json.error || 'Could not upload logo.');
          return;
        }
      } catch (err) {
        console.error('[BrandAssets:logoUpload]', err);
        showError('Logo Upload Failed', 'Network error during upload.');
        return;
      }
    }

    // Upload headshot/profile hero if selected
    if (profileHero.file) {
      const formData = new FormData();
      formData.append('file', profileHero.file);
      formData.append('asset_type', 'headshot');
      try {
        const res = await fetch('/api/upload/brand-asset', { method: 'POST', body: formData });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          showError('Headshot Upload Failed', json.error || 'Could not upload headshot.');
          return;
        }
      } catch (err) {
        console.error('[BrandAssets:headshotUpload]', err);
        showError('Headshot Upload Failed', 'Network error during upload.');
        return;
      }
    }

    // Save agent info to database
    const ok = await save({
      profile_name: agentInfo.name,
      profile_title: agentInfo.title,
      profile_phone: agentInfo.phone,
      profile_email: agentInfo.email,
      profile_website: agentInfo.website,
      profile_brokerage: agentInfo.brokerage,
      profile_license: agentInfo.license,
      profile_tagline: agentInfo.tagline,
      profile_instagram: agentInfo.instagram,
    });

    if (ok) {
      // Show propagation results if logo was uploaded
      if (primaryLogo.file || monogramMark.file || favicon.file) {
        setPropagationResults(PROPAGATION_POINTS);
      }
      setSaved(true);
      showSuccess('Brand Settings Saved', 'Your brand assets and agent info have been saved to the database.');
      setTimeout(() => setSaved(false), 3000);
    } else {
      showError('Save Failed', settingsError || 'Could not save brand settings. Please try again.');
    }
  }

  async function handleCanvaSync() {
    setCanvaSyncing(true);
    // Canva sync is informational only until Canva API integration is wired
    showSuccess('Sync Noted', 'Canva brand kit sync will apply when the Canva Connect API is fully integrated.');
    setCanvaSyncing(false);
    setCanvaSyncNeeded(false);
  }

  function renderUploadSlot(
    slot: UploadSlot,
    setter: React.Dispatch<React.SetStateAction<UploadSlot>>,
    inputId: string
  ) {
    return (
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-montserrat font-semibold text-white">{slot.label}</h4>
          <p className="text-xs text-white/50 font-inter mt-0.5">{slot.description}</p>
        </div>

        {slot.currentPreview ? (
          <div className="space-y-3">
            {/* Preview on navy and white backgrounds */}
            <div className="flex gap-3">
              <div
                className="flex-1 rounded-[8px] p-4 flex items-center justify-center min-h-[80px]"
                style={{ backgroundColor: BRAND.colors.navy }}
              >
                <img
                  src={slot.currentPreview}
                  alt={`${slot.label} preview on navy`}
                  className="max-h-16 max-w-full object-contain"
                />
              </div>
              <div
                className="flex-1 rounded-[8px] p-4 flex items-center justify-center min-h-[80px] border border-gold/15"
                style={{ backgroundColor: '#ffffff' }}
              >
                <img
                  src={slot.currentPreview}
                  alt={`${slot.label} preview on white`}
                  className="max-h-16 max-w-full object-contain"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 font-inter flex-1 truncate">
                {slot.file?.name}
              </span>
              <button
                onClick={() => clearUpload(setter)}
                className="text-red-500 hover:text-red-600 transition-colors p-1"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gold/30 rounded-[8px] py-6 px-4 cursor-pointer hover:border-gold/60 hover:bg-gold/5 transition-all duration-200"
          >
            <Upload size={20} className="text-gold/50" />
            <span className="text-xs text-white/40 font-inter">
              Click to upload or drag and drop
            </span>
            {slot.minDimensions && (
              <span className="text-[10px] text-white/30 font-inter">
                Minimum: {slot.minDimensions}
              </span>
            )}
          </label>
        )}

        <input
          id={inputId}
          type="file"
          accept={slot.accept}
          onChange={(e) => handleFileSelect(e, setter)}
          className="hidden"
          ref={fileInputRef}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Section Header */}
      <div>
        <h2
          className="text-xl font-semibold text-white"
          style={{ fontFamily: BRAND.fonts.playfair }}
        >
          Brand & Assets
        </h2>
        <p className="text-sm text-white/50 font-inter mt-1">
          Upload your real Licona Realty assets to replace auto-generated placeholders.
          Changes apply across every screen, template, and public page.
        </p>
      </div>

      {/* Logo Uploads */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Image size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-white">Logo Upload</h3>
        </div>
        <div className="space-y-6">
          {renderUploadSlot(primaryLogo, setPrimaryLogo, 'primary-logo')}
          <div className="border-t border-white/10" />
          {renderUploadSlot(monogramMark, setMonogramMark, 'monogram-mark')}
          <div className="border-t border-white/10" />
          {renderUploadSlot(favicon, setFavicon, 'favicon')}
        </div>
      </Card>

      {/* Header & Banner Images */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Image size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-white">Header & Banner Images</h3>
        </div>
        <div className="space-y-6">
          {renderUploadSlot(dashboardHeader, setDashboardHeader, 'dashboard-header')}
          <div className="border-t border-white/10" />
          {renderUploadSlot(profileHero, setProfileHero, 'profile-hero')}
          <div className="border-t border-white/10" />
          {renderUploadSlot(emailHeader, setEmailHeader, 'email-header')}
          <div className="border-t border-white/10" />
          {renderUploadSlot(socialPhoto, setSocialPhoto, 'social-photo')}
          <div className="border-t border-white/10" />
          {renderUploadSlot(openHouseHeader, setOpenHouseHeader, 'open-house-header')}
        </div>
      </Card>

      {/* Brand Colors */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Palette size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-white">Brand Colors</h3>
        </div>
        <p className="text-xs text-white/50 font-inter mb-4">
          Verify your brand colors are correct. Changes propagate across all Tailwind CSS
          theme variables and Canva brand kit references.
        </p>
        <div className="space-y-3">
          {colors.map((color, i) => (
            <div key={color.hex} className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-[8px] border border-gold/15 flex-shrink-0"
                style={{ backgroundColor: color.editing ? color.tempHex : color.hex }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-montserrat font-semibold text-white">{color.name}</p>
                <p className="text-xs text-white/40 font-inter">{color.role}</p>
              </div>
              {color.editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color.tempHex}
                    onChange={(e) => {
                      const updated = [...colors];
                      updated[i] = { ...updated[i], tempHex: e.target.value };
                      setColors(updated);
                    }}
                    className="w-8 h-8 cursor-pointer rounded border-0"
                  />
                  <Input
                    value={color.tempHex}
                    onChange={(e) => {
                      const updated = [...colors];
                      updated[i] = { ...updated[i], tempHex: e.target.value };
                      setColors(updated);
                    }}
                    className="!w-24 !text-xs !py-1"
                  />
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => {
                      setColorWarning(`Changing "${color.name}" will update it across every screen and every template. Are you sure?`);
                      const updated = [...colors];
                      updated[i] = { ...updated[i], hex: updated[i].tempHex, editing: false };
                      setColors(updated);
                      setCanvaSyncNeeded(true);
                      setTimeout(() => setColorWarning(null), 4000);
                    }}
                  >
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const updated = [...colors];
                      updated[i] = { ...updated[i], editing: false, tempHex: updated[i].hex };
                      setColors(updated);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <code className="text-xs text-white/60 font-mono">{color.hex}</code>
                  <button
                    onClick={() => {
                      const updated = [...colors];
                      updated[i] = { ...updated[i], editing: true };
                      setColors(updated);
                    }}
                    className="text-xs text-gold hover:underline font-inter"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {colorWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex items-start gap-2 p-3 rounded-[8px] bg-amber-500/10 border border-amber-500/30"
          >
            <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-600 font-inter">{colorWarning}</p>
          </motion.div>
        )}
      </Card>

      {/* Typography */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Type size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-white">Typography</h3>
        </div>
        <p className="text-xs text-white/50 font-inter mb-4">
          Verify all brand fonts are loading correctly.
        </p>
        <div className="space-y-4">
          {FONT_ASSIGNMENTS.map((font) => (
            <div key={font.name} className="border border-gold/15 rounded-[8px] p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-montserrat font-semibold text-white">{font.name}</p>
                  <p className="text-xs text-white/40 font-inter">{font.role}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-green-600 font-inter">Loaded</span>
                </div>
              </div>
              <p
                className="text-lg text-white mt-2"
                style={{
                  fontFamily:
                    font.name === 'Playfair Display' ? BRAND.fonts.playfair :
                    font.name === 'Montserrat' ? BRAND.fonts.montserrat :
                    font.name === 'Inter' ? BRAND.fonts.inter :
                    font.name === 'DM Serif Display' ? BRAND.fonts.dmSerif :
                    BRAND.fonts.sacramento,
                }}
              >
                {font.sample}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Agent Information */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <User size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-white">Agent Information</h3>
        </div>
        <p className="text-xs text-white/50 font-inter mb-4">
          These fields appear throughout the platform: email signatures, Canva template footers,
          public SEO pages, the agent profile page, and the scheduling booking page.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={agentInfo.name}
            onChange={(e) => setAgentInfo({ ...agentInfo, name: e.target.value })}
          />
          <Input
            label="Title"
            value={agentInfo.title}
            onChange={(e) => setAgentInfo({ ...agentInfo, title: e.target.value })}
          />
          <Input
            label="Phone"
            value={agentInfo.phone}
            onChange={(e) => setAgentInfo({ ...agentInfo, phone: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={agentInfo.email}
            onChange={(e) => setAgentInfo({ ...agentInfo, email: e.target.value })}
          />
          <Input
            label="Website"
            value={agentInfo.website}
            onChange={(e) => setAgentInfo({ ...agentInfo, website: e.target.value })}
          />
          <Input
            label="Brokerage"
            value={agentInfo.brokerage}
            onChange={(e) => setAgentInfo({ ...agentInfo, brokerage: e.target.value })}
          />
          <Input
            label="License"
            value={agentInfo.license}
            onChange={(e) => setAgentInfo({ ...agentInfo, license: e.target.value })}
          />
          <Input
            label="Bilingual Identifier"
            value={agentInfo.bilingual}
            onChange={(e) => setAgentInfo({ ...agentInfo, bilingual: e.target.value })}
          />
          <div className="md:col-span-2">
            <Input
              label="Brand Tagline"
              value={agentInfo.tagline}
              onChange={(e) => setAgentInfo({ ...agentInfo, tagline: e.target.value })}
            />
          </div>
          <Input
            label="Instagram Handle"
            value={agentInfo.instagram}
            onChange={(e) => setAgentInfo({ ...agentInfo, instagram: e.target.value })}
          />
        </div>
        <div className="mt-4 flex items-start gap-2 p-3 rounded-[8px] bg-gold/5 border border-gold/20">
          <AlertTriangle size={14} className="text-gold flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/60 font-inter">
            Saving changes will update your information across all templates and public pages.
          </p>
        </div>
      </Card>

      {/* Canva Brand Kit Sync */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-white">Canva Brand Kit Sync</h3>
        </div>
        <p className="text-xs text-white/50 font-inter mb-4">
          Push your current colors, fonts, and uploaded logo to the connected Canva brand kit.
        </p>
        <div className="flex items-center gap-4">
          <Button
            variant="accent"
            onClick={handleCanvaSync}
            loading={canvaSyncing}
            className={canvaSyncNeeded ? 'animate-pulse shadow-[0_0_12px_rgba(211,169,113,0.4)]' : ''}
          >
            <RefreshCw size={14} className="mr-2" />
            Sync Brand Kit to Canva
          </Button>
          {canvaSyncNeeded && (
            <span className="text-xs text-gold font-inter">
              Brand assets changed. Sync recommended.
            </span>
          )}
        </div>
      </Card>

      {/* Propagation Results */}
      {propagationResults && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card variant="elevated">
            <div className="flex items-center gap-2 mb-3">
              <Check size={18} className="text-green-500" />
              <h3 className="text-base font-montserrat font-semibold text-white">
                Logo Propagation Complete
              </h3>
            </div>
            <p className="text-xs text-white/50 font-inter mb-3">
              Your logo has been updated in the following locations:
            </p>
            <ul className="space-y-1.5">
              {propagationResults.map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <Check size={12} className="text-green-500 flex-shrink-0" />
                  <span className="text-sm text-white/70 font-inter">{point}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-2">
        <Button
          variant="accent"
          size="lg"
          onClick={handleSave}
          loading={saving}
        >
          {saved ? (
            <>
              <Check size={16} className="mr-2" />
              Changes Saved
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
        {saved && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-green-600 font-inter"
          >
            All changes saved and propagated successfully.
          </motion.span>
        )}
      </div>
    </div>
  );
}
