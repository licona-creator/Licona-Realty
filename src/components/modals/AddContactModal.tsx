'use client';

import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import type { TrackType, PipelineStage } from '@/types/database';

interface AddContactModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TRACK_TYPE_OPTIONS: { value: TrackType; label: string }[] = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'seller', label: 'Seller' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'investor', label: 'Investor' },
  { value: 'sphere', label: 'Sphere' },
];

const PIPELINE_STAGES_BY_TRACK: Record<TrackType, { value: PipelineStage; label: string }[]> = {
  buyer: [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualifying', label: 'Qualifying' },
    { value: 'nurturing', label: 'Nurturing' },
    { value: 'showing', label: 'Showing' },
    { value: 'offer', label: 'Offer' },
    { value: 'under_contract', label: 'Under Contract' },
    { value: 'closing', label: 'Closing' },
    { value: 'closed', label: 'Closed' },
    { value: 'lost', label: 'Lost' },
    { value: 'on_hold', label: 'On Hold' },
  ],
  seller: [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualifying', label: 'Qualifying' },
    { value: 'nurturing', label: 'Nurturing' },
    { value: 'under_contract', label: 'Under Contract' },
    { value: 'closing', label: 'Closing' },
    { value: 'closed', label: 'Closed' },
    { value: 'lost', label: 'Lost' },
    { value: 'on_hold', label: 'On Hold' },
  ],
  landlord: [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualifying', label: 'Qualifying' },
    { value: 'nurturing', label: 'Nurturing' },
    { value: 'under_contract', label: 'Under Contract' },
    { value: 'closed', label: 'Closed' },
    { value: 'lost', label: 'Lost' },
    { value: 'on_hold', label: 'On Hold' },
  ],
  tenant: [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualifying', label: 'Qualifying' },
    { value: 'nurturing', label: 'Nurturing' },
    { value: 'showing', label: 'Showing' },
    { value: 'under_contract', label: 'Under Contract' },
    { value: 'closed', label: 'Closed' },
    { value: 'lost', label: 'Lost' },
    { value: 'on_hold', label: 'On Hold' },
  ],
  investor: [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualifying', label: 'Qualifying' },
    { value: 'nurturing', label: 'Nurturing' },
    { value: 'offer', label: 'Offer' },
    { value: 'under_contract', label: 'Under Contract' },
    { value: 'closing', label: 'Closing' },
    { value: 'closed', label: 'Closed' },
    { value: 'lost', label: 'Lost' },
    { value: 'on_hold', label: 'On Hold' },
  ],
  sphere: [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'nurturing', label: 'Nurturing' },
    { value: 'closed', label: 'Closed' },
    { value: 'on_hold', label: 'On Hold' },
  ],
};

const LEAD_SOURCES = [
  { value: '', label: 'Select source...' },
  { value: 'qazzoo', label: 'Qazzoo' },
  { value: 'referral', label: 'Referral' },
  { value: 'social media', label: 'Social Media' },
  { value: 'website', label: 'Website' },
  { value: 'sphere', label: 'Sphere' },
  { value: 'other', label: 'Other' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'bilingual', label: 'Bilingual' },
];

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  track_type: TrackType;
  pipeline_stage: PipelineStage;
  address_line_1: string;
  city: string;
  state: string;
  zip_code: string;
  budget: string;
  location_preference: string;
  lead_source: string;
  language_preference: string;
  notes: string;
}

const INITIAL_FORM: FormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  track_type: 'buyer',
  pipeline_stage: 'new',
  address_line_1: '',
  city: '',
  state: '',
  zip_code: '',
  budget: '',
  location_preference: '',
  lead_source: '',
  language_preference: 'en',
  notes: '',
};

const selectClassName = `
  w-full px-4 py-2.5 rounded-[8px]
  bg-white dark:bg-dark-card
  border border-gold/15
  text-navy dark:text-white
  font-inter text-sm
  focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
  transition-all duration-200 ease-in-out
  disabled:opacity-50 disabled:cursor-not-allowed
  appearance-none
`.replace(/\n\s+/g, ' ').trim();

export function AddContactModal({ open, onClose, onSuccess }: AddContactModalProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const availableStages = PIPELINE_STAGES_BY_TRACK[form.track_type];

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function handleTrackTypeChange(value: TrackType) {
    const stages = PIPELINE_STAGES_BY_TRACK[value];
    const currentStageValid = stages.some(s => s.value === form.pipeline_stage);
    setForm(prev => ({
      ...prev,
      track_type: value,
      pipeline_stage: currentStageValid ? prev.pipeline_stage : 'new',
    }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!form.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setErrors({});
  }

  function handleClose() {
    if (!loading) {
      resetForm();
      onClose();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          track_type: form.track_type,
          pipeline_stage: form.pipeline_stage,
          address_line_1: form.address_line_1.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          zip_code: form.zip_code.trim() || null,
          budget: form.budget.trim() || null,
          location_preference: form.location_preference.trim() || null,
          lead_source: form.lead_source || null,
          language_preference: form.language_preference || 'en',
          notes: form.notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to create contact (${res.status})`);
      }

      toast.success('Contact created', `${form.first_name} ${form.last_name} has been added.`);
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(
        'Error creating contact',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Contact" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name *"
            placeholder="First name"
            value={form.first_name}
            onChange={e => updateField('first_name', e.target.value)}
            error={errors.first_name}
            disabled={loading}
          />
          <Input
            label="Last Name *"
            placeholder="Last name"
            value={form.last_name}
            onChange={e => updateField('last_name', e.target.value)}
            error={errors.last_name}
            disabled={loading}
          />
        </div>

        {/* Email & Phone row */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Email"
            type="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={e => updateField('email', e.target.value)}
            error={errors.email}
            disabled={loading}
          />
          <Input
            label="Phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={form.phone}
            onChange={e => updateField('phone', e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Track Type & Pipeline Stage */}
        <div className="grid grid-cols-2 gap-3">
          <div className="w-full">
            <label
              htmlFor="track-type"
              className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5"
            >
              Track Type
            </label>
            <select
              id="track-type"
              value={form.track_type}
              onChange={e => handleTrackTypeChange(e.target.value as TrackType)}
              className={selectClassName}
              disabled={loading}
            >
              {TRACK_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full">
            <label
              htmlFor="pipeline-stage"
              className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5"
            >
              Pipeline Stage
            </label>
            <select
              id="pipeline-stage"
              value={form.pipeline_stage}
              onChange={e => updateField('pipeline_stage', e.target.value as PipelineStage)}
              className={selectClassName}
              disabled={loading}
            >
              {availableStages.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Budget & Location Preference */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Budget / Price Range"
            placeholder="$300k - $450k"
            value={form.budget}
            onChange={e => updateField('budget', e.target.value)}
            disabled={loading}
          />
          <Input
            label="Location Preference"
            placeholder="Denton County, Park Cities"
            value={form.location_preference}
            onChange={e => updateField('location_preference', e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Lead Source & Language */}
        <div className="grid grid-cols-2 gap-3">
          <div className="w-full">
            <label
              htmlFor="lead-source"
              className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5"
            >
              Lead Source
            </label>
            <select
              id="lead-source"
              value={form.lead_source}
              onChange={e => updateField('lead_source', e.target.value)}
              className={selectClassName}
              disabled={loading}
            >
              {LEAD_SOURCES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="w-full">
            <label
              htmlFor="language-pref"
              className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5"
            >
              Language
            </label>
            <select
              id="language-pref"
              value={form.language_preference}
              onChange={e => updateField('language_preference', e.target.value)}
              className={selectClassName}
              disabled={loading}
            >
              {LANGUAGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Address */}
        <Input
          label="Address"
          placeholder="Street address"
          value={form.address_line_1}
          onChange={e => updateField('address_line_1', e.target.value)}
          disabled={loading}
        />

        {/* City, State, Zip row */}
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3">
            <Input
              label="City"
              placeholder="City"
              value={form.city}
              onChange={e => updateField('city', e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="col-span-1">
            <Input
              label="State"
              placeholder="TX"
              value={form.state}
              onChange={e => updateField('state', e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="col-span-2">
            <Input
              label="Zip"
              placeholder="75001"
              value={form.zip_code}
              onChange={e => updateField('zip_code', e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="w-full">
          <label
            htmlFor="contact-notes"
            className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5"
          >
            Notes
          </label>
          <textarea
            id="contact-notes"
            rows={3}
            placeholder="Additional notes..."
            value={form.notes}
            onChange={e => updateField('notes', e.target.value)}
            disabled={loading}
            className={`
              w-full px-4 py-2.5 rounded-[8px]
              bg-white dark:bg-dark-card
              border border-gold/15
              text-navy dark:text-white
              font-inter text-sm
              placeholder:text-navy/40 dark:placeholder:text-white/40
              focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
              transition-all duration-200 ease-in-out
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-none
            `}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="accent" loading={loading}>
            {loading ? 'Adding...' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
