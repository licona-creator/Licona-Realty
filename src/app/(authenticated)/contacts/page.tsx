/**
 * Contacts Page - Smart sorted with attention dots, partners chip, no-follow-up alert.
 */

'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { BRAND } from '@/lib/brand';
import { useRouter } from 'next/navigation';
import { createCallLink, createSMSLink } from '@/lib/sms';
import {
  Users, Plus, Search, Upload, Phone, ChevronRight,
  MessageCircle, PhoneCall, Briefcase, X,
} from 'lucide-react';
import { AddContactModal } from '@/components/modals/AddContactModal';
import { ImportContactsModal } from '@/components/modals/ImportContactsModal';
import { VCardImportModal } from '@/components/modals/VCardImportModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getDisplayName, getInitials } from '@/lib/format';
import { SkeletonContactRow } from '@/components/ui/Skeleton';
import { useContacts } from '@/hooks/useContacts';
import type { TrackType } from '@/types/database';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  track_type: TrackType;
  pipeline_stage: string;
  language_preference: string | null;
  disc_type: string | null;
  next_follow_up_date: string | null;
  last_contact_date: string | null;
  created_at: string;
}

const trackTabs: Array<{ label: string; value: string }> = [
  { label: 'All', value: 'all' },
  { label: 'Buyers', value: 'buyer' },
  { label: 'Sellers', value: 'seller' },
  { label: 'Landlords', value: 'landlord' },
  { label: 'Tenants', value: 'tenant' },
  { label: 'Investors', value: 'investor' },
  { label: 'Sphere', value: 'sphere' },
  { label: 'Partners', value: 'partners' },
];

function smartSort(contacts: Contact[], activeDeals: Set<string>): Contact[] {
  const todayStr = new Date().toISOString().split('T')[0];
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  return [...contacts].sort((a, b) => {
    // Priority 1: Overdue follow-ups (most overdue first)
    const aOverdue = a.next_follow_up_date && a.next_follow_up_date < todayStr;
    const bOverdue = b.next_follow_up_date && b.next_follow_up_date < todayStr;
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (aOverdue && bOverdue) return (a.next_follow_up_date || '').localeCompare(b.next_follow_up_date || '');

    // Priority 2: Due today
    const aDueToday = a.next_follow_up_date === todayStr;
    const bDueToday = b.next_follow_up_date === todayStr;
    if (aDueToday && !bDueToday) return -1;
    if (!aDueToday && bDueToday) return 1;

    // Priority 3: Active deals
    const aHasDeal = activeDeals.has(a.id);
    const bHasDeal = activeDeals.has(b.id);
    if (aHasDeal && !bHasDeal) return -1;
    if (!aHasDeal && bHasDeal) return 1;

    // Priority 4: Due within 7 days
    const aDueSoon = a.next_follow_up_date && a.next_follow_up_date > todayStr && a.next_follow_up_date <= in7Days;
    const bDueSoon = b.next_follow_up_date && b.next_follow_up_date > todayStr && b.next_follow_up_date <= in7Days;
    if (aDueSoon && !bDueSoon) return -1;
    if (!aDueSoon && bDueSoon) return 1;

    // Priority 5: Last contact date DESC, then name ASC
    if (a.last_contact_date && b.last_contact_date) {
      const dateComp = b.last_contact_date.localeCompare(a.last_contact_date);
      if (dateComp !== 0) return dateComp;
    }
    if (a.last_contact_date && !b.last_contact_date) return -1;
    if (!a.last_contact_date && b.last_contact_date) return 1;

    return (a.first_name + a.last_name).localeCompare(b.first_name + b.last_name);
  });
}

export default function ContactsPage() {
  const router = useRouter();
  const [activeTrack, setActiveTrack] = useState<string>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showVCardImportModal, setShowVCardImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [noFollowUpDismissed, setNoFollowUpDismissed] = useState(false);
  const { success, error: showError } = useToast();

  // Fetch contacts - for partners, fetch from partners API
  const isPartners = activeTrack === 'partners';
  const { contacts: rawContacts, isLoading: loading, error: fetchErrorObj, mutate } = useContacts(isPartners ? 'all' : activeTrack);
  const contacts = rawContacts as unknown as Contact[];
  const fetchError = fetchErrorObj ? (fetchErrorObj as Error).message : null;

  // Partners state
  const [partners, setPartners] = useState<Array<{ id: string; first_name: string; last_name: string | null; company: string | null; role: string | null; phone: string | null; email: string | null }>>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);

  // Fetch partners when tab selected
  useState(() => {
    if (isPartners && partners.length === 0 && !partnersLoading) {
      setPartnersLoading(true);
      fetch('/api/referral-partners')
        .then(r => r.json())
        .then(d => setPartners(d.partners || []))
        .catch(() => {})
        .finally(() => setPartnersLoading(false));
    }
  });

  // Get active deal contact IDs
  const [activeDeals] = useState<Set<string>>(() => new Set());

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    let list = contacts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.first_name.toLowerCase().includes(q) ||
        c.last_name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
      );
    }
    return smartSort(list, activeDeals);
  }, [contacts, searchQuery, activeDeals]);

  const noFollowUpCount = contacts.filter(c => !c.next_follow_up_date).length;

  async function handleDelete(contact: Contact) {
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' });
      if (res.ok) {
        success('Contact Deleted', `${getDisplayName(contact)} has been removed.`);
        mutate();
      } else {
        const json = await res.json().catch(() => ({}));
        showError('Delete Failed', json.error || 'Could not delete contact.');
      }
    } catch {
      showError('Delete Failed', 'Network error. Please try again.');
    }
    setDeleteTarget(null);
  }

  function getAttentionDot(contact: Contact): { color: string; label: string } | null {
    if (contact.next_follow_up_date && contact.next_follow_up_date < todayStr) {
      return { color: '#ef4444', label: 'Overdue' };
    }
    if (contact.next_follow_up_date === todayStr) {
      return { color: '#d3a971', label: 'Due today' };
    }
    if (activeDeals.has(contact.id)) {
      return { color: '#3B82F6', label: 'Active deal' };
    }
    return null;
  }

  return (
    <div className="p-3 pt-2 pb-28 lg:p-8 lg:pb-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-[#d3a971]" />
          <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: BRAND.fonts.playfair }}>
            Contacts
          </h1>
          {contacts.length > 0 && (
            <span className="text-sm text-white/40 font-inter">({contacts.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setShowVCardImportModal(true)} className="whitespace-nowrap">
            <Upload size={16} />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button variant="accent" size="sm" onClick={() => setShowAddModal(true)} className="whitespace-nowrap">
            <Plus size={16} />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <Input
            placeholder="Search contacts..."
            className="!pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Track Chips */}
      <div className="relative mb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide [&]:[-webkit-overflow-scrolling:touch]">
          {trackTabs.map((tab) => (
            <button
              type="button"
              key={tab.value}
              onClick={() => {
                setActiveTrack(tab.value);
                if (tab.value === 'partners' && partners.length === 0) {
                  setPartnersLoading(true);
                  fetch('/api/referral-partners')
                    .then(r => r.json())
                    .then(d => setPartners(d.partners || []))
                    .catch(() => {})
                    .finally(() => setPartnersLoading(false));
                }
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-montserrat font-medium whitespace-nowrap transition-all duration-200 ${
                activeTrack === tab.value
                  ? 'bg-[#d3a971] text-[#132236] font-semibold'
                  : 'border border-[#d3a971]/30 text-[#d3a971]/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[#132236] to-transparent pointer-events-none lg:hidden" />
      </div>

      {/* No follow-up alert */}
      {!noFollowUpDismissed && noFollowUpCount > 0 && !isPartners && (
        <div
          className="mb-3 px-4 py-2.5 rounded-xl bg-[#d3a971] text-[#132236] flex items-center justify-between cursor-pointer active:opacity-90"
          onClick={() => router.push('/contacts?filter=no_followup')}
        >
          <p className="font-montserrat font-semibold text-xs">
            {noFollowUpCount} contact{noFollowUpCount !== 1 ? 's' : ''} have no follow-up scheduled
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setNoFollowUpDismissed(true); }}
            className="p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error State */}
      {fetchError && (
        <div className="mb-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400 font-inter">{fetchError}</p>
          <button type="button" onClick={() => mutate()} className="text-xs text-red-500 hover:underline font-inter mt-1">Try again</button>
        </div>
      )}

      {/* Partners View */}
      {isPartners ? (
        partnersLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonContactRow key={i} />)}</div>
        ) : partners.length > 0 ? (
          <div className="space-y-2">
            {partners.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3), duration: 0.2 }}
              >
                <div
                  className="rounded-2xl p-3 cursor-pointer active:bg-[rgba(255,255,255,0.03)] transition-colors"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
                  onClick={() => router.push(`/partners/${p.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#d3a971]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-montserrat font-semibold text-[#d3a971]">
                        {(p.first_name?.[0] || '').toUpperCase()}{(p.last_name?.[0] || '').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-montserrat font-semibold text-white truncate">
                        {p.first_name} {p.last_name || ''}
                      </p>
                      {(p.company || p.role) && (
                        <p className="text-xs text-white/50 font-inter truncate">
                          {p.role}{p.role && p.company ? ' at ' : ''}{p.company}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {p.phone && (
                        <a href={createCallLink(p.phone)} onClick={e => e.stopPropagation()} className="p-2 rounded-lg hover:bg-green-500/10 text-white/30 hover:text-green-500 transition-colors">
                          <PhoneCall size={16} />
                        </a>
                      )}
                      {p.phone && (
                        <a href={createSMSLink(p.phone)} onClick={e => e.stopPropagation()} className="p-2 rounded-lg hover:bg-blue-500/10 text-white/30 hover:text-blue-500 transition-colors">
                          <MessageCircle size={16} />
                        </a>
                      )}
                      <ChevronRight size={14} className="text-white/20" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="!p-8 text-center">
            <p className="text-sm text-white/50 font-inter">No partners yet. Add referral partners from the Partners page.</p>
          </Card>
        )
      ) : (
        <>
          {/* Contact List */}
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <SkeletonContactRow key={i} />)}</div>
          ) : filtered.length > 0 ? (
            <div className="space-y-2">
              {filtered.map((contact, idx) => {
                const dot = getAttentionDot(contact);
                return (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3), duration: 0.2 }}
                  >
                    <div
                      className="rounded-2xl p-2.5 sm:p-3 cursor-pointer active:bg-[rgba(255,255,255,0.03)] transition-colors"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-[#d3a971]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-montserrat font-semibold text-[#d3a971]">
                            {getInitials(contact)}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {/* Attention dot */}
                            {dot && (
                              dot.label === 'Active deal'
                                ? <Briefcase size={10} className="text-blue-500 flex-shrink-0" />
                                : <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot.color }} title={dot.label} />
                            )}
                            <p className="text-sm font-montserrat font-semibold text-white truncate">
                              {getDisplayName(contact)}
                            </p>
                            {contact.disc_type && (
                              <span
                                className="text-[10px] font-montserrat font-bold flex-shrink-0"
                                style={{
                                  color: contact.disc_type === 'D' ? '#c0392b' : contact.disc_type === 'I' ? '#d3a971' : contact.disc_type === 'S' ? '#27ae60' : '#2980b9',
                                }}
                              >
                                {contact.disc_type}
                              </span>
                            )}
                            {(contact.language_preference === 'es' || contact.language_preference === 'spanish') && (
                              <span className="text-[9px] font-montserrat font-semibold text-[#d3a971] bg-[#d3a971]/10 px-1 py-0.5 rounded-full flex-shrink-0">ES</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {contact.phone && (
                              <span className="text-xs text-white/40 font-inter flex items-center gap-1">
                                <Phone size={10} className="flex-shrink-0" />
                                {contact.phone}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Track badge */}
                        <span className="text-[9px] font-montserrat font-semibold uppercase px-2 py-1 rounded-full bg-[#d3a971]/10 text-[#d3a971] flex-shrink-0 hidden sm:block">
                          {contact.track_type}
                        </span>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {contact.phone && (
                            <a
                              href={createCallLink(contact.phone)}
                              onClick={e => e.stopPropagation()}
                              className="p-2 rounded-lg hover:bg-green-500/10 text-white/30 hover:text-green-500 transition-colors"
                              title="Call"
                            >
                              <PhoneCall size={15} />
                            </a>
                          )}
                          {contact.phone && (
                            <a
                              href={createSMSLink(contact.phone)}
                              onClick={e => e.stopPropagation()}
                              className="p-2 rounded-lg hover:bg-blue-500/10 text-white/30 hover:text-blue-500 transition-colors"
                              title="Text"
                            >
                              <MessageCircle size={15} />
                            </a>
                          )}
                          <ChevronRight size={14} className="text-white/20" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="!p-8 text-center">
                <Users size={40} className="text-[#d3a971] mx-auto mb-4 opacity-50" />
                <h2 className="text-lg font-montserrat font-semibold text-white mb-2">
                  {searchQuery ? 'No Matching Contacts' : 'No Contacts Yet'}
                </h2>
                <p className="text-sm text-white/50 font-inter max-w-md mx-auto mb-6">
                  {searchQuery
                    ? `No contacts match "${searchQuery}".`
                    : 'Add your first contact or import to get started.'}
                </p>
                {!searchQuery && (
                  <div className="flex items-center justify-center gap-3">
                    <Button variant="ghost" onClick={() => setShowVCardImportModal(true)}>
                      <Upload size={16} /> Import
                    </Button>
                    <Button variant="accent" onClick={() => setShowAddModal(true)}>
                      <Plus size={16} /> Add Contact
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </>
      )}

      <AddContactModal open={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={() => mutate()} />
      <ImportContactsModal open={showImportModal} onClose={() => setShowImportModal(false)} onSuccess={() => mutate()} />
      <VCardImportModal open={showVCardImportModal} onClose={() => setShowVCardImportModal(false)} onSuccess={() => mutate()} />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete Contact?"
        message={deleteTarget ? `Are you sure you want to delete ${getDisplayName(deleteTarget)}?` : ''}
        variant="danger"
      />
    </div>
  );
}
