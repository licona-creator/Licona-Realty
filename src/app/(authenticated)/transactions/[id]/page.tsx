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
import {
  ArrowLeft, Edit3, Trash2, DollarSign, Calendar,
  CheckSquare, Square, User, FileText, Clock, AlertTriangle,
  Building, Phone, Mail,
} from 'lucide-react';

interface TransactionData {
  id: string;
  contact_id: string;
  track_type: string;
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
  notes: Array<{ id: string; content: string; created_at: string }> | null;
  created_at: string;
  updated_at: string;
  contacts?: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
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
  bg-white dark:bg-dark-card
  border border-gold/15
  text-navy dark:text-white
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
    if (!transaction?.checklist || checklistSaving) return;
    setChecklistSaving(true);

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
      toast.error('Update Failed', 'Could not update checklist item.');
    } finally {
      setChecklistSaving(false);
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
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update transaction');
      }

      setEditing(false);
      toast.success('Transaction Updated', 'Changes have been saved.');
      // Re-fetch to get updated joined contact data
      fetchTransaction();
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
      toast.success('Transaction Deleted', 'The transaction has been removed.');
      router.push('/transactions');
    } catch (err) {
      toast.error('Delete Failed', err instanceof Error ? err.message : 'Something went wrong.');
    }
    setShowDelete(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-sm text-navy/50 dark:text-white/50 font-inter">Loading transaction...</span>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <button onClick={() => router.push('/transactions')} className="flex items-center gap-2 text-sm text-gold font-montserrat font-medium mb-6 hover:underline">
          <ArrowLeft size={16} /> Back to Transactions
        </button>
        <Card className="!p-8 text-center">
          <p className="text-red-500 font-inter">{error || 'Transaction not found'}</p>
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
    ? `${transaction.contacts.first_name} ${transaction.contacts.last_name}`
    : 'Unknown Contact';

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push('/transactions')}
        className="flex items-center gap-2 text-sm text-gold font-montserrat font-medium mb-6 hover:underline"
      >
        <ArrowLeft size={16} /> Back to Transactions
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-semibold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            {transaction.property_address}
          </h1>
          <p className="text-sm text-navy/50 dark:text-white/50 font-inter mt-1">
            {transaction.property_city}{transaction.property_state ? `, ${transaction.property_state}` : ''} {transaction.property_zip || ''}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] font-montserrat font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
              {transaction.status.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] font-montserrat font-semibold uppercase px-2 py-0.5 rounded-full bg-gold/10 text-gold">
              {transaction.track_type}
            </span>
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
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="!p-4">
              <DollarSign size={14} className="text-gold mb-1" />
              <p className="text-lg font-bold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>
                {transaction.contract_price ? `$${transaction.contract_price.toLocaleString()}` : 'TBD'}
              </p>
              <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter">Contract Price</p>
            </Card>
            <Card className="!p-4">
              <Calendar size={14} className="text-gold mb-1" />
              <p className="text-lg font-bold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>
                {transaction.closing_date ? new Date(transaction.closing_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
              </p>
              <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter">Closing Date</p>
            </Card>
            <Card className="!p-4">
              <Clock size={14} className={daysToClose !== null && daysToClose <= 7 ? 'text-red-500 mb-1' : daysToClose !== null && daysToClose <= 14 ? 'text-gold mb-1' : 'text-gold mb-1'} />
              <p className={`text-lg font-bold ${daysToClose !== null && daysToClose <= 7 ? 'text-red-500' : 'text-navy dark:text-white'}`} style={{ fontFamily: BRAND.fonts.dmSerif }}>
                {daysToClose !== null ? (daysToClose >= 0 ? `${daysToClose}d` : 'Overdue') : 'N/A'}
              </p>
              <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter">Days to Close</p>
            </Card>
          </div>

          {/* Checklist */}
          <Card className="!p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 flex items-center gap-2">
                <CheckSquare size={14} className="text-gold" />
                Checklist
                {totalItems > 0 && (
                  <span className="text-xs text-navy/40 dark:text-white/40 font-inter">
                    {completedItems}/{totalItems}
                  </span>
                )}
              </h3>
              {totalItems > 0 && (
                <div className="w-24 h-2 bg-navy/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold rounded-full transition-all"
                    style={{ width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%` }}
                  />
                </div>
              )}
            </div>
            {transaction.checklist && transaction.checklist.length > 0 ? (
              <div className="space-y-1">
                {transaction.checklist.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleChecklist(item.id)}
                    disabled={checklistSaving}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface dark:hover:bg-navy/30 transition-colors text-left disabled:opacity-50"
                  >
                    {item.is_completed ? (
                      <CheckSquare size={16} className="text-gold flex-shrink-0" />
                    ) : (
                      <Square size={16} className="text-navy/30 dark:text-white/30 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-inter ${item.is_completed ? 'line-through text-navy/40 dark:text-white/40' : 'text-navy dark:text-white'}`}>
                      {item.label}
                    </span>
                    {item.due_date && (
                      <span className="text-[10px] text-navy/30 dark:text-white/30 font-inter ml-auto">
                        {new Date(item.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-navy/40 dark:text-white/40 font-inter">No checklist items.</p>
            )}
          </Card>

          {/* Notes */}
          {transaction.notes && transaction.notes.length > 0 && (
            <Card className="!p-5">
              <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3 flex items-center gap-2">
                <FileText size={14} className="text-gold" />
                Notes
              </h3>
              <div className="space-y-2">
                {transaction.notes.map(note => (
                  <div key={note.id} className="p-3 rounded-lg bg-surface dark:bg-navy/30">
                    <p className="text-sm font-inter text-navy/70 dark:text-white/70 whitespace-pre-wrap">{note.content}</p>
                    <p className="text-[10px] text-navy/30 dark:text-white/30 font-inter mt-1">
                      {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Parties */}
          {transaction.parties && transaction.parties.length > 0 && (
            <Card className="!p-5">
              <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3 flex items-center gap-2">
                <Building size={14} className="text-gold" />
                Transaction Parties
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {transaction.parties.map(party => (
                  <div key={party.id} className="p-3 rounded-lg bg-surface dark:bg-navy/30">
                    <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter uppercase">{party.role}</p>
                    <p className="text-sm font-montserrat font-medium text-navy dark:text-white">{party.name}</p>
                    {party.company && <p className="text-xs text-navy/50 dark:text-white/50 font-inter">{party.company}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      {party.phone && (
                        <span className="text-[10px] text-navy/40 dark:text-white/40 font-inter flex items-center gap-1">
                          <Phone size={8} /> {party.phone}
                        </span>
                      )}
                      {party.email && (
                        <span className="text-[10px] text-navy/40 dark:text-white/40 font-inter flex items-center gap-1">
                          <Mail size={8} /> {party.email}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Linked Contact */}
          <Card className="!p-5">
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3 flex items-center gap-2">
              <User size={14} className="text-gold" />
              Contact
            </h3>
            <button
              onClick={() => router.push(`/contacts/${transaction.contact_id}`)}
              className="w-full text-left p-3 rounded-lg bg-surface dark:bg-navy/30 hover:bg-gold/5 transition-colors"
            >
              <p className="text-sm font-montserrat font-medium text-navy dark:text-white">{contactName}</p>
              {transaction.contacts?.email && (
                <p className="text-xs text-navy/40 dark:text-white/40 font-inter flex items-center gap-1 mt-0.5">
                  <Mail size={10} /> {transaction.contacts.email}
                </p>
              )}
              {transaction.contacts?.phone && (
                <p className="text-xs text-navy/40 dark:text-white/40 font-inter flex items-center gap-1 mt-0.5">
                  <Phone size={10} /> {transaction.contacts.phone}
                </p>
              )}
            </button>
          </Card>

          {/* Commission */}
          {(transaction.commission_gross || transaction.commission_net) && (
            <Card className="!p-5">
              <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3 flex items-center gap-2">
                <DollarSign size={14} className="text-gold" />
                Commission
              </h3>
              <div className="space-y-2">
                {transaction.commission_gross && (
                  <div className="flex justify-between">
                    <span className="text-xs text-navy/40 dark:text-white/40 font-inter">Gross</span>
                    <span className="text-sm font-inter text-navy dark:text-white">${transaction.commission_gross.toLocaleString()}</span>
                  </div>
                )}
                {transaction.commission_broker_split && (
                  <div className="flex justify-between">
                    <span className="text-xs text-navy/40 dark:text-white/40 font-inter">Broker Split</span>
                    <span className="text-sm font-inter text-navy dark:text-white">${transaction.commission_broker_split.toLocaleString()}</span>
                  </div>
                )}
                {transaction.commission_net && (
                  <div className="flex justify-between border-t border-gold/10 pt-2">
                    <span className="text-xs font-montserrat font-semibold text-navy/60 dark:text-white/60">Net</span>
                    <span className="text-sm font-montserrat font-bold text-gold">${transaction.commission_net.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Key Dates */}
          {transaction.key_dates && Object.keys(transaction.key_dates).length > 0 && (
            <Card className="!p-5">
              <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3 flex items-center gap-2">
                <Calendar size={14} className="text-gold" />
                Key Dates
              </h3>
              <div className="space-y-2">
                {Object.entries(transaction.key_dates).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-xs text-navy/40 dark:text-white/40 font-inter capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-inter text-navy dark:text-white">
                      {new Date(val + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Details */}
          <Card className="!p-5">
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3">Details</h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Created</p>
                <p className="text-sm font-inter text-navy dark:text-white">
                  {new Date(transaction.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-navy/40 dark:text-white/40 font-inter">Last Updated</p>
                <p className="text-sm font-inter text-navy dark:text-white">
                  {new Date(transaction.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editing} onClose={() => !saving && setEditing(false)} title="Edit Transaction" size="lg">
        <div className="space-y-4">
          {/* Linked Contact */}
          <div>
            <label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Linked Contact</label>
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
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          <Input
            label="Property Address *"
            value={(editForm.property_address as string) || ''}
            onChange={e => setEditForm(prev => ({ ...prev, property_address: e.target.value }))}
            disabled={saving}
          />
          <div className="grid grid-cols-3 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Status</label>
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
              <label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Track Type</label>
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
        title="Delete Transaction?"
        message={`Are you sure you want to delete the transaction for ${transaction.property_address}? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
