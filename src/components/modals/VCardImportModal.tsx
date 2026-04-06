/**
 * vCard Import Modal
 *
 * Full import flow for iPhone contacts (.vcf files):
 * Step 1: File upload with instructions
 * Step 2: Smart review with tabs (ready, filtered, duplicates)
 * Step 3: Import progress
 * Step 4: Post-import success with AI analysis prompt
 */

'use client';

import { useState, useRef, useCallback, useEffect, type ChangeEvent, type DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, ChevronDown, ChevronUp, Check, Smartphone,
  Users, Building2, Copy, AlertCircle, Loader2, CheckCircle2,
  ArrowRight, Sparkles, Cake,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { BRAND } from '@/lib/brand';
import { parseVCardFile, type ParsedContact } from '@/lib/import/vcard-parser';
import {
  classifyContacts,
  type ClassifiedContact,
  type ClassificationResult,
  type ExistingContact,
} from '@/lib/import/smart-filter';
import { getDisplayName } from '@/lib/format';

interface VCardImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ImportStep = 'upload' | 'review' | 'language' | 'disc' | 'progress' | 'complete';
type ReviewTab = 'ready' | 'filtered' | 'duplicates';
type TierType = 'inner_circle' | 'sphere' | 'outer_circle';

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DFW_AREA_CODES = ['469', '972', '214', '817', '682', '940'];

function getAreaCode(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '1') return digits.slice(1, 4);
  if (digits.length >= 10) return digits.slice(0, 3);
  return '';
}

function isDFW(phone: string): boolean {
  return DFW_AREA_CODES.includes(getAreaCode(phone));
}

const HISPANIC_SURNAMES = new Set([
  'serrano', 'garcia', 'rodriguez', 'lopez', 'martinez', 'hernandez', 'gonzalez',
  'perez', 'sanchez', 'ramirez', 'torres', 'flores', 'rivera', 'gomez', 'diaz',
  'reyes', 'cruz', 'morales', 'ortiz', 'gutierrez', 'chavez', 'ramos', 'vargas',
  'castillo', 'jimenez', 'delgadillo', 'montalvo', 'fuentes', 'mendoza', 'ruiz',
  'aguilar', 'medina', 'dominguez', 'castro', 'romero', 'alvarez', 'salazar',
  'espinoza', 'contreras', 'soto', 'vega', 'figueroa', 'campos', 'cervantes',
  'silva', 'nunez', 'sandoval', 'herrera', 'guerrero', 'maldonado', 'vasquez',
  'camacho', 'luna', 'mora', 'rojas', 'rios',
]);

function isHispanicSurname(lastName: string): boolean {
  return HISPANIC_SURNAMES.has(lastName.toLowerCase().trim());
}

function assignTier(contact: ClassifiedContact): TierType {
  const hasDFW = contact.phone ? isDFW(contact.phone) : false;
  if (contact.email && contact.phone && hasDFW) return 'inner_circle';
  if (contact.phone && hasDFW) return 'sphere';
  return 'outer_circle';
}

function getFollowUpDate(tier: TierType): string {
  const d = new Date();
  if (tier === 'inner_circle') d.setDate(d.getDate() + 7);
  else if (tier === 'sphere') d.setDate(d.getDate() + 30);
  else d.setDate(d.getDate() + 90);
  return d.toISOString().split('T')[0];
}

interface EnhancedContact extends ClassifiedContact {
  tier: TierType;
  is_spanish: boolean;
  disc_pick?: 'D' | 'I' | 'S' | 'C' | null;
}

export function VCardImportModal({ open, onClose, onSuccess }: VCardImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [activeTab, setActiveTab] = useState<ReviewTab>('ready');
  const [showInstructions, setShowInstructions] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importCurrentName, setImportCurrentName] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null);
  const [emailCount, setEmailCount] = useState(0);
  const [enhancedContacts, setEnhancedContacts] = useState<EnhancedContact[]>([]);
  const [discIndex, setDiscIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('upload');
        setFile(null);
        setParsing(false);
        setClassification(null);
        setActiveTab('ready');
        setShowInstructions(false);
        setDragOver(false);
        setImportProgress(0);
        setImportTotal(0);
        setImportCurrentName('');
        setImportResult(null);
        setEmailCount(0);
        setEnhancedContacts([]);
        setDiscIndex(0);
      }, 200);
    }
  }, [open]);

  const processFile = useCallback(async (selected: File) => {
    setFile(selected);
    setParsing(true);

    try {
      const text = await selected.text();
      const parsed: ParsedContact[] = parseVCardFile(text);

      if (parsed.length === 0) {
        toast.error('No Contacts Found', 'The file does not contain any valid vCard entries.');
        setParsing(false);
        setFile(null);
        return;
      }

      // Fetch existing contacts for deduplication
      let existingContacts: ExistingContact[] = [];
      try {
        const res = await fetch('/api/contacts?limit=100');
        if (res.ok) {
          const json = await res.json();
          existingContacts = (json.contacts || []).map((c: Record<string, string>) => ({
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            phone: c.phone,
            email: c.email,
          }));

          // If there are more, fetch additional pages
          const total = json.pagination?.total || 0;
          if (total > 100) {
            const pages = Math.ceil(total / 100);
            for (let p = 2; p <= pages; p++) {
              const pageRes = await fetch(`/api/contacts?limit=100&page=${p}`);
              if (pageRes.ok) {
                const pageJson = await pageRes.json();
                const pageContacts = (pageJson.contacts || []).map((c: Record<string, string>) => ({
                  id: c.id,
                  first_name: c.first_name,
                  last_name: c.last_name,
                  phone: c.phone,
                  email: c.email,
                }));
                existingContacts = existingContacts.concat(pageContacts);
              }
            }
          }
        }
      } catch {
        // Continue without dedup if fetch fails
      }

      const result = classifyContacts(parsed, existingContacts);
      setClassification(result);
      setStep('review');
    } catch {
      toast.error('Parse Error', 'Failed to parse the vCard file. Please check the file format.');
      setFile(null);
    } finally {
      setParsing(false);
    }
  }, [toast]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith('.vcf') || dropped.type === 'text/vcard')) {
      processFile(dropped);
    } else {
      toast.warning('Invalid File', 'Please upload a .vcf file.');
    }
  }, [processFile, toast]);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  }, [processFile]);

  const toggleContactSelection = useCallback((idx: number) => {
    if (!classification) return;
    setClassification((prev) => {
      if (!prev) return prev;
      const updated = [...prev.people];
      updated[idx] = { ...updated[idx], _selected: !updated[idx]._selected };
      return { ...prev, people: updated };
    });
  }, [classification]);

  const selectAll = useCallback((selected: boolean) => {
    if (!classification) return;
    setClassification((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        people: prev.people.map((c) => ({ ...c, _selected: selected })),
      };
    });
  }, [classification]);

  const moveToImport = useCallback((contact: ClassifiedContact, sourceList: 'businesses' | 'insufficient' | 'duplicates') => {
    if (!classification) return;
    setClassification((prev) => {
      if (!prev) return prev;
      const movedContact = { ...contact, _selected: true, filter_reason: undefined };
      return {
        ...prev,
        people: [...prev.people, movedContact],
        [sourceList]: prev[sourceList].filter((c) => c !== contact),
      };
    });
  }, [classification]);

  const selectedCount = classification?.people.filter((c) => c._selected).length ?? 0;

  const handleProceedToLanguage = useCallback(() => {
    if (!classification) return;
    const selected = classification.people.filter((c) => c._selected);
    if (selected.length === 0) {
      toast.warning('No Contacts Selected', 'Please select at least one contact to import.');
      return;
    }
    // Build enhanced contacts with tier + language detection
    const enhanced: EnhancedContact[] = selected.map((c) => ({
      ...c,
      tier: assignTier(c),
      is_spanish: isHispanicSurname(c.last_name),
      disc_pick: null,
    }));
    setEnhancedContacts(enhanced);
    const hasSpanish = enhanced.some(c => c.is_spanish);
    setStep(hasSpanish ? 'language' : 'disc');
  }, [classification, toast]);

  const handleProceedToDisc = useCallback(() => {
    setDiscIndex(0);
    setStep('disc');
  }, []);

  const handleImport = useCallback(async () => {
    const toImport = enhancedContacts;
    if (toImport.length === 0) return;
    setStep('progress');
    setImportTotal(toImport.length);
    setImportProgress(0);

    const batchSize = 50;
    let totalImported = 0;
    let totalErrors = 0;

    for (let i = 0; i < toImport.length; i += batchSize) {
      const batch = toImport.slice(i, i + batchSize);

      // Show current contact name
      if (batch[0]) {
        setImportCurrentName(getDisplayName(batch[0]));
      }

      const payload = batch.map((c) => {
        const enhanced = c as EnhancedContact;
        return {
          first_name: c.first_name,
          last_name: c.last_name,
          phone: c.phone,
          email: c.email,
          birthday_month: c.birthday_month,
          birthday_day: c.birthday_day,
          birthday_year: c.birthday_year,
          company: c.company,
          job_title: c.job_title,
          address_line_1: c.address_line_1,
          city: c.city,
          state: c.state,
          zip_code: c.zip_code,
          notes: c.notes,
          import_source: 'iphone_vcf',
          language_preference: enhanced.is_spanish ? 'es' : 'en',
          disc_type: enhanced.disc_pick || undefined,
          next_follow_up_date: enhanced.tier ? getFollowUpDate(enhanced.tier) : undefined,
        };
      });

      try {
        const res = await fetch('/api/contacts/import/vcf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: payload }),
        });

        if (res.ok) {
          const data = await res.json();
          totalImported += data.imported || 0;
          totalErrors += data.errors || 0;
        } else {
          totalErrors += batch.length;
        }
      } catch {
        totalErrors += batch.length;
      }

      setImportProgress(Math.min(i + batch.length, toImport.length));
    }

    // Count contacts with email for AI analysis prompt
    const withEmail = toImport.filter((c) => c.email).length;
    setEmailCount(withEmail);

    setImportResult({ imported: totalImported, errors: totalErrors });
    setStep('complete');
  }, [enhancedContacts, toast]);

  const handleDiscPick = useCallback((disc: 'D' | 'I' | 'S' | 'C' | null) => {
    setEnhancedContacts(prev => {
      const innerCircle = prev.filter(c => c.tier === 'inner_circle');
      if (discIndex < innerCircle.length) {
        const targetId = innerCircle[discIndex].phone + innerCircle[discIndex].first_name;
        return prev.map(c =>
          (c.phone + c.first_name) === targetId ? { ...c, disc_pick: disc } : c
        );
      }
      return prev;
    });
    const innerCircle = enhancedContacts.filter(c => c.tier === 'inner_circle');
    if (discIndex >= innerCircle.length - 1) {
      handleImport();
    } else {
      setDiscIndex(prev => prev + 1);
    }
  }, [discIndex, enhancedContacts, handleImport]);

  const handleClose = useCallback(() => {
    if (step === 'progress') return; // Prevent closing during import
    onClose();
  }, [step, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70"
        onClick={handleClose}
      />

      {/* Positioning wrapper: mobile edge-anchored above nav, desktop centered */}
      <div
        className="absolute inset-x-0 sm:static sm:h-full sm:flex sm:items-center sm:justify-center sm:p-4"
        style={{
          top: 'env(safe-area-inset-top, 0px)',
          bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full h-full sm:h-auto max-w-2xl bg-[var(--lr-depth-1)] sm:rounded-[16px] rounded-t-[16px] border border-gold/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col sm:max-h-[calc(100vh-80px)]"
        >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 pb-3 sticky top-0 z-10 bg-[var(--lr-depth-1)] sm:rounded-t-[16px] rounded-t-[16px] border-b border-gold/10">
          <div className="flex items-center gap-2">
            <Smartphone size={20} className="text-gold" />
            <h2 className="text-lg font-montserrat font-semibold text-white">
              Import iPhone Contacts
            </h2>
          </div>
          {step !== 'progress' && (
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded-md text-white/30 hover:text-white/60 hover:bg-gold/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 scroll-touch">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <UploadStep
                key="upload"
                file={file}
                parsing={parsing}
                dragOver={dragOver}
                showInstructions={showInstructions}
                inputRef={inputRef}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
                onInputChange={handleInputChange}
                onToggleInstructions={() => setShowInstructions(!showInstructions)}
              />
            )}

            {step === 'review' && classification && (
              <ReviewStep
                key="review"
                classification={classification}
                activeTab={activeTab}
                selectedCount={selectedCount}
                onTabChange={setActiveTab}
                onToggleContact={toggleContactSelection}
                onSelectAll={selectAll}
                onMoveToImport={moveToImport}
              />
            )}

            {step === 'language' && (
              <LanguageStep
                key="language"
                contacts={enhancedContacts}
                onToggleLanguage={(idx) => {
                  setEnhancedContacts(prev => prev.map((c, i) => i === idx ? { ...c, is_spanish: !c.is_spanish } : c));
                }}
                onSelectAll={(val) => {
                  setEnhancedContacts(prev => prev.map(c => isHispanicSurname(c.last_name) ? { ...c, is_spanish: val } : c));
                }}
              />
            )}

            {step === 'disc' && (
              <DISCStep
                key="disc"
                contacts={enhancedContacts.filter(c => c.tier === 'inner_circle')}
                currentIndex={discIndex}
                onPick={handleDiscPick}
                onSkipAll={handleImport}
              />
            )}

            {step === 'progress' && (
              <ProgressStep
                key="progress"
                progress={importProgress}
                total={importTotal}
                currentName={importCurrentName}
              />
            )}

            {step === 'complete' && importResult && (
              <CompleteStep
                key="complete"
                result={importResult}
                emailCount={emailCount}
                onClose={() => { onSuccess?.(); onClose(); }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Fixed footer - outside scrollable area, always visible */}
        {step === 'review' && (
          <div className="shrink-0 p-4 sm:px-6 border-t border-gold/10 bg-[var(--lr-depth-1)] sm:rounded-b-[16px]">
            <Button
              variant="accent"
              size="lg"
              className="w-full"
              onClick={handleProceedToLanguage}
              disabled={selectedCount === 0}
            >
              <ArrowRight size={18} />
              Continue with {selectedCount} Contact{selectedCount !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
        {step === 'language' && (
          <div className="shrink-0 p-4 sm:px-6 border-t border-gold/10 bg-[var(--lr-depth-1)] sm:rounded-b-[16px]">
            <Button variant="accent" size="lg" className="w-full" onClick={handleProceedToDisc}>
              <ArrowRight size={18} />
              Continue
            </Button>
          </div>
        )}
        {step === 'complete' && importResult && (
          <div className="shrink-0 p-4 sm:px-6 border-t border-gold/10 bg-[var(--lr-depth-1)] sm:rounded-b-[16px]">
            <Button
              variant="accent"
              size="lg"
              className="w-full"
              onClick={() => { onSuccess?.(); onClose(); }}
            >
              <ArrowRight size={18} />
              View Contacts
            </Button>
          </div>
        )}
        </motion.div>
      </div>
    </div>
  );
}

// ============================================
// Step 1: Upload
// ============================================

interface UploadStepProps {
  file: File | null;
  parsing: boolean;
  dragOver: boolean;
  showInstructions: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onToggleInstructions: () => void;
}

function UploadStep({
  file, parsing, dragOver, showInstructions, inputRef,
  onDrop, onDragOver, onDragLeave, onInputChange, onToggleInstructions,
}: UploadStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-4 sm:p-6 space-y-4"
    >
      <p className="text-sm text-white/60 font-inter text-center">
        Export your contacts from your iPhone as a .vcf file and upload here
      </p>

      {/* Upload Area */}
      {!parsing ? (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-3 p-10 sm:p-12 cursor-pointer
            border-2 border-dashed rounded-[12px] transition-all duration-200
            ${dragOver
              ? 'border-gold bg-gold/5 scale-[1.01]'
              : 'border-gold/30 hover:border-gold/60 hover:bg-gold/5'
            }
          `}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: BRAND.colors.gold20 }}
          >
            <Upload size={24} style={{ color: BRAND.colors.gold }} />
          </div>
          <div className="text-center">
            <p className="font-montserrat font-semibold text-sm text-white">
              {file ? file.name : 'Drop your .vcf file here or tap to browse'}
            </p>
            <p className="font-inter text-xs text-white/40 mt-1">
              Supports .vcf files exported from iPhone Contacts
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".vcf,text/vcard"
            onChange={onInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 p-10 sm:p-12 border-2 border-dashed border-gold/30 rounded-[12px]">
          <Loader2 size={32} className="text-gold animate-spin" />
          <p className="font-montserrat font-semibold text-sm text-white">
            Processing {file?.name}...
          </p>
          <p className="font-inter text-xs text-white/40">
            Parsing contacts and checking for duplicates
          </p>
        </div>
      )}

      {/* Instructions Accordion */}
      <div className="rounded-[8px] border border-gold/15 overflow-hidden">
        <button
          type="button"
          onClick={onToggleInstructions}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-gold/5 transition-colors"
        >
          <span className="font-montserrat font-medium text-sm text-white">
            How to export contacts from iPhone
          </span>
          {showInstructions ? (
            <ChevronUp size={16} className="text-white/40" />
          ) : (
            <ChevronDown size={16} className="text-white/40" />
          )}
        </button>
        <AnimatePresence>
          {showInstructions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ol className="px-4 pb-3 space-y-2 font-inter text-sm text-white/70 list-decimal list-inside">
                <li>Open the <strong>Contacts</strong> app on your iPhone</li>
                <li>Select <strong>All Contacts</strong></li>
                <li>Tap <strong>Share</strong></li>
                <li>Save or send the .vcf file to yourself</li>
                <li>Upload it here</li>
              </ol>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================
// Step 2: Review
// ============================================

interface ReviewStepProps {
  classification: ClassificationResult;
  activeTab: ReviewTab;
  selectedCount: number;
  onTabChange: (tab: ReviewTab) => void;
  onToggleContact: (idx: number) => void;
  onSelectAll: (selected: boolean) => void;
  onMoveToImport: (contact: ClassifiedContact, source: 'businesses' | 'insufficient' | 'duplicates') => void;
}

function ReviewStep({
  classification, activeTab, selectedCount,
  onTabChange, onToggleContact, onSelectAll, onMoveToImport,
}: ReviewStepProps) {
  const { people, businesses, duplicates, insufficient } = classification;
  const filteredCount = businesses.length + insufficient.length;
  const allSelected = people.length > 0 && people.every((c) => c._selected);

  const tabs: Array<{ id: ReviewTab; label: string; count: number }> = [
    { id: 'ready', label: 'Ready to Import', count: people.length },
    { id: 'filtered', label: 'Filtered', count: filteredCount },
    { id: 'duplicates', label: 'Duplicates', count: duplicates.length },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col"
    >
      {/* Stats Bar */}
      <div className="flex flex-wrap gap-2 px-4 sm:px-6 py-3 border-b border-gold/10">
        <StatBadge
          count={people.length}
          label="people ready"
          color="text-green-600"
          bgColor="bg-green-500/10"
        />
        <StatBadge
          count={businesses.length}
          label="businesses filtered"
          color="text-white/50"
          bgColor="bg-white/5"
        />
        <StatBadge
          count={duplicates.length}
          label="duplicates found"
          color="text-gold"
          bgColor="bg-gold/10"
        />
        <StatBadge
          count={insufficient.length}
          label="insufficient data"
          color="text-white/40"
          bgColor="bg-white/5"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 sm:px-6 py-2 overflow-x-auto scrollbar-hide border-b border-gold/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`
              px-3 py-1.5 rounded-[8px] text-xs font-montserrat font-medium whitespace-nowrap
              transition-all duration-200
              ${activeTab === tab.id
                ? 'bg-navy text-gold'
                : 'text-white/60 hover:bg-gold/10'
              }
            `}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto max-h-[50vh] sm:max-h-[45vh]">
        {activeTab === 'ready' && (
          <div className="px-4 sm:px-6 py-2">
            {people.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => onSelectAll(!allSelected)}
                  className="text-xs font-montserrat font-medium text-gold hover:underline"
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-xs font-inter text-white/40">
                  {selectedCount} selected
                </span>
              </div>
            )}
            <div className="space-y-1">
              {people.map((contact, idx) => (
                <ContactRow
                  key={`${contact.full_name}-${contact.phone}-${idx}`}
                  contact={contact}
                  selected={contact._selected}
                  onToggle={() => onToggleContact(idx)}
                />
              ))}
              {people.length === 0 && (
                <EmptyTabMessage message="No contacts ready to import. Check the Filtered and Duplicates tabs." />
              )}
            </div>
          </div>
        )}

        {activeTab === 'filtered' && (
          <div className="px-4 sm:px-6 py-2 space-y-1">
            {businesses.map((contact, idx) => (
              <FilteredRow
                key={`biz-${idx}`}
                contact={contact}
                reason={contact.filter_reason || 'Business entry'}
                onImportAnyway={() => onMoveToImport(contact, 'businesses')}
              />
            ))}
            {insufficient.map((contact, idx) => (
              <FilteredRow
                key={`ins-${idx}`}
                contact={contact}
                reason={contact.filter_reason || 'Insufficient data'}
                onImportAnyway={() => onMoveToImport(contact, 'insufficient')}
              />
            ))}
            {businesses.length === 0 && insufficient.length === 0 && (
              <EmptyTabMessage message="No contacts were filtered out." />
            )}
          </div>
        )}

        {activeTab === 'duplicates' && (
          <div className="px-4 sm:px-6 py-2 space-y-1">
            {duplicates.map((contact, idx) => (
              <DuplicateRow
                key={`dup-${idx}`}
                contact={contact}
                onImportAsNew={() => onMoveToImport(contact, 'duplicates')}
              />
            ))}
            {duplicates.length === 0 && (
              <EmptyTabMessage message="No duplicate contacts found." />
            )}
          </div>
        )}
      </div>

    </motion.div>
  );
}

function StatBadge({ count, label, color, bgColor }: { count: number; label: string; color: string; bgColor: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-montserrat font-medium ${color} ${bgColor}`}>
      {count} {label}
    </span>
  );
}

function ContactRow({ contact, selected, onToggle }: { contact: ClassifiedContact; selected: boolean; onToggle: () => void }) {
  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-[8px] transition-colors cursor-pointer ${
        selected ? 'bg-gold/5' : 'hover:bg-white/5'
      }`}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <div
        className={`w-[44px] h-[44px] sm:w-5 sm:h-5 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
          selected
            ? 'bg-gold border-gold'
            : 'border-white/20'
        }`}
      >
        {selected && <Check size={14} className="text-navy" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-montserrat font-semibold text-white truncate">
            {getDisplayName(contact)}
          </span>
          {contact.company && (
            <span className="text-[10px] text-white/40 font-inter truncate hidden sm:inline">
              {contact.company}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {contact.phone && (
            <span className="text-xs text-white/50 font-inter">
              {formatDisplayPhone(contact.phone)}
            </span>
          )}
          {contact.email && (
            <span className="text-xs text-white/50 font-inter truncate hidden sm:inline">
              {contact.email}
            </span>
          )}
        </div>
      </div>

      {/* Birthday */}
      {contact.birthday_month && contact.birthday_day && (
        <span className="flex items-center gap-1 text-xs text-white/50 font-inter flex-shrink-0">
          <Cake size={12} />
          {MONTH_NAMES[contact.birthday_month]} {contact.birthday_day}
        </span>
      )}
    </div>
  );
}

function FilteredRow({ contact, reason, onImportAnyway }: { contact: ClassifiedContact; reason: string; onImportAnyway: () => void }) {
  const name = contact.full_name || contact.company || 'Unknown';
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-[8px] hover:bg-white/5">
      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
        <Building2 size={14} className="text-white/30" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-montserrat font-medium text-white/70 truncate block">
          {name}
        </span>
        <span className="text-xs text-white/40 font-inter">{reason}</span>
      </div>
      <button
        type="button"
        onClick={onImportAnyway}
        className="text-xs font-montserrat font-medium text-gold hover:underline flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        Import Anyway
      </button>
    </div>
  );
}

function DuplicateRow({ contact, onImportAsNew }: { contact: ClassifiedContact; onImportAsNew: () => void }) {
  const match = contact.duplicate_match;
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-[8px] hover:bg-white/5">
      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
        <Copy size={14} className="text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-montserrat font-medium text-white truncate block">
          {getDisplayName(contact)}
        </span>
        {match && (
          <span className="text-xs text-white/40 font-inter">
            Matches {match.existing_name} by {match.match_type}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onImportAsNew}
        className="text-xs font-montserrat font-medium text-gold hover:underline flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        Import as New
      </button>
    </div>
  );
}

function EmptyTabMessage({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <AlertCircle size={24} className="text-white/20 mb-2" />
      <p className="text-sm text-white/40 font-inter">{message}</p>
    </div>
  );
}

// ============================================
// Step 3: Progress
// ============================================

function ProgressStep({ progress, total, currentName }: { progress: number; total: number; currentName: string }) {
  const pct = total > 0 ? (progress / total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 sm:p-8 flex flex-col items-center justify-center gap-4"
    >
      <Loader2 size={40} className="text-gold animate-spin" />

      <div className="text-center">
        <p className="font-montserrat font-semibold text-white">
          Importing Contacts
        </p>
        <p className="text-sm text-white/50 font-inter mt-1">
          {progress} of {total}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-sm h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: BRAND.colors.gold }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {currentName && (
        <p className="text-xs text-white/40 font-inter truncate max-w-xs">
          {currentName}
        </p>
      )}
    </motion.div>
  );
}

// ============================================
// Step 4: Complete
// ============================================

function CompleteStep({ result, emailCount, onClose }: { result: { imported: number; errors: number }; emailCount: number; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 sm:p-8 flex flex-col items-center justify-center gap-4"
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ backgroundColor: BRAND.colors.gold20 }}
      >
        <CheckCircle2 size={32} style={{ color: BRAND.colors.gold }} />
      </div>

      <div className="text-center">
        <h3 className="text-xl font-montserrat font-semibold text-white">
          Imported {result.imported} Contact{result.imported !== 1 ? 's' : ''}
        </h3>
        {result.errors > 0 && (
          <p className="text-sm text-red-500 font-inter mt-1">
            {result.errors} contact{result.errors !== 1 ? 's' : ''} had errors
          </p>
        )}
      </div>

      {/* AI Analysis Prompt */}
      {emailCount > 0 && (
        <div
          className="w-full rounded-[12px] p-4 border"
          style={{
            backgroundColor: BRAND.colors.gold15,
            borderColor: BRAND.colors.gold,
          }}
        >
          <div className="flex items-start gap-3">
            <Sparkles size={20} style={{ color: BRAND.colors.gold }} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-montserrat font-semibold text-white">
                {emailCount} contact{emailCount !== 1 ? 's' : ''} {emailCount !== 1 ? 'have' : 'has'} enough data for AI personality analysis
              </p>
              <p className="text-xs text-white/60 font-inter mt-1">
                Run it now to get DISC profiles and communication tips
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => {
                    fetch('/api/ai/enrich-all', { method: 'POST' }).catch(() => {});
                    onClose();
                  }}
                >
                  <Sparkles size={14} />
                  Analyze All
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Later
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
}

// ============================================
// Language Detection Step
// ============================================

function LanguageStep({
  contacts,
  onToggleLanguage,
  onSelectAll,
}: {
  contacts: EnhancedContact[];
  onToggleLanguage: (idx: number) => void;
  onSelectAll: (val: boolean) => void;
}) {
  const spanishContacts = contacts
    .map((c, i) => ({ contact: c, originalIndex: i }))
    .filter(({ contact }) => isHispanicSurname(contact.last_name));

  const spanishCount = contacts.filter(c => c.is_spanish).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-4 sm:p-6"
    >
      <h3 className="text-lg font-playfair font-bold text-white mb-1">
        Spanish-speaking contacts
      </h3>
      <p className="text-sm text-white/60 font-inter mb-4">
        {spanishContacts.length} contacts with Hispanic surnames detected. {spanishCount} marked as Spanish.
      </p>

      {spanishContacts.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => onSelectAll(true)}
            className="text-xs font-montserrat font-medium text-gold hover:underline"
          >
            Select All
          </button>
          <span className="text-white/20">|</span>
          <button
            type="button"
            onClick={() => onSelectAll(false)}
            className="text-xs font-montserrat font-medium text-white/50 hover:underline"
          >
            Clear All
          </button>
        </div>
      )}

      <div className="space-y-1 max-h-[40vh] overflow-y-auto">
        {spanishContacts.map(({ contact, originalIndex }) => (
          <div
            key={originalIndex}
            className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-gold/5 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-montserrat font-semibold text-white truncate">
                {getDisplayName(contact)}
              </p>
              {contact.phone && (
                <p className="text-xs text-white/50 font-inter">
                  {formatDisplayPhone(contact.phone)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onToggleLanguage(originalIndex)}
              className={`px-3 py-1.5 rounded-full text-xs font-montserrat font-semibold min-w-[80px] text-center transition-colors ${
                contact.is_spanish
                  ? 'bg-gold/10 text-gold'
                  : 'bg-white/5 text-white/40'
              }`}
            >
              {contact.is_spanish ? 'Spanish' : 'English'}
            </button>
          </div>
        ))}
        {spanishContacts.length === 0 && (
          <p className="text-sm text-white/40 font-inter text-center py-8">
            No Hispanic surnames detected. You can skip this step.
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// DISC Quick-Pick Step
// ============================================

function DISCStep({
  contacts,
  currentIndex,
  onPick,
  onSkipAll,
}: {
  contacts: EnhancedContact[];
  currentIndex: number;
  onPick: (disc: 'D' | 'I' | 'S' | 'C' | null) => void;
  onSkipAll: () => void;
}) {
  if (contacts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 sm:p-8 flex flex-col items-center justify-center gap-4"
      >
        <p className="text-sm text-white/50 font-inter">
          No Inner Circle contacts to tag.
        </p>
        <Button variant="accent" onClick={onSkipAll}>
          Continue to Import
        </Button>
      </motion.div>
    );
  }

  const contact = contacts[currentIndex];
  if (!contact) {
    // All done
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 sm:p-8 flex flex-col items-center justify-center gap-4"
      >
        <CheckCircle2 size={32} className="text-gold" />
        <p className="font-montserrat font-semibold text-white">All tagged.</p>
        <Button variant="accent" onClick={onSkipAll}>
          Continue to Import
        </Button>
      </motion.div>
    );
  }

  const progress = ((currentIndex + 1) / contacts.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-4 sm:p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-playfair font-bold text-white">
            Tag your top contacts
          </h3>
          <p className="text-xs text-white/50 font-inter mt-0.5">
            Skip anyone you are not sure about
          </p>
        </div>
        <button
          type="button"
          onClick={onSkipAll}
          className="text-xs font-montserrat font-medium text-white/50 hover:text-gold transition-colors"
        >
          Skip All
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
        <div
          className="h-full rounded-full bg-gold transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Contact card */}
      <div className="rounded-2xl bg-navy/30 border border-gold/15 p-5 text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-navy mx-auto flex items-center justify-center mb-3">
          <span className="text-lg font-montserrat font-bold text-gold">
            {contact.first_name?.[0]?.toUpperCase() || '?'}{contact.last_name?.[0]?.toUpperCase() || ''}
          </span>
        </div>
        <p className="font-montserrat font-semibold text-white">
          {getDisplayName(contact)}
        </p>
        {contact.phone && (
          <p className="text-xs text-white/50 font-inter mt-1">
            {formatDisplayPhone(contact.phone)}
          </p>
        )}
        <span className="inline-block mt-2 text-[10px] font-montserrat font-semibold uppercase px-2.5 py-1 rounded-full bg-gold/10 text-gold">
          Inner Circle
        </span>
      </div>

      {/* DISC Buttons */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {([
          { disc: 'D' as const, color: '#c0392b', label: 'Dominant' },
          { disc: 'I' as const, color: '#d3a971', label: 'Influencing' },
          { disc: 'S' as const, color: '#27ae60', label: 'Stabilizing' },
          { disc: 'C' as const, color: '#2980b9', label: 'Cautious' },
        ]).map(({ disc, color, label }) => (
          <button
            key={disc}
            type="button"
            onClick={() => onPick(disc)}
            className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 hover:shadow-md active:scale-[0.97] transition-all min-h-[70px]"
            style={{ borderColor: color + '40' }}
          >
            <span className="text-xl font-montserrat font-bold" style={{ color }}>
              {disc}
            </span>
            <span className="text-[9px] font-montserrat font-medium text-white/60">
              {label}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onPick(null)}
        className="w-full text-center py-2.5 text-sm font-montserrat font-medium text-white/40 hover:text-white transition-colors"
      >
        Skip
      </button>

      <p className="text-center text-[10px] text-white/30 font-inter mt-2">
        {currentIndex + 1} of {contacts.length}
      </p>
    </motion.div>
  );
}

/**
 * Format a normalized 10-digit phone for display.
 */
function formatDisplayPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}
