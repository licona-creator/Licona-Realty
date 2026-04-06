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
import type { TransactionChecklistItem, TransactionParty } from '@/types/database';
import { AddressAutocomplete } from '@/components/shared/AddressAutocomplete';
import { DocumentVault } from '@/components/transactions/DocumentVault';
import { TRANSACTION_TYPE_LABELS } from '@/lib/documents/texas-checklist';
import type { TransactionType } from '@/lib/documents/texas-checklist';
import { FINANCIALS, calculateTrueNet } from '@/lib/financials';
import { createCallLink, createSMSLink } from '@/lib/sms';
import {
  ArrowLeft, Edit3, Trash2, DollarSign, Calendar,
  CheckSquare, Square, User, FileText, Clock, AlertTriangle,
  Building, Phone, Mail, Sparkles, MessageCircle, Check,
} from 'lucide-react';
import { DealDetailSkeleton } from '@/components/ui/Skeleton';
import { getDisplayName } from '@/lib/format';

interface TransactionData {
  id: string;
  contact_id: string;
  track_type: string;
  transaction_type: string;
  property_address: string;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  status: string;
  contract_price: number | null;
  closing_date: string | null;
  key_dates: Record<string, string> | null;
  checklist: TransactionChecklistItem[] | null;
  parties: TransactionParty[] | null;
  commission_gross: number | null;
  commission_broker_split: number | null;
  commission_net: number | null;
  commission_rate: number | null;
  referral_fee: number | null;
  notes: Array<{ id: string; content: string; created_at: string }> | null;
  created_at: string;
  updated_at: string;
  contacts?: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    language_preference?: string | null;
    referred_by_contact_id?: string | null;
  };
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'option_period', label: 'Option Period' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'clear_to_close', label: 'Clear to Close' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'lost', label: 'Lost' },
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-500/10 text-blue-600',
  option_period: 'bg-amber-500/10 text-amber-600',
  inspection: 'bg-purple-500/10 text-purple-600',
  appraisal: 'bg-orange-500/10 text-orange-600',
  clear_to_close: 'bg-emerald-500/10 text-emerald-600',
  closed: 'bg-green-500/10 text-green-600',
  cancelled: 'bg-red-500/10 text-red-600',
  lost: 'bg-red-500/10 text-red-600',
  new: 'bg-blue-500/10 text-blue-600',
};

const selectClassName = `
  w-full px-4 py-2.5 rounded-[8px]
  bg-[var(--lr-depth-2)]
  border border-gold/15
  text-white
  font-inter text-sm
  focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
  transition-all duration-200 ease-in-out
  appearance-none
`.replace(/\n\s+/g, ' ').trim();

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [contacts, setContacts] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const fetchTransaction = useCallback(async () => {
    try {
      const res = await fetch(`/api/transactions/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load transaction');
      }
      const data = await res.json();
      setTransaction(data.transaction);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTransaction(); }, [fetchTransaction]);

  async function toggleChecklist(itemId: string) {
    if (!transaction?.checklist) return;

    const previousChecklist = transaction.checklist;
    const updated = transaction.checklist.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          is_completed: !item.is_completed,
          completed_at: !item.is_completed ? new Date().toISOString() : null,
        };
      }
      return item;
    });

    // Optimistic: update UI immediately
    setTransaction(prev => prev ? { ...prev, checklist: updated } : prev);

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist: updated }),
      });

      if (!res.ok) throw new Error('Failed to update checklist');
      const data = await res.json();
      setTransaction(data.transaction);
    } catch {
      // Revert on failure
      setTransaction(prev => prev ? { ...prev, checklist: previousChecklist } : prev);
      toast.error('Update Failed', 'Could not update checklist item.');
    }
  }

  function startEdit() {
    if (!transaction) return;
    setEditForm({
      contact_id: transaction.contact_id,
      property_address: transaction.property_address,
      property_city: transaction.property_city || '',
      property_state: transaction.property_state || '',
      property_zip: transaction.property_zip || '',
      contract_price: transaction.contract_price?.toString() || '',
      closing_date: transaction.closing_date || '',
      status: transaction.status,
      track_type: transaction.track_type,
      transaction_type: transaction.transaction_type || 'buyers_agent_sale',
    });
    setEditing(true);
    // Fetch contacts for the dropdown
    setContactsLoading(true);
    fetch('/api/contacts?limit=100')
      .then(res => res.json())
      .then(data => setContacts(data.contacts || []))
      .catch(() => setContacts([]))
      .finally(() => setContactsLoading(false));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: editForm.contact_id,
          property_address: (editForm.property_address as string)?.trim(),
          property_city: (editForm.property_city as string)?.trim() || null,
          property_state: (editForm.property_state as string)?.trim() || null,
          property_zip: (editForm.property_zip as string)?.trim() || null,
          contract_price: editForm.contract_price ? Number(editForm.contract_price) : null,
          closing_date: editForm.closing_date || null,
          status: editForm.status,
          track_type: editForm.track_type,
          transaction_type: editForm.transaction_type,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update transaction');
      }

      setEditing(false);
      toast.success('Deal Updated', 'Changes have been saved.');
      fetchTransaction();
      router.refresh();
    } catch (err) {
      toast.error('Update Failed', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success('Deal Deleted', 'The deal has been removed.');
      router.push('/transactions');
    } catch (err) {
      toast.error('Delete Failed', err instanceof Error ? err.message : 'Something went wrong.');
    }
    setShowDelete(false);
  }

  if (loading) {
    return <DealDetailSkeleton />;
  }

  if (error || !transaction) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <button type="button" onClick={() => router.push('/transactions')} className="flex items-center gap-2 text-sm text-gold font-montserrat font-medium mb-6 hover:underline">
          <ArrowLeft size={16} /> Back to Deals
        </button>
        <Card className="!p-8 text-center">
          <p className="text-red-500 font-inter">{error || 'Deal not found'}</p>
        </Card>
      </div>
    );
  }

  const completedItems = (transaction.checklist || []).filter(c => c.is_completed).length;
  const totalItems = (transaction.checklist || []).length;
  const daysToClose = transaction.closing_date
    ? Math.floor((new Date(transaction.closing_date + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const statusColor = STATUS_COLORS[transaction.status] || STATUS_COLORS.new;
  const contactName = transaction.contacts
    ? getDisplayName(transaction.contacts)
    : 'Unknown Contact';

  const price = transaction.contract_price || 0;
  const gross = transaction.commission_gross || Math.round(price * (transaction.commission_rate || 3) / 100);
  const referralFee = transaction.referral_fee || 0;
  const trueNet = calculateTrueNet(gross, referralFee);
  const isClosable = transaction.status === 'clear_to_close';
  const isClosed = transaction.status === 'closed';

  // Closing countdown color
  const countdownColor = isClosed ? '#22c55e' : daysToClose !== null && daysToClose <= 7 ? '#ef4444' : daysToClose !== null && daysToClose <= 14 ? '#f59e0b' : '#d3a971';

  return (
    <div className="p-3 pt-2 pb-28 lg:p-8 lg:pb-8 max-w-4xl mx-auto animate-fade-in">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push('/transactions')}
        className="flex items-center gap-2 text-sm text-gold font-montserrat font-medium mb-4 hover:underline"
      >
        <ArrowLeft size={16} /> Back to Deals
      </button>

      {/* Closing Countdown */}
      <div className="text-center mb-5">
        {isClosed ? (
          <>
            <p className="text-3xl font-bold font-playfair" style={{ color: '#22c55e' }}>CLOSED</p>
            {transaction.closing_date && (
              <p className="text-sm text-white/50 font-inter mt-1">
                {new Date(transaction.closing_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </>
        ) : daysToClose !== null ? (
          <>
            <p className="text-3xl font-bold font-playfair" style={{ color: countdownColor }}>
              {daysToClose >= 0 ? `${daysToClose} days to closing` : `${Math.abs(daysToClose)} days overdue`}
            </p>
            {transaction.closing_date && (
              <p className="text-sm text-white/50 font-inter mt-1">
                {new Date(transaction.closing_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </>
        ) : null}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white" style={{ fontFamily: BRAND.fonts.playfair }}>
            {transaction.property_address}
          </h1>
          <p className="text-sm text-white/50 font-inter mt-0.5">
            {transaction.property_city}{transaction.property_state ? `, ${transaction.property_state}` : ''} {transaction.property_zip || ''}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[10px] font-montserrat font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
              {transaction.status.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] font-montserrat font-semibold uppercase px-2 py-0.5 rounded-full bg-gold/10 text-gold">
              {transaction.transaction_type
                ? ({ buyers_agent_sale: 'BUYER', listing_agent_sale: 'SELLER', dual_agent: 'DUAL AGENT', lease_tenant_rep: 'TENANT', lease_landlord_rep: 'LANDLORD' }[transaction.transaction_type] || transaction.track_type)
                : transaction.track_type}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-ai-panel'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-montserrat font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#3B8BD4' }}
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">Ask Deal AI</span>
          </button>
          <Button variant="ghost" size="sm" onClick={startEdit}>
            <Edit3 size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowDelete(true)} className="!text-red-500 hover:!bg-red-500/10">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Key Parties */}
      {transaction.parties && transaction.parties.length > 0 && (
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Building size={14} className="text-gold" />
            <h2 className="font-montserrat font-semibold text-[11px] uppercase tracking-wider text-white">Key Parties</h2>
          </div>
          <div className="space-y-2">
            {transaction.parties.map(party => (
              <div key={party.id} className="rounded-xl p-3 flex items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-white/40 font-inter uppercase">{party.role?.replace(/_/g, ' ')}</p>
                  <p className="text-sm font-montserrat font-medium text-white">{party.name}</p>
                  {party.company && <p className="text-xs text-white/50 font-inter">{party.company}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {party.phone && (
                    <a href={createCallLink(party.phone)} className="p-2.5 rounded-lg bg-white/5 text-gold active:scale-95 transition-transform" style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Phone size={16} />
                    </a>
                  )}
                  {party.email && (
                    <a href={`mailto:${party.email}`} className="p-2.5 rounded-lg bg-white/5 text-gold active:scale-95 transition-transform" style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mail size={16} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Commission Card */}
      <section className="mb-5">
        <Card className="!p-5">
          <h3 className="text-sm font-montserrat font-semibold text-white/70 mb-3 flex items-center gap-2">
            <DollarSign size={14} className="text-gold" />
            Commission
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-white/40 font-inter">Gross Commission</span>
              <span className="text-sm font-inter text-white">${gross.toLocaleString()}</span>
            </div>
            {referralFee > 0 && (
              <div className="flex justify-between">
                <span className="text-xs text-white/40 font-inter">Ana Referral Fee</span>
                <span className="text-sm font-inter text-red-400">-${referralFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-xs text-white/40 font-inter">CMR Transaction Fee</span>
              <span className="text-sm font-inter text-red-400">-${FINANCIALS.CMR_TRANSACTION_FEE.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2">
              <span className="text-xs font-montserrat font-semibold text-white/60">True Take-Home</span>
              <span className="text-sm font-montserrat font-bold text-gold">${trueNet.toLocaleString()}</span>
            </div>
            {price > 0 && transaction.commission_rate && (
              <p className="text-[10px] text-white/30 font-inter text-right">
                {transaction.commission_rate}% of ${price.toLocaleString()}
              </p>
            )}
          </div>
          <CommissionSection transaction={transaction} onUpdate={fetchTransaction} />
        </Card>
      </section>

      {/* Document Checklist */}
      <section className="mb-5">
        <Card className="!p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-montserrat font-semibold text-white/70 flex items-center gap-2">
              <CheckSquare size={14} className="text-gold" />
              Documents
            </h3>
            {totalItems > 0 && (
              <span className="text-xs text-white/40 font-inter">{completedItems} of {totalItems}</span>
            )}
          </div>
          {totalItems > 0 && (
            <div className="w-full h-1.5 bg-white/10 rounded-full mb-3 overflow-hidden">
              <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${(completedItems / totalItems) * 100}%` }} />
            </div>
          )}
          {transaction.checklist && transaction.checklist.length > 0 ? (
            <div className="space-y-1">
              {transaction.checklist.map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  disabled={checklistSaving}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left disabled:opacity-50"
                  style={{ minHeight: 44 }}
                >
                  {item.is_completed ? (
                    <CheckSquare size={16} className="text-gold flex-shrink-0" />
                  ) : (
                    <Square size={16} className="text-white/30 flex-shrink-0" />
                  )}
                  <span className={`text-sm font-inter ${item.is_completed ? 'line-through text-white/40' : 'text-white'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40 font-inter">No checklist items.</p>
          )}
        </Card>
      </section>

      {/* Document Vault */}
      <section className="mb-5">
        <Card className="!p-5">
          <DocumentVault transactionId={id} trackType={transaction.track_type} transactionType={transaction.transaction_type || 'buyers_agent_sale'} />
        </Card>
      </section>

      {/* Linked Contact */}
      <section className="mb-5">
        <Card className="!p-4">
          <button
            type="button"
            onClick={() => router.push(`/contacts/${transaction.contact_id}`)}
            className="w-full flex items-center gap-3 text-left active:bg-white/5 transition-colors rounded-lg"
          >
            <User size={16} className="text-gold flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-montserrat font-medium text-white">{contactName}</p>
              {transaction.contacts?.phone && (
                <p className="text-xs text-white/40 font-inter">{transaction.contacts.phone}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {transaction.contacts?.phone && (
                <a href={createCallLink(transaction.contacts.phone)} onClick={e => e.stopPropagation()} className="p-2 rounded-lg bg-white/5 text-gold active:scale-95 transition-transform">
                  <Phone size={14} />
                </a>
              )}
              {transaction.contacts?.phone && (
                <a href={createSMSLink(transaction.contacts.phone)} onClick={e => e.stopPropagation()} className="p-2 rounded-lg bg-white/5 text-gold active:scale-95 transition-transform">
                  <MessageCircle size={14} />
                </a>
              )}
            </div>
          </button>
        </Card>
      </section>

      {/* Post-Closing Checklist */}
      {(isClosable || isClosed) && (
        <PostClosingChecklist transaction={transaction} onUpdate={fetchTransaction} />
      )}

      {/* Mark as Closed Button */}
      {isClosable && (
        <MarkAsClosedButton transaction={transaction} onUpdate={() => { fetchTransaction(); router.refresh(); }} />
      )}

      {/* Notes */}
      {transaction.notes && transaction.notes.length > 0 && (
        <section className="mb-5">
          <Card className="!p-5">
            <h3 className="text-sm font-montserrat font-semibold text-white/70 mb-3 flex items-center gap-2">
              <FileText size={14} className="text-gold" />
              Notes
            </h3>
            <div className="space-y-2">
              {transaction.notes.map(note => (
                <div key={note.id} className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <p className="text-sm font-inter text-white/70 whitespace-pre-wrap">{note.content}</p>
                  <p className="text-[10px] text-white/30 font-inter mt-1">
                    {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Edit Modal */}
      <Modal open={editing} onClose={() => !saving && setEditing(false)} title="Edit Deal" size="lg" footer={<div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button><Button variant="accent" onClick={handleSave} loading={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button></div>}>
        <div className="space-y-4">
          {/* Linked Contact */}
          <div>
            <label className="block text-sm font-montserrat font-medium text-white mb-1.5">Linked Contact</label>
            <select
              value={(editForm.contact_id as string) || ''}
              onChange={e => setEditForm(prev => ({ ...prev, contact_id: e.target.value }))}
              className={selectClassName}
              disabled={saving || contactsLoading}
            >
              {contactsLoading ? (
                <option value="">Loading contacts...</option>
              ) : (
                <>
                  <option value="">Select a contact</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {getDisplayName(c)}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          <AddressAutocomplete
            label="Property Address *"
            placeholder="Start typing an address..."
            value={(editForm.property_address as string) || ''}
            onRawChange={val => setEditForm(prev => ({ ...prev, property_address: val }))}
            onChange={({ street, city, state, zip }) => {
              setEditForm(prev => ({
                ...prev,
                property_address: street,
                property_city: city || prev.property_city,
                property_state: state || prev.property_state,
                property_zip: zip || prev.property_zip,
              }));
            }}
            disabled={saving}
          />
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
            <Input
              label="City"
              value={(editForm.property_city as string) || ''}
              onChange={e => setEditForm(prev => ({ ...prev, property_city: e.target.value }))}
              disabled={saving}
            />
            <Input
              label="State"
              value={(editForm.property_state as string) || ''}
              onChange={e => setEditForm(prev => ({ ...prev, property_state: e.target.value }))}
              disabled={saving}
            />
            <Input
              label="Zip"
              value={(editForm.property_zip as string) || ''}
              onChange={e => setEditForm(prev => ({ ...prev, property_zip: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Contract Price"
              type="number"
              value={(editForm.contract_price as string) || ''}
              onChange={e => setEditForm(prev => ({ ...prev, contract_price: e.target.value }))}
              disabled={saving}
            />
            <Input
              label="Closing Date"
              type="date"
              value={(editForm.closing_date as string) || ''}
              onChange={e => setEditForm(prev => ({ ...prev, closing_date: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-montserrat font-medium text-white mb-1.5">Transaction Type *</label>
            <select
              value={(editForm.transaction_type as string) || 'buyers_agent_sale'}
              onChange={e => setEditForm(prev => ({ ...prev, transaction_type: e.target.value }))}
              className={selectClassName}
              disabled={saving}
            >
              {(Object.entries(TRANSACTION_TYPE_LABELS) as [TransactionType, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {editForm.transaction_type !== transaction.transaction_type && (
              <p className="text-xs text-amber-600 font-inter mt-1">
                Changing the transaction type will update the document checklist. Any uploaded documents will be preserved.
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-montserrat font-medium text-white mb-1.5">Status</label>
              <select
                value={(editForm.status as string) || 'active'}
                onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                className={selectClassName}
                disabled={saving}
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-montserrat font-medium text-white mb-1.5">Track Type</label>
              <select
                value={(editForm.track_type as string) || 'buyer'}
                onChange={e => setEditForm(prev => ({ ...prev, track_type: e.target.value }))}
                className={selectClassName}
                disabled={saving}
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="landlord">Landlord</option>
                <option value="tenant">Tenant</option>
                <option value="investor">Investor</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Deal?"
        message={`Are you sure you want to delete the deal for ${transaction.property_address}? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}

function CommissionSection({ transaction, onUpdate }: { transaction: TransactionData; onUpdate: () => void }) {
  const toast = useToast();
  const [rate, setRate] = useState(transaction.commission_rate?.toString() || '3.0');
  const [fee, setFee] = useState(transaction.referral_fee?.toString() || '0');
  const [saving, setSaving] = useState(false);

  const price = transaction.contract_price || 0;
  const commissionRate = parseFloat(rate) || 0;
  const referralFeeVal = parseFloat(fee) || 0;
  const gross = Math.round(price * commissionRate / 100);
  const net = gross - referralFeeVal;

  async function saveCommission() {
    setSaving(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commission_rate: commissionRate,
          referral_fee: referralFeeVal,
          commission_gross: gross,
          commission_net: net,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Commission Updated', 'Commission details saved.');
      onUpdate();
    } catch {
      toast.error('Error', 'Failed to save commission.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 mt-4 pt-3 border-t border-white/10">
      <p className="text-[10px] text-white/30 font-inter uppercase">Edit Commission</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-white/40 font-inter block mb-1">Rate (%)</label>
          <input type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-sm font-inter text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
        </div>
        <div>
          <label className="text-[10px] text-white/40 font-inter block mb-1">Referral Fee ($)</label>
          <input type="number" value={fee} onChange={e => setFee(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-sm font-inter text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
        </div>
      </div>
      <Button variant="accent" size="sm" onClick={saveCommission} loading={saving} className="w-full">
        {saving ? 'Saving...' : 'Save Commission'}
      </Button>
    </div>
  );
}

// Post-Closing Checklist
const POST_CLOSE_ITEMS = [
  { id: 'google_review', label: 'Google Review ask (Day 3)', day: 3, messageType: 'review' as const },
  { id: 'referral_ask', label: 'Referral ask (Day 5)', day: 5, messageType: 'referral' as const },
  { id: 'thank_referrer', label: 'Thank referral partner (Day 10)', day: 10, messageType: 'thank_referrer' as const },
  { id: 'check_in_30', label: '30-day check-in', day: 30, messageType: 'check_30' as const },
  { id: 'market_update_90', label: '90-day market update', day: 90, messageType: 'market_90' as const },
];

function getPostCloseMessage(
  type: 'review' | 'referral' | 'thank_referrer' | 'check_30' | 'market_90',
  contactName: string,
  referrerName: string,
  isSpanish: boolean
): string {
  if (isSpanish) {
    switch (type) {
      case 'review': return `Hola ${contactName}, felicidades de nuevo por tu nueva casa! Si tienes un momento, me ayudaria mucho si pudieras dejar una resena en Google. Es super rapido y me ayuda a seguir ayudando a mas familias.`;
      case 'referral': return `Hola ${contactName}, espero que te estes acomodando bien! Pregunta rapida, conoces a alguien que este buscando comprar o vender casa? Me encantaria ayudar a quien me mandes.`;
      case 'thank_referrer': return `Hola ${referrerName}, queria avisarte que ya cerramos con ${contactName}. Todo salio perfecto. Muchas gracias por la confianza. Si tienes mas personas que necesiten ayuda, aqui estoy siempre.`;
      case 'check_30': return `Hola ${contactName}, como va todo con la casa nueva? Espero que todo este bien. Cualquier cosa que necesites, aqui andamos.`;
      case 'market_90': return `Hola ${contactName}, nomas queria saludar y contarte que las casas en tu zona se estan vendiendo a buen precio. Cualquier pregunta, aqui andamos.`;
    }
  }
  switch (type) {
    case 'review': return `Hey ${contactName}, congrats again on the new home! If you get a chance, it would mean a lot if you could leave me a quick Google review. Takes 30 seconds and really helps me out.`;
    case 'referral': return `Hey ${contactName}, hope you're settling in! Quick question, do you know anyone else looking to buy or sell? I'd love to help anyone you send my way.`;
    case 'thank_referrer': return `Hey ${referrerName}, just wanted to let you know we closed with ${contactName}. Everything went great. Thanks for the trust, and if you have anyone else who needs help, I'm always here.`;
    case 'check_30': return `Hey ${contactName}, how's the new place? Hope everything is going well. Let me know if you need anything.`;
    case 'market_90': return `Hey ${contactName}, just checking in! Homes in your area have been moving. Let me know if you ever have any questions about the market.`;
  }
}

function PostClosingChecklist({ transaction, onUpdate }: { transaction: TransactionData; onUpdate: () => void }) {
  const toast = useToast();
  const [referrerData, setReferrerData] = useState<{ first_name: string; phone: string | null } | null>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>(() => {
    const keyDates = transaction.key_dates as Record<string, unknown> | null;
    return (keyDates?.post_closing_completed as string[]) || [];
  });

  const contactFirstName = transaction.contacts?.first_name || 'there';
  const isSpanish = transaction.contacts?.language_preference === 'es' || transaction.contacts?.language_preference === 'spanish';
  const contactPhone = transaction.contacts?.phone;
  const hasReferrer = !!transaction.contacts?.referred_by_contact_id;

  useEffect(() => {
    if (hasReferrer && transaction.contacts?.referred_by_contact_id) {
      fetch(`/api/contacts/${transaction.contacts.referred_by_contact_id}`)
        .then(r => r.json())
        .then(d => {
          if (d.contact) setReferrerData({ first_name: d.contact.first_name, phone: d.contact.phone });
        })
        .catch(() => {});
    }
  }, [hasReferrer, transaction.contacts?.referred_by_contact_id]);

  async function toggleItem(itemId: string) {
    const isCompleted = checkedItems.includes(itemId);
    const updated = isCompleted ? checkedItems.filter(i => i !== itemId) : [...checkedItems, itemId];
    setCheckedItems(updated);

    try {
      const currentKeyDates = (transaction.key_dates || {}) as Record<string, unknown>;
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_dates: { ...currentKeyDates, post_closing_completed: updated },
        }),
      });
      if (!res.ok) throw new Error('Failed');

      if (!isCompleted) {
        await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_id: transaction.contact_id,
            activity_type: 'note',
            description: `Post-closing: ${itemId.replace(/_/g, ' ')} completed`,
          }),
        });
      }
      onUpdate();
    } catch {
      setCheckedItems(checkedItems);
      toast.error('Error', 'Could not update.');
    }
  }

  const visibleItems = POST_CLOSE_ITEMS.filter(item => {
    if (item.id === 'thank_referrer' && !hasReferrer) return false;
    return true;
  });

  return (
    <section className="mb-5">
      <Card className="!p-5">
        <h3 className="text-sm font-montserrat font-semibold text-white/70 mb-3">After Closing</h3>
        <div className="space-y-1">
          {visibleItems.map(item => {
            const done = checkedItems.includes(item.id);
            const message = getPostCloseMessage(
              item.messageType,
              contactFirstName,
              referrerData?.first_name || 'Ana',
              isSpanish
            );
            const phone = item.id === 'thank_referrer' ? referrerData?.phone : contactPhone;

            return (
              <div key={item.id} className="flex items-center gap-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="flex-shrink-0"
                >
                  {done ? (
                    <Check size={18} className="text-green-500" />
                  ) : (
                    <Square size={18} className="text-white/30" />
                  )}
                </button>
                <span className={`text-sm font-inter flex-1 ${done ? 'line-through text-white/40' : 'text-white'}`}>
                  {item.label}
                </span>
                {phone && !done && (
                  <a
                    href={createSMSLink(phone, message)}
                    className="p-2 rounded-lg bg-gold/10 text-gold active:scale-95 transition-transform flex-shrink-0"
                    style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <MessageCircle size={14} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}

function MarkAsClosedButton({ transaction, onUpdate }: { transaction: TransactionData; onUpdate: () => void }) {
  const toast = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [closing, setClosing] = useState(false);

  async function handleClose() {
    setClosing(true);
    try {
      // 1. Update transaction status
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      if (!res.ok) throw new Error('Failed to close deal');

      // 2. Update contact to sphere
      await fetch(`/api/contacts/${transaction.contact_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_type: 'sphere' }),
      }).catch(() => {});

      // 3. Log activity
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: transaction.contact_id,
          activity_type: 'status_change',
          description: `Deal closed at ${transaction.property_address}`,
        }),
      }).catch(() => {});

      toast.success('Deal Closed', 'Commission tracker updated. Post-closing sequence started.');
      onUpdate();
    } catch {
      toast.error('Error', 'Could not close deal.');
    } finally {
      setClosing(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <div className="mb-5">
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="w-full py-3.5 bg-gold text-navy font-montserrat font-semibold text-sm rounded-xl active:scale-95 transition-transform"
        >
          Mark as Closed
        </button>
      </div>
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleClose}
        title="Close this deal?"
        message="Commission tracker updates and post-closing sequence starts."
        confirmLabel={closing ? 'Closing...' : 'Close Deal'}
      />
    </>
  );
}
