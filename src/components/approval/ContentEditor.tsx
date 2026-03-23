/**
 * Content Editor — Voice Engine Active
 *
 * Used in the approval queue for editing drafts before approval.
 * Features:
 * - Tone mode selector with one-tap switch
 * - Language toggle (EN/ES/Bilingual)
 * - Quick adjustment buttons: "More casual", "Shorter", etc.
 * - Real-time banned phrase detection
 * - Content preview as recipient will see it
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { BRAND } from '@/lib/brand';
import {
  VOICE_TONE_PROFILES,
  VOICE_ADJUSTMENTS,
  checkBannedPhrases,
} from '@/lib/voice/engine';
import type { VoiceToneMode, LanguagePreference } from '@/types/database';
import { AlertTriangle, Check, Globe } from 'lucide-react';

interface ContentEditorProps {
  initialContent: string;
  initialToneMode: VoiceToneMode;
  initialLanguage?: LanguagePreference;
  onSave: (content: string, toneMode: VoiceToneMode) => void;
  onCancel: () => void;
}

const languages: Array<{ value: LanguagePreference; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'bilingual', label: 'Bilingual' },
];

export function ContentEditor({
  initialContent,
  initialToneMode,
  initialLanguage = 'en',
  onSave,
  onCancel,
}: ContentEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [toneMode, setToneMode] = useState<VoiceToneMode>(initialToneMode);
  const [language, setLanguage] = useState<LanguagePreference>(initialLanguage);
  const [violations, setViolations] = useState<string[]>([]);

  // Check for banned phrases in real-time
  useEffect(() => {
    const found = checkBannedPhrases(content);
    setViolations(found);
  }, [content]);

  return (
    <div className="space-y-4">
      {/* Tone Mode Selector */}
      <div>
        <label className="text-xs font-montserrat font-semibold text-navy/60 dark:text-white/60 mb-2 block">
          Tone Mode
        </label>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(VOICE_TONE_PROFILES).map((profile) => (
            <button
              key={profile.mode}
              onClick={() => setToneMode(profile.mode)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-montserrat font-medium transition-all duration-200
                ${
                  toneMode === profile.mode
                    ? 'bg-navy text-gold'
                    : 'bg-white dark:bg-dark-card text-navy/50 dark:text-white/50 border border-gold/15 hover:bg-gold/20'
                }
              `}
            >
              {profile.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter mt-1">
          {VOICE_TONE_PROFILES[toneMode].description}
        </p>
      </div>

      {/* Language Toggle */}
      <div className="flex items-center gap-2">
        <Globe size={14} className="text-navy/40 dark:text-white/40" />
        <div className="flex gap-1">
          {languages.map((lang) => (
            <button
              key={lang.value}
              onClick={() => setLanguage(lang.value)}
              className={`px-2.5 py-1 rounded-[6px] text-xs font-montserrat font-medium transition-all duration-200
                ${
                  language === lang.value
                    ? 'bg-gold text-navy'
                    : 'text-navy/40 dark:text-white/40 hover:text-gold'
                }
              `}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Textarea */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full min-h-[200px] p-4 rounded-[8px] bg-white dark:bg-dark-card
          border border-gold/15 text-navy dark:text-white font-inter text-sm
          focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
          transition-all duration-200 resize-y"
        placeholder="Edit the content..."
      />

      {/* Banned Phrase Warnings */}
      {violations.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[8px] p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-red-500" />
            <p className="text-xs font-montserrat font-semibold text-red-600 dark:text-red-400">
              Voice Engine Warning
            </p>
          </div>
          <ul className="space-y-0.5">
            {violations.map((v, i) => (
              <li key={i} className="text-xs text-red-500 font-inter">
                {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Adjustments */}
      <div>
        <label className="text-xs font-montserrat font-semibold text-navy/60 dark:text-white/60 mb-2 block">
          Quick Adjustments
        </label>
        <div className="flex flex-wrap gap-1.5">
          {VOICE_ADJUSTMENTS.map((adj) => (
            <button
              key={adj}
              onClick={() => setContent(prev => `[${adj}] ${prev}`)}
              className="px-3 py-1.5 rounded-full text-xs font-inter
                bg-white dark:bg-dark-card text-navy/50 dark:text-white/50
                border border-gold/15 hover:bg-gold/20 hover:text-gold
                transition-all duration-200"
            >
              {adj}
            </button>
          ))}
        </div>
      </div>

      {/* Character / Word Count */}
      <div className="flex items-center justify-between text-[10px] text-navy/30 dark:text-white/30 font-inter">
        <span>{content.length} characters</span>
        <span>{content.split(/\s+/).filter(Boolean).length} words</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="accent" onClick={() => onSave(content, toneMode)}>
          <Check size={16} />
          Approve Edited Version
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
