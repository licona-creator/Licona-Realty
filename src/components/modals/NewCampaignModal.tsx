'use client';

import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import type { TrackType, CampaignTone } from '@/types/database';

interface NewCampaignModalProps {
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
];

const TONE_OPTIONS: { value: CampaignTone; label: string }[] = [
  { value: 'warm_relationship', label: 'Warm Relationship' },
  { value: 'direct_action', label: 'Direct Action' },
  { value: 'educational', label: 'Educational' },
  { value: 'soft_touch', label: 'Soft Touch' },
  { value: 'high_frequency', label: 'High Frequency' },
  { value: 'bilingual_mixed', label: 'Bilingual Mixed' },
  { value: 'bilingual_professional', label: 'Bilingual Professional' },
  { value: 'investor_analytical', label: 'Investor Analytical' },
  { value: 'empathetic', label: 'Empathetic' },
  { value: 'celebratory', label: 'Celebratory' },
];

const selectClasses = `
  w-full px-4 py-2.5 rounded-[8px]
  bg-[var(--lr-depth-1)]
  border border-gold/15
  text-white
  font-inter text-sm
  focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
  transition-all duration-200 ease-in-out
  disabled:opacity-50 disabled:cursor-not-allowed
  appearance-none
`.trim();

const textareaClasses = `
  w-full px-4 py-2.5 rounded-[8px]
  bg-[var(--lr-depth-1)]
  border border-gold/15
  text-white
  font-inter text-sm
  placeholder:text-white/40
  focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
  transition-all duration-200 ease-in-out
  disabled:opacity-50 disabled:cursor-not-allowed
  resize-none
`.trim();

export function NewCampaignModal({ open, onClose, onSuccess }: NewCampaignModalProps) {
  const toast = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trackType, setTrackType] = useState<TrackType>('buyer');
  const [tone, setTone] = useState<CampaignTone>('warm_relationship');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  function resetForm() {
    setName('');
    setDescription('');
    setTrackType('buyer');
    setTone('warm_relationship');
    setIsActive(true);
    setNameError('');
  }

  function handleClose() {
    if (!loading) {
      resetForm();
      onClose();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Validate
    if (!name.trim()) {
      setNameError('Campaign name is required');
      return;
    }
    setNameError('');

    setLoading(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          track_type: trackType,
          tone,
          is_active: isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to create campaign');
      }

      toast.success('Campaign created', `"${name.trim()}" has been created successfully.`);
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error('Failed to create campaign', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Campaign"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="new-campaign-form" variant="accent" loading={loading}>
            {loading ? 'Creating...' : 'Create Campaign'}
          </Button>
        </div>
      }
    >
      <form id="new-campaign-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Campaign Name */}
        <Input
          label="Campaign Name"
          placeholder="e.g. Spring Buyer Nurture"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError('');
          }}
          error={nameError}
          disabled={loading}
          required
        />

        {/* Description */}
        <div className="w-full">
          <label
            htmlFor="campaign-description"
            className="block text-sm font-montserrat font-medium text-white mb-1.5"
          >
            Description
          </label>
          <textarea
            id="campaign-description"
            rows={3}
            placeholder="Briefly describe the campaign purpose..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            className={textareaClasses}
          />
        </div>

        {/* Track Type */}
        <div className="w-full">
          <label
            htmlFor="campaign-track-type"
            className="block text-sm font-montserrat font-medium text-white mb-1.5"
          >
            Track Type
          </label>
          <select
            id="campaign-track-type"
            value={trackType}
            onChange={(e) => setTrackType(e.target.value as TrackType)}
            disabled={loading}
            className={selectClasses}
          >
            {TRACK_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tone */}
        <div className="w-full">
          <label
            htmlFor="campaign-tone"
            className="block text-sm font-montserrat font-medium text-white mb-1.5"
          >
            Tone
          </label>
          <select
            id="campaign-tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as CampaignTone)}
            disabled={loading}
            className={selectClasses}
          >
            {TONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Is Active Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive((prev) => !prev)}
            disabled={loading}
            className={`
              relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
              border-2 border-transparent transition-colors duration-200 ease-in-out
              focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isActive ? 'bg-gold' : 'bg-white/20'}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm
                ring-0 transition-transform duration-200 ease-in-out
                ${isActive ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
          <label className="text-sm font-montserrat font-medium text-white">
            Active
          </label>
        </div>

      </form>
    </Modal>
  );
}
