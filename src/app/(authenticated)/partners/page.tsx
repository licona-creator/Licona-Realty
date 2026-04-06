'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { BRAND } from '@/lib/brand';
import { Handshake, Plus, DollarSign, Users, TrendingUp, Phone, Mail, ChevronRight, Trash2 } from 'lucide-react';
import { getDisplayName } from '@/lib/format';

interface Partner {
  id: string;
  first_name: string;
  last_name: string | null;
  company: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  language_preference: string | null;
  total_leads_sent: number;
  total_closings: number;
  total_revenue_generated: number;
  created_at: string;
}

const selectClassName = `
  w-full px-4 py-3 rounded-xl bg-[var(--lr-depth-1)] border border-[rgba(255,255,255,0.1)]
  text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(211,169,113,0.2)]
  focus:border-[#d3a971] transition-all duration-200 ease-in-out appearance-none
`.replace(/\n\s+/g, ' ').trim();

export default function PartnersPage() {
  const router = useRouter();
  const toast = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', company: '', role: '', phone: '', email: '',
    language_preference: 'spanish', referral_fee_structure: '', notes: '',
  });

  const fetchPartners = useCallback(async () => {
    try {
      const res = await fetch('/api/referral-partners');
      if (res.ok) {
        const data = await res.json();
        setPartners(data.partners || []);
      }
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim()) { toast.error('Validation', 'First name is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/referral-partners', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed'); }
      toast.success('Partner Added', `${form.first_name} has been added as a referral partner.`);
      setForm({ first_name: '', last_name: '', company: '', role: '', phone: '', email: '', language_preference: 'spanish', referral_fee_structure: '', notes: '' });
      setShowAdd(false);
      fetchPartners();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Something went wrong.');
    } finally { setSaving(false); }
  }

  async function handleDelete(partner: Partner) {
    try {
      const res = await fetch(`/api/referral-partners/${partner.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Partner Deleted', `${partner.first_name} has been removed.`);
        fetchPartners();
      } else { toast.error('Error', 'Could not delete partner.'); }
    } catch { toast.error('Error', 'Network error.'); }
    setDeleteTarget(null);
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Handshake size={24} className="text-gold" />
          <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: BRAND.fonts.playfair }}>
            Referral Partners
          </h1>
          {partners.length > 0 && (
            <span className="text-sm text-white/40 font-inter">({partners.length})</span>
          )}
        </div>
        <Button variant="accent" size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> <span className="hidden sm:inline">Add Partner</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-white/50 font-inter">Loading partners...</span>
        </div>
      ) : partners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {partners.map(p => (
            <Card key={p.id} className="!p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/partners/${p.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-montserrat font-semibold text-white">
                    {getDisplayName(p)}
                  </h3>
                  {p.company && <p className="text-xs text-white/50 font-inter">{p.company}{p.role ? ` - ${p.role}` : ''}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }} className="p-1.5 rounded hover:bg-red-500/10 text-white/30 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={14} className="text-white/20" />
                </div>
              </div>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {p.phone && <span className="text-xs text-white/50 font-inter flex items-center gap-1"><Phone size={10} />{p.phone}</span>}
                {p.email && <span className="text-xs text-white/50 font-inter flex items-center gap-1"><Mail size={10} />{p.email}</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gold/10">
                <div className="text-center">
                  <p className="text-lg font-bold text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>{p.total_leads_sent}</p>
                  <p className="text-[10px] text-white/40 font-inter">Leads</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white" style={{ fontFamily: BRAND.fonts.dmSerif }}>{p.total_closings}</p>
                  <p className="text-[10px] text-white/40 font-inter">Closings</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gold" style={{ fontFamily: BRAND.fonts.dmSerif }}>${(p.total_revenue_generated || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-white/40 font-inter">Revenue</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="!p-8 text-center">
          <Handshake size={40} className="text-gold mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-montserrat font-semibold text-white mb-2">No Referral Partners Yet</h2>
          <p className="text-sm text-white/50 font-inter max-w-md mx-auto mb-6">
            Add your referral partners to track who sends you leads and measure their performance.
          </p>
          <Button variant="accent" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Partner</Button>
        </Card>
      )}

      <Modal open={showAdd} onClose={() => !saving && setShowAdd(false)} title="Add Referral Partner" size="lg">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name *" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} disabled={saving} />
            <Input label="Last Name" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} disabled={saving} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Company" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} disabled={saving} />
            <Input label="Role" placeholder="e.g. Loan Officer" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} disabled={saving} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} disabled={saving} />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} disabled={saving} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-montserrat font-medium text-white mb-1.5">Language</label>
              <select value={form.language_preference} onChange={e => setForm(p => ({ ...p, language_preference: e.target.value }))} className={selectClassName} disabled={saving}>
                <option value="spanish" className="bg-[#132236] text-white">Spanish</option>
                <option value="english" className="bg-[#132236] text-white">English</option>
                <option value="bilingual" className="bg-[#132236] text-white">Bilingual</option>
              </select>
            </div>
            <Input label="Fee Structure" placeholder="e.g. 25% referral fee" value={form.referral_fee_structure} onChange={e => setForm(p => ({ ...p, referral_fee_structure: e.target.value }))} disabled={saving} />
          </div>
          <div>
            <label className="block text-sm font-montserrat font-medium text-white mb-1.5">Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} disabled={saving} placeholder="Additional notes..." className={`${selectClassName} resize-none placeholder:text-white/40`} />
          </div>
          <div className="h-4" />
          <div className="flex justify-end gap-3 pt-3 border-t border-gold/10">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="accent" loading={saving}>{saving ? 'Adding...' : 'Add Partner'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete Partner?" message={deleteTarget ? `Are you sure you want to delete ${deleteTarget.first_name}? Contacts will be unlinked.` : ''} variant="danger" />
    </div>
  );
}
