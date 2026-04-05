'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { AddressAutocomplete } from '@/components/shared/AddressAutocomplete';
import { TRANSACTION_TYPE_LABELS } from '@/lib/documents/texas-checklist';
import { getDisplayName } from '@/lib/format';
import type { TransactionType } from '@/lib/documents/texas-checklist';

interface NewTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type TrackType = 'buyer' | 'seller' | 'landlord' | 'tenant' | 'investor';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
}

interface FormData {
  contact_id: string;
  property_address: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  contract_price: string;
  closing_date: string;
  option_expiry_date: string;
  track_type: TrackType;
  transaction_type: TransactionType;
  status: string;
  listing_agent_name: string;
  listing_agent_email: string;
  listing_agent_phone: string;
  lender_name: string;
  lender_contact: string;
  title_company: string;
  title_contact: string;
  notes: string;
}

const INITIAL_FORM: FormData = {
  contact_id: '',
  property_address: '',
  property_city: '',
  property_state: 'TX',
  property_zip: '',
  contract_price: '',
  closing_date: '',
  option_expiry_date: '',
  track_type: 'buyer',
  transaction_type: 'buyers_agent_sale',
  status: 'active',
  listing_agent_name: '',
  listing_agent_email: '',
  listing_agent_phone: '',
  lender_name: '',
  lender_contact: '',
  title_company: '',
  title_contact: '',
  notes: '',
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'option_period', label: 'Option Period' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'clear_to_close', label: 'Clear to Close' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const selectClasses = `
  w-full px-4 py-2.5 rounded-[8px]
  bg-white dark:bg-dark-card
  border border-gold/15
  text-navy dark:text-white
  font-inter text-sm
  focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
  transition-all duration-200 ease-in-out
`;

export function NewTransactionModal({ open, onClose, onSuccess }: NewTransactionModalProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // Fetch contacts when modal opens
  useEffect(() => {
    if (!open) return;
    setContactsLoading(true);
    fetch('/api/contacts?limit=100')
      .then(res => res.json())
      .then(data => {
        setContacts(data.contacts || []);
      })
      .catch(() => {
        setContacts([]);
      })
      .finally(() => setContactsLoading(false));
  }, [open]);

  function update<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function resetAndClose() {
    setForm(INITIAL_FORM);
    onClose();
  }

  const hasContacts = contacts.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!form.contact_id) {
      toast.error('Validation Error', 'Please select a contact.');
      return;
    }

    if (!form.property_address.trim()) {
      toast.error('Validation Error', 'Property address is required.');
      return;
    }

    setLoading(true);

    try {
      // Build parties array from form fields
      const parties = [];
      if (form.listing_agent_name.trim()) {
        parties.push({
          id: crypto.randomUUID(),
          role: 'listing_agent',
          name: form.listing_agent_name.trim(),
          email: form.listing_agent_email.trim() || null,
          phone: form.listing_agent_phone.trim() || null,
          company: null,
        });
      }
      if (form.lender_name.trim()) {
        parties.push({
          id: crypto.randomUUID(),
          role: 'lender',
          name: form.lender_name.trim(),
          email: null,
          phone: form.lender_contact.trim() || null,
          company: null,
        });
      }
      if (form.title_company.trim()) {
        parties.push({
          id: crypto.randomUUID(),
          role: 'title',
          name: form.title_company.trim(),
          email: null,
          phone: form.title_contact.trim() || null,
          company: form.title_company.trim(),
        });
      }

      const payload = {
        contact_id: form.contact_id,
        track_type: form.track_type,
        transaction_type: form.transaction_type,
        property_address: form.property_address.trim(),
        property_city: form.property_city.trim() || null,
        property_state: form.property_state.trim() || null,
        property_zip: form.property_zip.trim() || null,
        contract_price: form.contract_price ? Number(form.contract_price) : null,
        closing_date: form.closing_date || null,
        parties: parties.length > 0 ? parties : undefined,
        notes: form.notes.trim() || null,
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Failed to create transaction.');
      }

      toast.success('Deal Created', 'The new deal has been added successfully.');
      onSuccess?.();
      resetAndClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      toast.error('Error', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="New Deal" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Contact Selector */}
        <div className="w-full">
          <label
            htmlFor="transaction-contact"
            className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5"
          >
            Contact *
          </label>
          <select
            id="transaction-contact"
            value={form.contact_id}
            onChange={e => update('contact_id', e.target.value)}
            disabled={!hasContacts || contactsLoading}
            required
            className={selectClasses}
          >
            {contactsLoading ? (
              <option value="">Loading contacts...</option>
            ) : hasContacts ? (
              <>
                <option value="">Select a contact</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {getDisplayName(c)}
                  </option>
                ))}
              </>
            ) : (
              <option value="">Add a contact first</option>
            )}
          </select>
          {!contactsLoading && !hasContacts && (
            <p className="text-xs text-red-500/80 font-inter mt-1">
              You need at least one contact before creating a deal.
            </p>
          )}
        </div>

        {/* Property Address */}
        <AddressAutocomplete
          label="Property Address *"
          placeholder="Start typing an address..."
          value={form.property_address}
          onRawChange={val => update('property_address', val)}
          onChange={({ street, city, state, zip }) => {
            setForm(prev => ({
              ...prev,
              property_address: street,
              property_city: city || prev.property_city,
              property_state: state || prev.property_state,
              property_zip: zip || prev.property_zip,
            }));
          }}
        />

        {/* City / State / Zip row */}
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="City"
            placeholder="Dallas"
            value={form.property_city}
            onChange={e => update('property_city', e.target.value)}
          />
          <Input
            label="State"
            placeholder="TX"
            value={form.property_state}
            onChange={e => update('property_state', e.target.value)}
          />
          <Input
            label="Zip"
            placeholder="75201"
            value={form.property_zip}
            onChange={e => update('property_zip', e.target.value)}
          />
        </div>

        {/* Contract Price */}
        <Input
          label="Contract Price"
          type="number"
          min={0}
          step="0.01"
          placeholder="350000"
          value={form.contract_price}
          onChange={e => update('contract_price', e.target.value)}
        />

        {/* Dates row */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Closing Date"
            type="date"
            value={form.closing_date}
            onChange={e => update('closing_date', e.target.value)}
          />
          <Input
            label="Option Expiry Date"
            type="date"
            value={form.option_expiry_date}
            onChange={e => update('option_expiry_date', e.target.value)}
          />
        </div>

        {/* Transaction Type */}
        <div className="w-full">
          <label
            htmlFor="transaction-type"
            className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5"
          >
            Transaction Type *
          </label>
          <select
            id="transaction-type"
            value={form.transaction_type}
            onChange={e => update('transaction_type', e.target.value as TransactionType)}
            required
            className={selectClasses}
          >
            {(Object.entries(TRANSACTION_TYPE_LABELS) as [TransactionType, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Track Type & Status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="w-full">
            <label
              htmlFor="transaction-track-type"
              className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5"
            >
              Track Type
            </label>
            <select
              id="transaction-track-type"
              value={form.track_type}
              onChange={e => update('track_type', e.target.value as TrackType)}
              className={selectClasses}
            >
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="landlord">Landlord</option>
              <option value="tenant">Tenant</option>
              <option value="investor">Investor</option>
            </select>
          </div>
          <div className="w-full">
            <label
              htmlFor="transaction-status"
              className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5"
            >
              Status
            </label>
            <select
              id="transaction-status"
              value={form.status}
              onChange={e => update('status', e.target.value)}
              className={selectClasses}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Listing Agent */}
        <div className="border-t border-gold/10 pt-4">
          <p className="text-xs font-montserrat font-semibold text-navy/50 dark:text-white/50 mb-3 uppercase tracking-wider">Listing Agent</p>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Name" placeholder="Agent name" value={form.listing_agent_name} onChange={e => update('listing_agent_name', e.target.value)} />
            <Input label="Email" type="email" placeholder="Email" value={form.listing_agent_email} onChange={e => update('listing_agent_email', e.target.value)} />
            <Input label="Phone" type="tel" placeholder="Phone" value={form.listing_agent_phone} onChange={e => update('listing_agent_phone', e.target.value)} />
          </div>
        </div>

        {/* Lender & Title */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-montserrat font-semibold text-navy/50 dark:text-white/50 mb-3 uppercase tracking-wider">Lender</p>
            <Input label="Lender Name" placeholder="Lender name" value={form.lender_name} onChange={e => update('lender_name', e.target.value)} className="mb-3" />
            <Input label="Lender Contact" placeholder="Phone or email" value={form.lender_contact} onChange={e => update('lender_contact', e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-montserrat font-semibold text-navy/50 dark:text-white/50 mb-3 uppercase tracking-wider">Title Company</p>
            <Input label="Title Company" placeholder="Company name" value={form.title_company} onChange={e => update('title_company', e.target.value)} className="mb-3" />
            <Input label="Title Contact" placeholder="Phone or email" value={form.title_contact} onChange={e => update('title_contact', e.target.value)} />
          </div>
        </div>

        {/* Notes */}
        <div className="w-full">
          <label
            htmlFor="transaction-notes"
            className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5"
          >
            Notes
          </label>
          <textarea
            id="transaction-notes"
            rows={3}
            placeholder="Additional notes..."
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            className={`${selectClasses} placeholder:text-navy/40 dark:placeholder:text-white/40 resize-none`}
          />
        </div>

        {/* Actions */}
        <div className="h-4" />
        <div className="flex justify-end gap-3 pt-3 border-t border-gold/10">
          <Button type="button" variant="ghost" onClick={resetAndClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="accent"
            loading={loading}
            disabled={!hasContacts || contactsLoading}
          >
            {loading ? 'Creating...' : 'Create Deal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
