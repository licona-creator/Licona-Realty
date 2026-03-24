'use client';

import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface NewTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type TransactionSide = 'buying' | 'selling' | 'dual';

interface FormData {
  property_address: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  contract_price: string;
  closing_date: string;
  side: TransactionSide;
  notes: string;
}

const INITIAL_FORM: FormData = {
  property_address: '',
  property_city: '',
  property_state: 'TX',
  property_zip: '',
  contract_price: '',
  closing_date: '',
  side: 'buying',
  notes: '',
};

export function NewTransactionModal({ open, onClose, onSuccess }: NewTransactionModalProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function resetAndClose() {
    setForm(INITIAL_FORM);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!form.property_address.trim()) {
      toast.error('Validation Error', 'Property address is required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        property_address: form.property_address.trim(),
        property_city: form.property_city.trim() || null,
        property_state: form.property_state.trim() || null,
        property_zip: form.property_zip.trim() || null,
        contract_price: form.contract_price ? Number(form.contract_price) : null,
        closing_date: form.closing_date || null,
        side: form.side,
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

      toast.success('Transaction Created', 'The new transaction has been added successfully.');
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
    <Modal open={open} onClose={resetAndClose} title="New Transaction" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Property Address */}
        <Input
          label="Property Address *"
          placeholder="123 Main St"
          value={form.property_address}
          onChange={e => update('property_address', e.target.value)}
          required
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

        {/* Closing Date */}
        <Input
          label="Closing Date"
          type="date"
          value={form.closing_date}
          onChange={e => update('closing_date', e.target.value)}
        />

        {/* Side */}
        <div className="w-full">
          <label
            htmlFor="transaction-side"
            className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5"
          >
            Side
          </label>
          <select
            id="transaction-side"
            value={form.side}
            onChange={e => update('side', e.target.value as TransactionSide)}
            className="
              w-full px-4 py-2.5 rounded-[8px]
              bg-white dark:bg-dark-card
              border border-gold/15
              text-navy dark:text-white
              font-inter text-sm
              focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
              transition-all duration-200 ease-in-out
            "
          >
            <option value="buying">Buying</option>
            <option value="selling">Selling</option>
            <option value="dual">Dual</option>
          </select>
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
            className="
              w-full px-4 py-2.5 rounded-[8px]
              bg-white dark:bg-dark-card
              border border-gold/15
              text-navy dark:text-white
              font-inter text-sm
              placeholder:text-navy/40 dark:placeholder:text-white/40
              focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
              transition-all duration-200 ease-in-out
              resize-none
            "
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={resetAndClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" loading={loading}>
            {loading ? 'Creating...' : 'Create Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
