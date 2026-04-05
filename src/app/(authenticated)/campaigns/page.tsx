/**
 * Campaigns Page
 *
 * Campaign template system with enrollment management.
 * Uses campaign_templates table with messages jsonb field.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { BRAND } from '@/lib/brand';
import { useToast } from '@/components/ui/Toast';
import {
  Send, Plus, Users, MessageSquare, ChevronDown, ChevronUp,
  Play, Pause, Square, Trash2, UserPlus, ArrowLeft,
} from 'lucide-react';
import { getDisplayName } from '@/lib/format';

// ============================================
// Interfaces
// ============================================

interface CampaignMessage {
  day: number;
  type: 'text';
  content: string;
}

interface CampaignTemplate {
  id: string;
  name: string;
  track_type: string;
  description: string | null;
  status: string;
  messages: CampaignMessage[];
  enrolled_count: number;
  created_at: string;
}

interface Enrollment {
  id: string;
  contact_id: string;
  contact_name: string;
  status: string;
  current_step: number;
  next_message_date: string | null;
  created_at: string;
}

interface CampaignDetail extends CampaignTemplate {
  enrollments: Enrollment[];
}

interface ContactOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

// ============================================
// Constants
// ============================================

const TRACK_COLORS: Record<string, string> = {
  buyer: '#3B82F6',
  seller: '#22C55E',
  investor: BRAND.colors.accent,
};

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'navy'> = {
  active: 'success',
  paused: 'warning',
  archived: 'navy',
};

const VARIABLE_PLACEHOLDERS = [
  '{first_name}',
  '{location_preference}',
  '{budget}',
];

// ============================================
// Main Component
// ============================================

export default function CampaignsPage() {
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetail | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);

  // ---- Fetch campaigns ----
  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch {
      // empty state on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // ---- Fetch campaign detail ----
  const openCampaignDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCampaign(data.campaign);
      } else {
        toast.error('Failed to load campaign details');
      }
    } catch {
      toast.error('Failed to load campaign details');
    }
  }, [toast]);

  // ---- Go back to list ----
  const backToList = useCallback(() => {
    setSelectedCampaign(null);
    fetchCampaigns();
  }, [fetchCampaigns]);

  // ============================================
  // Detail View
  // ============================================
  if (selectedCampaign) {
    return (
      <CampaignDetailView
        campaign={selectedCampaign}
        onBack={backToList}
        onRefresh={() => openCampaignDetail(selectedCampaign.id)}
        showContactPicker={showContactPicker}
        setShowContactPicker={setShowContactPicker}
      />
    );
  }

  // ============================================
  // List View
  // ============================================
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Send size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Campaigns
          </h1>
        </div>
        <Button variant="accent" size="sm" onClick={() => setShowNewModal(true)}>
          <Plus size={16} className="mr-1" />
          New Campaign
        </Button>
      </div>

      {/* Campaign Cards */}
      {!loading && campaigns.length > 0 ? (
        <div className="space-y-4">
          {campaigns.map(campaign => {
            const color = TRACK_COLORS[campaign.track_type] || BRAND.colors.accent;
            const messageCount = (campaign.messages || []).length;

            return (
              <Card
                key={campaign.id}
                className="!p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openCampaignDetail(campaign.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <h3 className="font-montserrat font-semibold text-navy dark:text-white truncate">
                        {campaign.name}
                      </h3>
                    </div>
                    {campaign.description && (
                      <p className="text-xs text-navy/50 dark:text-white/50 font-inter line-clamp-2">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANTS[campaign.status] || 'navy'}>
                    {campaign.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-xs font-inter text-navy/60 dark:text-white/60 flex items-center gap-1 capitalize">
                    <Users size={10} /> {campaign.track_type}
                  </span>
                  <span className="text-xs font-inter text-navy/60 dark:text-white/60 flex items-center gap-1">
                    <Users size={10} /> {campaign.enrolled_count} enrolled
                  </span>
                  <span className="text-xs font-inter text-navy/60 dark:text-white/60 flex items-center gap-1">
                    <MessageSquare size={10} /> {messageCount} message{messageCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : !loading ? (
        <Card className="!p-8 text-center">
          <Send size={40} className="text-gold mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-montserrat font-semibold text-navy dark:text-white mb-2">
            Campaign Library
          </h2>
          <p className="text-sm text-navy/50 dark:text-white/50 font-inter max-w-md mx-auto mb-4">
            Create drip campaign sequences with text message steps.
            Use variable placeholders to personalize each message.
          </p>
          <Button variant="accent" onClick={() => setShowNewModal(true)}>
            <Plus size={16} className="mr-1" />
            Create Your First Campaign
          </Button>
        </Card>
      ) : null}

      {/* New Campaign Modal */}
      <NewCampaignModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={() => {
          setShowNewModal(false);
          fetchCampaigns();
        }}
      />
    </div>
  );
}

// ============================================
// Campaign Detail View Component
// ============================================

interface CampaignDetailViewProps {
  campaign: CampaignDetail;
  onBack: () => void;
  onRefresh: () => void;
  showContactPicker: boolean;
  setShowContactPicker: (show: boolean) => void;
}

function CampaignDetailView({
  campaign,
  onBack,
  onRefresh,
  showContactPicker,
  setShowContactPicker,
}: CampaignDetailViewProps) {
  const toast = useToast();
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const messages = (campaign.messages || []) as CampaignMessage[];
  const sortedMessages = [...messages].sort((a, b) => a.day - b.day);

  // ---- Fetch contacts for picker ----
  const fetchContacts = useCallback(async () => {
    setContactsLoading(true);
    try {
      const res = await fetch('/api/contacts?limit=100');
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch {
      toast.error('Failed to load contacts');
    } finally {
      setContactsLoading(false);
    }
  }, [toast]);

  const openContactPicker = useCallback(() => {
    fetchContacts();
    setShowContactPicker(true);
  }, [fetchContacts, setShowContactPicker]);

  // ---- Enroll contact ----
  const enrollContact = useCallback(async (contactId: string) => {
    setEnrolling(true);
    try {
      const res = await fetch('/api/campaigns/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          campaign_template_id: campaign.id,
        }),
      });
      if (res.ok) {
        toast.success('Contact enrolled successfully');
        setShowContactPicker(false);
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to enroll contact');
      }
    } catch {
      toast.error('Failed to enroll contact');
    } finally {
      setEnrolling(false);
    }
  }, [campaign.id, toast, setShowContactPicker, onRefresh]);

  // ---- Update enrollment status ----
  const updateEnrollmentStatus = useCallback(async (enrollmentId: string, status: string) => {
    try {
      const res = await fetch('/api/campaigns/enroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          status,
        }),
      });
      if (res.ok) {
        toast.success(`Enrollment ${status === 'active' ? 'resumed' : status}`);
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update enrollment');
      }
    } catch {
      toast.error('Failed to update enrollment');
    }
  }, [toast, onRefresh]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Back Button + Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gold/10 transition-colors text-navy dark:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1
            className="text-2xl font-semibold text-navy dark:text-white truncate"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            {campaign.name}
          </h1>
          {campaign.description && (
            <p className="text-sm text-navy/50 dark:text-white/50 font-inter mt-1">
              {campaign.description}
            </p>
          )}
        </div>
        <Badge variant={STATUS_VARIANTS[campaign.status] || 'navy'}>
          {campaign.status}
        </Badge>
      </div>

      {/* Message Sequence */}
      <Card className="!p-5 mb-6">
        <h2 className="font-montserrat font-semibold text-navy dark:text-white mb-4 flex items-center gap-2">
          <MessageSquare size={16} className="text-gold" />
          Message Sequence ({sortedMessages.length} step{sortedMessages.length !== 1 ? 's' : ''})
        </h2>
        {sortedMessages.length > 0 ? (
          <div className="space-y-3">
            {sortedMessages.map((msg, i) => (
              <div
                key={i}
                className="border border-gold/15 rounded-lg p-4 bg-surface dark:bg-navy/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-montserrat font-bold text-white"
                    style={{ backgroundColor: BRAND.colors.accent }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs font-montserrat font-medium text-navy/60 dark:text-white/60">
                    Day {msg.day}
                  </span>
                  <Badge variant="navy">Text</Badge>
                </div>
                <p className="text-sm font-inter text-navy dark:text-white whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-navy/50 dark:text-white/50 font-inter">
            No message steps defined.
          </p>
        )}
      </Card>

      {/* Enrolled Contacts */}
      <Card className="!p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-montserrat font-semibold text-navy dark:text-white flex items-center gap-2">
            <Users size={16} className="text-gold" />
            Enrolled Contacts ({campaign.enrollments.length})
          </h2>
          <Button variant="accent" size="sm" onClick={openContactPicker}>
            <UserPlus size={14} className="mr-1" />
            Enroll Contact
          </Button>
        </div>

        {campaign.enrollments.length > 0 ? (
          <div className="space-y-3">
            {campaign.enrollments.map(enrollment => (
              <div
                key={enrollment.id}
                className="flex items-center justify-between p-3 border border-gold/15 rounded-lg bg-surface dark:bg-navy/30 gap-3 flex-wrap"
              >
                <div className="min-w-0">
                  <p className="font-montserrat font-medium text-sm text-navy dark:text-white truncate">
                    {enrollment.contact_name}
                  </p>
                  <p className="text-xs text-navy/50 dark:text-white/50 font-inter">
                    Step {enrollment.current_step} of {sortedMessages.length} - {enrollment.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {enrollment.status === 'active' && (
                    <button
                      onClick={() => updateEnrollmentStatus(enrollment.id, 'paused')}
                      className="p-1.5 rounded-md hover:bg-gold/10 transition-colors text-navy/60 dark:text-white/60"
                      title="Pause"
                    >
                      <Pause size={14} />
                    </button>
                  )}
                  {enrollment.status === 'paused' && (
                    <button
                      onClick={() => updateEnrollmentStatus(enrollment.id, 'active')}
                      className="p-1.5 rounded-md hover:bg-gold/10 transition-colors text-navy/60 dark:text-white/60"
                      title="Resume"
                    >
                      <Play size={14} />
                    </button>
                  )}
                  {enrollment.status !== 'stopped' && (
                    <button
                      onClick={() => updateEnrollmentStatus(enrollment.id, 'stopped')}
                      className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors text-red-500/60"
                      title="Stop"
                    >
                      <Square size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-navy/50 dark:text-white/50 font-inter text-center py-4">
            No contacts enrolled yet.
          </p>
        )}
      </Card>

      {/* Contact Picker Modal */}
      <Modal
        open={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        title="Enroll Contact"
        description="Select a contact to enroll in this campaign."
        size="md"
      >
        {contactsLoading ? (
          <p className="text-sm text-navy/50 dark:text-white/50 font-inter text-center py-4">
            Loading contacts...
          </p>
        ) : contacts.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {contacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => enrollContact(contact.id)}
                disabled={enrolling}
                className="w-full text-left p-3 rounded-lg border border-gold/15 hover:bg-gold/10 transition-colors disabled:opacity-50"
              >
                <p className="font-montserrat font-medium text-sm text-navy dark:text-white">
                  {getDisplayName(contact)}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-navy/50 dark:text-white/50 font-inter text-center py-4">
            No contacts found.
          </p>
        )}
      </Modal>
    </div>
  );
}

// ============================================
// New Campaign Modal Component
// ============================================

interface NewCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function NewCampaignModal({ open, onClose, onSuccess }: NewCampaignModalProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [trackType, setTrackType] = useState('buyer');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<CampaignMessage[]>([
    { day: 0, type: 'text', content: '' },
  ]);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setName('');
      setTrackType('buyer');
      setDescription('');
      setSteps([{ day: 0, type: 'text', content: '' }]);
      setExpandedStep(0);
    }
  }, [open]);

  const addStep = () => {
    const lastDay = steps.length > 0 ? steps[steps.length - 1].day : 0;
    const newStep: CampaignMessage = { day: lastDay + 3, type: 'text', content: '' };
    setSteps(prev => [...prev, newStep]);
    setExpandedStep(steps.length);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(prev => prev.filter((_, i) => i !== index));
    setExpandedStep(null);
  };

  const updateStep = (index: number, field: 'day' | 'content', value: string | number) => {
    setSteps(prev =>
      prev.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    const validSteps = steps.filter(s => s.content.trim());
    if (validSteps.length === 0) {
      toast.error('At least one message step with content is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          track_type: trackType,
          description: description.trim() || null,
          messages: validSteps.map(s => ({
            day: s.day,
            type: 'text' as const,
            content: s.content.trim(),
          })),
        }),
      });

      if (res.ok) {
        toast.success('Campaign created successfully');
        onSuccess();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create campaign');
      }
    } catch {
      toast.error('Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Campaign"
      description="Create a drip campaign with text message steps."
      size="lg"
    >
      <div className="space-y-4">
        {/* Name */}
        <Input
          label="Campaign Name"
          placeholder="e.g. New Buyer Welcome Sequence"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        {/* Track Type */}
        <div>
          <label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">
            Track Type
          </label>
          <select
            value={trackType}
            onChange={e => setTrackType(e.target.value)}
            className="w-full px-4 py-2.5 rounded-[8px] bg-white dark:bg-dark-card border border-gold/15 text-navy dark:text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all duration-200"
          >
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="investor">Investor</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional description of this campaign"
            rows={2}
            className="w-full px-4 py-2.5 rounded-[8px] bg-white dark:bg-dark-card border border-gold/15 text-navy dark:text-white font-inter text-sm placeholder:text-navy/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all duration-200 resize-none"
          />
        </div>

        {/* Message Steps */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-montserrat font-medium text-navy dark:text-white">
              Message Sequence
            </label>
            <Button variant="ghost" size="sm" onClick={addStep}>
              <Plus size={14} className="mr-1" />
              Add Step
            </Button>
          </div>

          <p className="text-xs text-navy/50 dark:text-white/50 font-inter mb-3">
            Variables: {VARIABLE_PLACEHOLDERS.join(', ')}
          </p>

          <div className="space-y-3">
            {steps.map((step, index) => {
              const isExpanded = expandedStep === index;
              return (
                <div
                  key={index}
                  className="border border-gold/15 rounded-lg overflow-hidden bg-surface dark:bg-navy/30"
                >
                  {/* Step Header */}
                  <button
                    type="button"
                    onClick={() => setExpandedStep(isExpanded ? null : index)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gold/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-montserrat font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: BRAND.colors.accent }}
                      >
                        {index + 1}
                      </span>
                      <span className="text-sm font-montserrat font-medium text-navy dark:text-white">
                        Day {step.day} - Text
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            removeStep(index);
                          }}
                          className="p-1 rounded hover:bg-red-500/10 text-red-500/60 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-navy/40 dark:text-white/40" />
                      ) : (
                        <ChevronDown size={16} className="text-navy/40 dark:text-white/40" />
                      )}
                    </div>
                  </button>

                  {/* Step Content */}
                  {isExpanded && (
                    <div className="p-3 pt-0 space-y-3">
                      <div>
                        <label className="block text-xs font-montserrat font-medium text-navy/60 dark:text-white/60 mb-1">
                          Send on Day
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={step.day}
                          onChange={e => updateStep(index, 'day', parseInt(e.target.value, 10) || 0)}
                          className="w-24 px-3 py-2 rounded-[8px] bg-white dark:bg-dark-card border border-gold/15 text-navy dark:text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-montserrat font-medium text-navy/60 dark:text-white/60 mb-1">
                          Message Content
                        </label>
                        <textarea
                          value={step.content}
                          onChange={e => updateStep(index, 'content', e.target.value)}
                          placeholder="Hi {first_name}, I noticed you were looking in {location_preference}..."
                          rows={4}
                          className="w-full px-3 py-2 rounded-[8px] bg-white dark:bg-dark-card border border-gold/15 text-navy dark:text-white font-inter text-sm placeholder:text-navy/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all duration-200 resize-none"
                        />
                        <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter mt-1">
                          Supports: {VARIABLE_PLACEHOLDERS.join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" size="sm" onClick={handleSave} loading={saving}>
            Save Campaign
          </Button>
        </div>
      </div>
    </Modal>
  );
}
