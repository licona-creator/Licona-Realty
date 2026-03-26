'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { BRAND } from '@/lib/brand';
import type { TrackType, PipelineStage } from '@/types/database';
import {
  ArrowLeft, Edit3, Trash2, Phone, Mail, MapPin, DollarSign,
  Tag, Globe, Briefcase, MessageSquare,
} from 'lucide-react';

interface ContactData {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  track_type: TrackType;
  pipeline_stage: PipelineStage;
  lead_source: string | null;
  language_preference: string;
  address_line_1: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  budget: string | null;
  location_preference: string | null;
  notes: string | null;
  lead_score: number;
  created_at: string;
  updated_at: string;
}

interface LinkedTransaction {
  id: string;
  property_address: string;
  status: string;
  contract_price: number | null;
  closing_date: string | null;
}

const TRACK_OPTIONS: { value: TrackType; label: string }[] = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'seller', label: 'Seller' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'investor', label: 'Investor' },
  { value: 'sphere', label: 'Sphere' },
];

const PIPELINE_STAGES: { value: PipelineStage; label: string }[] = [
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
];

const LEAD_SOURCES = ['Qazzoo', 'Referral', 'Social Media', 'Website', 'Sphere', 'Other'];
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'bilingual', label: 'Bilingual' },
];

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-600',
  contacted: 'bg-purple-500/10 text-purple-600',
  qualifying: 'bg-amber-500/10 text-amber-600',
  nurturing: 'bg-teal-500/10 text-teal-600',
  showing: 'bg-orange-500/10 text-orange-600',
  offer: 'bg-pink-500/10 text-pink-600',
  under_contract: 'bg-green-500/10 text-green-600',
  closing: 'bg-gold/10 text-gold',
  closed: 'bg-emerald-500/10 text-emerald-600',
  lost: 'bg-red-500/10 text-red-600',
  on_hold: 'bg-gray-500/10 text-gray-600',
};

const selectClassName = `
  w-full px-4 py-2.5 rounded-[8px]
  bg-white dark:bg-dark-card
  border border-gold/15
  text-navy dark:text-white
  font-inter text-sm
  focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
  transition-all duration-200 ease-in-out
  appearance-none
`.replace(/\n\s+/g, ' ').trim();

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ContactData>>({});
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [transactions, setTransactions] = useState<LinkedTransaction[]>([]);

  const fetchContact = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacts/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load contact');
      }
      const data = await res.json();
      setContact(data.contact);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contact');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRelatedData = useCallback(async () => {
    // Fetch transactions linked to this contact
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        const linked = (data.transactions || []).filter(
          (t: LinkedTransaction & { contact_id: string }) => t.contact_id === id
        );
        setTransactions(linked);
      }
    } catch {
      // Non-critical
    }

  }, [id]);

  useEffect(() => {
    fetchContact();
    fetchRelatedData();
  }, [fetchContact, fetchRelatedData]);

  function startEdit() {
    if (!contact) return;
    setEditForm({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      track_type: contact.track_type,
      pipeline_stage: contact.pipeline_stage,
      lead_source: contact.lead_source,
      language_preference: contact.language_preference,
      address_line_1: contact.address_line_1,
      city: contact.city,
      state: contact.state,
      zip_code: contact.zip_code,
      budget: contact.budget,
      location_preference: contact.location_preference,
      notes: contact.notes,
    });
    setEditing(true);
  }

  async function handleSave() {
    if (!editForm.first_name?.trim() || !editForm.last_name?.trim()) {
      toast.error('Validation Error', 'First name and last name are required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: editForm.first_name?.trim(),
          last_name: editForm.last_name?.trim(),
          email: editForm.email?.trim() || null,
          phone: editForm.phone?.trim() || null,
          track_type: editForm.track_type,
          pipeline_stage: editForm.pipeline_stage,
          lead_source: editForm.lead_source || null,
          language_preference: editForm.language_preference,
          address_line_1: editForm.address_line_1?.trim() || null,
          city: editForm.city?.trim() || null,
          state: editForm.state?.trim() || null,
          zip_code: editForm.zip_code?.trim() || null,
          budget: editForm.budget?.trim() || null,
          location_preference: editForm.location_preference?.trim() || null,
          notes: editForm.notes?.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update contact');
      }

      const data = await res.json();
      setContact(data.contact);
      setEditing(false);
      toast.success('Contact Updated', `${data.contact.first_name} ${data.contact.last_name} has been updated.`);
    } catch (err) {
      toast.error('Update Failed', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete contact');
      }
      toast.success('Contact Deleted', 'The contact has been removed.');
      router.push('/contacts');
    } catch (err) {
      toast.error('Delete Failed', err instanceof Error ? err.message : 'Something went wrong.');
    }
    setShowDelete(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-sm text-navy/50 dark:text-white/50 font-inter">Loading contact...</span>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <button onClick={() => router.push('/contacts')} className="flex items-center gap-2 text-sm text-gold font-montserrat font-medium mb-6 hover:underline">
          <ArrowLeft size={16} /> Back to Contacts
        </button>
        <Card className="!p-8 text-center">
          <p className="text-red-500 font-inter">{error || 'Contact not found'}</p>
        </Card>
      </div>
    );
  }

  const stageColor = STAGE_COLORS[contact.pipeline_stage] || STAGE_COLORS.new;

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push('/contacts')}
        className="flex items-center gap-2 text-sm text-gold font-montserrat font-medium mb-6 hover:underline"
      >
        <ArrowLeft size={16} /> Back to Contacts
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-montserrat font-bold text-gold">
              {contact.first_name[0]}{contact.last_name[0]}
            </span>
          </div>
          <div>
            <h1
              className="text-2xl font-semibold text-navy dark:text-white"
              style={{ fontFamily: BRAND.fonts.playfair }}
            >
              {contact.first_name} {contact.last_name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-montserrat font-semibold uppercase px-2 py-0.5 rounded-full bg-gold/10 text-gold">
                {contact.track_type}
              </span>
              <span className={`text-[10px] font-montserrat font-semibold px-2 py-0.5 rounded-full ${stageColor}`}>
                {contact.pipeline_stage.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={startEdit}>
            <Edit3 size={14} />
            <span className="hidden sm:inline ml-1">Edit</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowDelete(true)} className="!text-red-500 hover:!bg-red-500/10">
            <Trash2 size={14} />
            <span className="hidden sm:inline ml-1">Delete</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Contact Info */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="!p-5">
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={14} className="text-gold flex-shrink-0" />
                  <div>
                    <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Phone</p>
                    <p className="text-sm font-inter text-navy dark:text-white">{contact.phone}</p>
                  </div>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail size={14} className="text-gold flex-shrink-0" />
                  <div>
                    <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Email</p>
                    <p className="text-sm font-inter text-navy dark:text-white">{contact.email}</p>
                  </div>
                </div>
              )}
              {(contact.address_line_1 || contact.city) && (
                <div className="flex items-center gap-3">
                  <MapPin size={14} className="text-gold flex-shrink-0" />
                  <div>
                    <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Address</p>
                    <p className="text-sm font-inter text-navy dark:text-white">
                      {contact.address_line_1 && <>{contact.address_line_1}<br /></>}
                      {contact.city}{contact.state ? `, ${contact.state}` : ''} {contact.zip_code || ''}
                    </p>
                  </div>
                </div>
              )}
              {contact.language_preference && (
                <div className="flex items-center gap-3">
                  <Globe size={14} className="text-gold flex-shrink-0" />
                  <div>
                    <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Language</p>
                    <p className="text-sm font-inter text-navy dark:text-white capitalize">
                      {contact.language_preference === 'en' ? 'English' : contact.language_preference === 'es' ? 'Spanish' : 'Bilingual'}
                    </p>
                  </div>
                </div>
              )}
              {contact.budget && (
                <div className="flex items-center gap-3">
                  <DollarSign size={14} className="text-gold flex-shrink-0" />
                  <div>
                    <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Budget</p>
                    <p className="text-sm font-inter text-navy dark:text-white">{contact.budget}</p>
                  </div>
                </div>
              )}
              {contact.location_preference && (
                <div className="flex items-center gap-3">
                  <MapPin size={14} className="text-gold flex-shrink-0" />
                  <div>
                    <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Location Preference</p>
                    <p className="text-sm font-inter text-navy dark:text-white">{contact.location_preference}</p>
                  </div>
                </div>
              )}
              {contact.lead_source && (
                <div className="flex items-center gap-3">
                  <Tag size={14} className="text-gold flex-shrink-0" />
                  <div>
                    <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Lead Source</p>
                    <p className="text-sm font-inter text-navy dark:text-white">{contact.lead_source}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Notes */}
          {contact.notes && (
            <Card className="!p-5">
              <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3">
                <MessageSquare size={14} className="inline mr-2 text-gold" />
                Notes
              </h3>
              <p className="text-sm font-inter text-navy/70 dark:text-white/70 whitespace-pre-wrap">{contact.notes}</p>
            </Card>
          )}

          {/* Linked Transactions */}
          <Card className="!p-5">
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3">
              <Briefcase size={14} className="inline mr-2 text-gold" />
              Transactions
            </h3>
            {transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map(tx => (
                  <button
                    key={tx.id}
                    onClick={() => router.push(`/transactions/${tx.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-surface dark:bg-navy/30 hover:bg-gold/5 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-montserrat font-medium text-navy dark:text-white">{tx.property_address}</p>
                      <p className="text-xs text-navy/40 dark:text-white/40 font-inter">
                        {tx.contract_price ? `$${tx.contract_price.toLocaleString()}` : 'No price set'}
                        {tx.closing_date ? ` - Closes ${new Date(tx.closing_date).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <Badge variant={tx.status === 'closed' ? 'success' : tx.status === 'lost' ? 'danger' : 'gold'}>
                      {tx.status}
                    </Badge>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-navy/40 dark:text-white/40 font-inter">No transactions linked to this contact.</p>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="!p-5">
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3">Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Track Type</p>
                <p className="text-sm font-inter text-navy dark:text-white capitalize">{contact.track_type}</p>
              </div>
              <div>
                <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Pipeline Stage</p>
                <p className="text-sm font-inter text-navy dark:text-white capitalize">{contact.pipeline_stage.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Lead Score</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-navy/10 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full transition-all"
                      style={{ width: `${contact.lead_score}%` }}
                    />
                  </div>
                  <span className="text-xs font-inter text-navy/60 dark:text-white/60">{contact.lead_score}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Date Added</p>
                <p className="text-sm font-inter text-navy dark:text-white">
                  {new Date(contact.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Last Updated</p>
                <p className="text-sm font-inter text-navy dark:text-white">
                  {new Date(contact.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editing} onClose={() => !saving && setEditing(false)} title="Edit Contact" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name *"
              value={editForm.first_name || ''}
              onChange={e => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
              disabled={saving}
            />
            <Input
              label="Last Name *"
              value={editForm.last_name || ''}
              onChange={e => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={editForm.email || ''}
              onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              disabled={saving}
            />
            <Input
              label="Phone"
              type="tel"
              value={editForm.phone || ''}
              onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Track Type</label>
              <select
                value={editForm.track_type || 'buyer'}
                onChange={e => setEditForm(prev => ({ ...prev, track_type: e.target.value as TrackType }))}
                className={selectClassName}
                disabled={saving}
              >
                {TRACK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Pipeline Stage</label>
              <select
                value={editForm.pipeline_stage || 'new'}
                onChange={e => setEditForm(prev => ({ ...prev, pipeline_stage: e.target.value as PipelineStage }))}
                className={selectClassName}
                disabled={saving}
              >
                {PIPELINE_STAGES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Lead Source</label>
              <select
                value={editForm.lead_source || ''}
                onChange={e => setEditForm(prev => ({ ...prev, lead_source: e.target.value }))}
                className={selectClassName}
                disabled={saving}
              >
                <option value="">None</option>
                {LEAD_SOURCES.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Language</label>
              <select
                value={editForm.language_preference || 'en'}
                onChange={e => setEditForm(prev => ({ ...prev, language_preference: e.target.value }))}
                className={selectClassName}
                disabled={saving}
              >
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <Input
            label="Budget / Price Range"
            placeholder="$300k - $450k"
            value={editForm.budget || ''}
            onChange={e => setEditForm(prev => ({ ...prev, budget: e.target.value }))}
            disabled={saving}
          />
          <Input
            label="Location Preference"
            placeholder="Denton County, Park Cities"
            value={editForm.location_preference || ''}
            onChange={e => setEditForm(prev => ({ ...prev, location_preference: e.target.value }))}
            disabled={saving}
          />
          <Input
            label="Address"
            value={editForm.address_line_1 || ''}
            onChange={e => setEditForm(prev => ({ ...prev, address_line_1: e.target.value }))}
            disabled={saving}
          />
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3">
              <Input label="City" value={editForm.city || ''} onChange={e => setEditForm(prev => ({ ...prev, city: e.target.value }))} disabled={saving} />
            </div>
            <div className="col-span-1">
              <Input label="State" value={editForm.state || ''} onChange={e => setEditForm(prev => ({ ...prev, state: e.target.value }))} disabled={saving} />
            </div>
            <div className="col-span-2">
              <Input label="Zip" value={editForm.zip_code || ''} onChange={e => setEditForm(prev => ({ ...prev, zip_code: e.target.value }))} disabled={saving} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Notes</label>
            <textarea
              rows={3}
              value={editForm.notes || ''}
              onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
              disabled={saving}
              className={`${selectClassName} resize-none placeholder:text-navy/40 dark:placeholder:text-white/40`}
              placeholder="Additional notes..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
            <Button variant="accent" onClick={handleSave} loading={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Contact?"
        message={`Are you sure you want to delete ${contact.first_name} ${contact.last_name}? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
