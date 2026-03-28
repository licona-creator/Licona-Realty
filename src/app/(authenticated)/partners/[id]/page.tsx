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
import { ArrowLeft, Edit3, Trash2, Phone, Mail, DollarSign, Users, TrendingUp, Handshake, Globe, ChevronRight } from 'lucide-react';

interface PartnerData {
  id: string; first_name: string; last_name: string | null; company: string | null;
  role: string | null; phone: string | null; email: string | null;
  language_preference: string | null; referral_fee_structure: string | null;
  notes: string | null; total_leads_sent: number; total_closings: number;
  total_revenue_generated: number; created_at: string; updated_at: string;
}
interface ReferredContact {
  id: string; first_name: string; last_name: string; track_type: string;
  pipeline_stage: string; phone: string | null; email: string | null; created_at: string;
}
interface ReferredTransaction {
  id: string; property_address: string; status: string; contract_price: number | null;
  closing_date: string | null; contact_id: string;
}

const selectClassName = `w-full px-4 py-2.5 rounded-[8px] bg-white dark:bg-dark-card border border-gold/15 text-navy dark:text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all duration-200 ease-in-out appearance-none`;

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [contacts, setContacts] = useState<ReferredContact[]>([]);
  const [transactions, setTransactions] = useState<ReferredTransaction[]>([]);
  const [totalReferralFees, setTotalReferralFees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const fetchPartner = useCallback(async () => {
    try {
      const res = await fetch(`/api/referral-partners/${id}`);
      if (!res.ok) throw new Error('Failed to load partner');
      const data = await res.json();
      setPartner(data.partner);
      setContacts(data.contacts || []);
      setTransactions(data.transactions || []);
      setTotalReferralFees(data.totalReferralFees || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchPartner(); }, [fetchPartner]);

  function startEdit() {
    if (!partner) return;
    setEditForm({
      first_name: partner.first_name, last_name: partner.last_name || '',
      company: partner.company || '', role: partner.role || '',
      phone: partner.phone || '', email: partner.email || '',
      language_preference: partner.language_preference || 'spanish',
      referral_fee_structure: partner.referral_fee_structure || '',
      notes: partner.notes || '',
    });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/referral-partners/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Failed to update');
      setEditing(false);
      toast.success('Partner Updated', 'Changes saved.');
      fetchPartner();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Something went wrong.');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/referral-partners/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Partner Deleted', 'Partner has been removed.');
      router.push('/partners');
    } catch (err) { toast.error('Error', err instanceof Error ? err.message : 'Something went wrong.'); }
    setShowDelete(false);
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" /><span className="ml-2 text-sm text-navy/50 dark:text-white/50 font-inter">Loading...</span></div>;
  if (error || !partner) return <div className="p-4 lg:p-8 max-w-4xl mx-auto"><button onClick={() => router.push('/partners')} className="flex items-center gap-2 text-sm text-gold font-montserrat font-medium mb-6 hover:underline"><ArrowLeft size={16} /> Back</button><Card className="!p-8 text-center"><p className="text-red-500">{error || 'Not found'}</p></Card></div>;

  const fullName = `${partner.first_name} ${partner.last_name || ''}`.trim();

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <button onClick={() => router.push('/partners')} className="flex items-center gap-2 text-sm text-gold font-montserrat font-medium mb-6 hover:underline">
        <ArrowLeft size={16} /> Back to Partners
      </button>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center"><Handshake size={24} className="text-gold" /></div>
          <div>
            <h1 className="text-2xl font-semibold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.playfair }}>{fullName}</h1>
            {partner.company && <p className="text-sm text-navy/50 dark:text-white/50 font-inter">{partner.company}{partner.role ? ` - ${partner.role}` : ''}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={startEdit}><Edit3 size={14} /><span className="hidden sm:inline ml-1">Edit</span></Button>
          <Button variant="ghost" size="sm" onClick={() => setShowDelete(true)} className="!text-red-500 hover:!bg-red-500/10"><Trash2 size={14} /></Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="!p-4 text-center"><Users size={16} className="text-gold mx-auto mb-1" /><p className="text-2xl font-bold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>{partner.total_leads_sent}</p><p className="text-[10px] text-navy/40 dark:text-white/40 font-inter">Leads Sent</p></Card>
        <Card className="!p-4 text-center"><TrendingUp size={16} className="text-green-500 mx-auto mb-1" /><p className="text-2xl font-bold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>{partner.total_closings}</p><p className="text-[10px] text-navy/40 dark:text-white/40 font-inter">Closings</p></Card>
        <Card className="!p-4 text-center"><DollarSign size={16} className="text-gold mx-auto mb-1" /><p className="text-2xl font-bold text-gold" style={{ fontFamily: BRAND.fonts.dmSerif }}>${(partner.total_revenue_generated || 0).toLocaleString()}</p><p className="text-[10px] text-navy/40 dark:text-white/40 font-inter">Revenue</p></Card>
        <Card className="!p-4 text-center"><DollarSign size={16} className="text-blue-500 mx-auto mb-1" /><p className="text-2xl font-bold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>{partner.total_revenue_generated > 0 && totalReferralFees > 0 ? `${Math.round(partner.total_revenue_generated / totalReferralFees)}x` : 'N/A'}</p><p className="text-[10px] text-navy/40 dark:text-white/40 font-inter">ROI (Rev/Fees)</p></Card>
      </div>

      {/* Referral Fee Summary */}
      {totalReferralFees > 0 && (
        <Card className="!p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-montserrat font-medium text-navy/70 dark:text-white/70">Total Referral Fees Paid</span>
            <span className="text-lg font-bold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>${totalReferralFees.toLocaleString()}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Contact Info */}
          <Card className="!p-5">
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {partner.phone && <div className="flex items-center gap-3"><Phone size={14} className="text-gold" /><div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Phone</p><p className="text-sm font-inter text-navy dark:text-white">{partner.phone}</p></div></div>}
              {partner.email && <div className="flex items-center gap-3"><Mail size={14} className="text-gold" /><div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Email</p><p className="text-sm font-inter text-navy dark:text-white">{partner.email}</p></div></div>}
              {partner.language_preference && <div className="flex items-center gap-3"><Globe size={14} className="text-gold" /><div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Language</p><p className="text-sm font-inter text-navy dark:text-white capitalize">{partner.language_preference}</p></div></div>}
              {partner.referral_fee_structure && <div className="flex items-center gap-3"><DollarSign size={14} className="text-gold" /><div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Fee Structure</p><p className="text-sm font-inter text-navy dark:text-white">{partner.referral_fee_structure}</p></div></div>}
            </div>
            {partner.notes && <div className="mt-4 pt-4 border-t border-gold/10"><p className="text-xs text-navy/40 dark:text-white/40 font-inter mb-1">Notes</p><p className="text-sm font-inter text-navy/70 dark:text-white/70 whitespace-pre-wrap">{partner.notes}</p></div>}
          </Card>

          {/* Referred Contacts */}
          <Card className="!p-5">
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3">Referred Contacts ({contacts.length})</h3>
            {contacts.length > 0 ? (
              <div className="space-y-2">
                {contacts.map(c => (
                  <button key={c.id} onClick={() => router.push(`/contacts/${c.id}`)} className="w-full flex items-center justify-between p-3 rounded-lg bg-surface dark:bg-navy/30 hover:bg-gold/5 transition-colors text-left">
                    <div>
                      <p className="text-sm font-montserrat font-medium text-navy dark:text-white">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-navy/40 dark:text-white/40 font-inter capitalize">{c.track_type} - {c.pipeline_stage.replace(/_/g, ' ')}</p>
                    </div>
                    <ChevronRight size={14} className="text-navy/20 dark:text-white/20" />
                  </button>
                ))}
              </div>
            ) : <p className="text-sm text-navy/40 dark:text-white/40 font-inter">No contacts referred yet.</p>}
          </Card>

          {/* Transactions from referrals */}
          {transactions.length > 0 && (
            <Card className="!p-5">
              <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3">Transactions ({transactions.length})</h3>
              <div className="space-y-2">
                {transactions.map(tx => (
                  <button key={tx.id} onClick={() => router.push(`/transactions/${tx.id}`)} className="w-full flex items-center justify-between p-3 rounded-lg bg-surface dark:bg-navy/30 hover:bg-gold/5 transition-colors text-left">
                    <div>
                      <p className="text-sm font-montserrat font-medium text-navy dark:text-white">{tx.property_address}</p>
                      <p className="text-xs text-navy/40 dark:text-white/40 font-inter">{tx.contract_price ? `$${tx.contract_price.toLocaleString()}` : 'Price TBD'}</p>
                    </div>
                    <Badge variant={tx.status === 'closed' ? 'success' : tx.status === 'lost' ? 'danger' : 'gold'}>{tx.status}</Badge>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="!p-5">
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3">Details</h3>
            <div className="space-y-2">
              <div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Added</p><p className="text-sm font-inter text-navy dark:text-white">{new Date(partner.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p></div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editing} onClose={() => !saving && setEditing(false)} title="Edit Partner" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name *" value={editForm.first_name || ''} onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} disabled={saving} />
            <Input label="Last Name" value={editForm.last_name || ''} onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} disabled={saving} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Company" value={editForm.company || ''} onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))} disabled={saving} />
            <Input label="Role" value={editForm.role || ''} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} disabled={saving} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} disabled={saving} />
            <Input label="Email" value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} disabled={saving} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Language</label><select value={editForm.language_preference || 'spanish'} onChange={e => setEditForm(p => ({ ...p, language_preference: e.target.value }))} className={selectClassName} disabled={saving}><option value="spanish">Spanish</option><option value="english">English</option><option value="bilingual">Bilingual</option></select></div>
            <Input label="Fee Structure" value={editForm.referral_fee_structure || ''} onChange={e => setEditForm(p => ({ ...p, referral_fee_structure: e.target.value }))} disabled={saving} />
          </div>
          <div><label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Notes</label><textarea rows={3} value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} className={`${selectClassName} resize-none`} disabled={saving} /></div>
          <div className="h-4" />
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-gold/10 mt-2">
          <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
          <Button variant="accent" onClick={handleSave} loading={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Partner?" message={`Delete ${fullName}? Contacts will be unlinked.`} variant="danger" />
    </div>
  );
}
