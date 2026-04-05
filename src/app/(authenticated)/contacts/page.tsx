/**
 * Contacts Page
 *
 * Five lead entity tracks: Buyers, Sellers, Landlords, Tenants, Investors.
 * Plus Sphere and Referral track - completely separate.
 * Fetches real contacts from /api/contacts and displays them.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { BRAND } from '@/lib/brand';
import { useRouter } from 'next/navigation';
import { Users, Plus, Search, Upload, Filter, Phone, Mail, Trash2, ChevronRight, MessageCircle, PhoneCall, AlertCircle } from 'lucide-react';
import { AddContactModal } from '@/components/modals/AddContactModal';
import { ImportContactsModal } from '@/components/modals/ImportContactsModal';
import { VCardImportModal } from '@/components/modals/VCardImportModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { calculateLeadScore, getScoreTailwind } from '@/lib/ai/lead-scoring';
import { getDisplayName, getInitials } from '@/lib/format';
import { SkeletonContactRow } from '@/components/ui/Skeleton';
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
  lead_source: string | null;
  location_preference: string | null;
  budget: string | null;
  next_follow_up_date: string | null;
  created_at: string;
  disc_type: string | null;
  disc_secondary: string | null;
  engagement_temperature: string | null;
}

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

const trackTabs: Array<{ label: string; value: TrackType | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Buyers', value: 'buyer' },
  { label: 'Sellers', value: 'seller' },
  { label: 'Landlords', value: 'landlord' },
  { label: 'Tenants', value: 'tenant' },
  { label: 'Investors', value: 'investor' },
  { label: 'Sphere', value: 'sphere' },
];

export default function ContactsPage() {
  const router = useRouter();
  const [activeTrack, setActiveTrack] = useState<string>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showVCardImportModal, setShowVCardImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const fetchContacts = useCallback(async () => {
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (activeTrack !== 'all') params.set('track_type', activeTrack);
      const res = await fetch(`/api/contacts?${params}`);
      if (res.ok) {
        const json = await res.json();
        setContacts(json.contacts || []);
      } else {
        const json = await res.json().catch(() => ({}));
        setFetchError(json.error || `Failed to load contacts (${res.status})`);
      }
    } catch {
      setFetchError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTrack]);

  useEffect(() => {
    setLoading(true);
    fetchContacts();
  }, [fetchContacts]);

  async function handleDelete(contact: Contact) {
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' });
      if (res.ok) {
        success('Contact Deleted', `${getDisplayName(contact)} has been removed.`);
        fetchContacts();
      } else {
        const json = await res.json().catch(() => ({}));
        showError('Delete Failed', json.error || 'Could not delete contact.');
      }
    } catch {
      showError('Delete Failed', 'Network error. Please try again.');
    }
    setDeleteTarget(null);
  }

  const filtered = contacts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.location_preference && c.location_preference.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-3 pt-2 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Contacts
          </h1>
          {contacts.length > 0 && (
            <span className="text-sm text-navy/40 dark:text-white/40 font-inter">
              ({contacts.length})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setShowVCardImportModal(true)} className="whitespace-nowrap">
            <Upload size={16} />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button variant="accent" size="sm" onClick={() => setShowAddModal(true)} className="whitespace-nowrap">
            <Plus size={16} />
            <span className="hidden sm:inline">Add Contact</span>
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/30 dark:text-white/30" />
          <Input
            placeholder="Search by name, email, phone, location..."
            className="!pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowFilter(!showFilter)}>
          <Filter size={16} />
        </Button>
      </div>

      {/* Track Tabs */}
      <div className="relative mb-4 lg:mb-6">
      <div className="flex gap-1 overflow-x-auto pb-2 min-w-0 scrollbar-hide [&]:[-webkit-overflow-scrolling:touch]">
        {trackTabs.map((tab) => (
          <button
            type="button"
            key={tab.value}
            onClick={() => setActiveTrack(tab.value)}
            className={`
              px-4 py-2 rounded-[8px] text-sm font-montserrat font-medium whitespace-nowrap
              transition-all duration-200 ease-in-out
              ${
                activeTrack === tab.value
                  ? 'bg-navy text-gold'
                  : 'bg-white dark:bg-dark-card text-navy/60 dark:text-white/60 hover:bg-gold/20'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-surface dark:from-navy to-transparent pointer-events-none lg:hidden" />
      </div>

      {/* Error State */}
      {fetchError && (
        <div className="mb-4 p-4 rounded-[8px] bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-600 dark:text-red-400 font-inter">{fetchError}</p>
          <button
            type="button"
            onClick={() => { setLoading(true); fetchContacts(); }}
            className="text-xs text-red-500 hover:underline font-inter mt-1"
          >
            Try again
          </button>
        </div>
      )}

      {/* Contacts List or Empty State */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonContactRow key={i} />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((contact) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="!p-2.5 sm:!p-4 cursor-pointer hover:shadow-md transition-shadow touch-card" onClick={() => router.push(`/contacts/${contact.id}`)}>
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Avatar */}
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs sm:text-sm font-montserrat font-semibold text-gold">
                      {getInitials(contact)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-montserrat font-semibold text-navy dark:text-white truncate">
                        {getDisplayName(contact)}
                      </p>
                      {contact.lead_source && (
                        <span className="text-[10px] text-navy/50 dark:text-white/50 font-inter flex-shrink-0 hidden sm:inline">
                          via {contact.lead_source}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {contact.phone && (
                        <span className="flex items-center gap-1 text-xs text-navy/50 dark:text-white/50 font-inter">
                          <Phone size={10} className="flex-shrink-0" />
                          {contact.phone}
                        </span>
                      )}
                      {contact.email && (
                        <span className="hidden sm:flex items-center gap-1 text-xs text-navy/50 dark:text-white/50 font-inter truncate">
                          <Mail size={10} className="flex-shrink-0" />
                          {contact.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lead Score Badge */}
                  {(() => {
                    const scoreData = calculateLeadScore({
                      phone: contact.phone,
                      email: contact.email,
                      budget: contact.budget,
                      pipeline_stage: contact.pipeline_stage,
                    });
                    const colors = getScoreTailwind(scoreData.score);
                    return (
                      <span className={`hidden sm:flex flex-shrink-0 w-7 h-7 rounded-full ${colors.bg} ${colors.text} items-center justify-center text-[10px] font-montserrat font-bold`} title={`Lead score: ${scoreData.score}`}>
                        {scoreData.score}
                      </span>
                    );
                  })()}

                  {/* Overdue indicator */}
                  {contact.next_follow_up_date && new Date(contact.next_follow_up_date + 'T00:00:00') < new Date(new Date().toISOString().split('T')[0] + 'T00:00:00') && (
                    <span className="flex-shrink-0" title="Overdue follow-up"><AlertCircle size={14} className="text-red-500" /></span>
                  )}

                  {/* Track badge */}
                  <span className="text-[10px] font-montserrat font-semibold uppercase px-2 py-1 rounded-full bg-gold/10 text-gold flex-shrink-0">
                    {contact.track_type}
                  </span>

                  {/* Pipeline Stage Badge */}
                  <span className={`text-[10px] font-montserrat font-semibold px-2 py-1 rounded-full hidden sm:block flex-shrink-0 capitalize ${STAGE_COLORS[contact.pipeline_stage] || STAGE_COLORS.new}`}>
                    {contact.pipeline_stage?.replace(/_/g, ' ')}
                  </span>

                  {/* AI Intelligence badges */}
                  {contact.engagement_temperature && (
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 hidden sm:block"
                      style={{
                        backgroundColor: contact.engagement_temperature === 'hot' ? '#e74c3c' : contact.engagement_temperature === 'warm' ? '#d3a971' : contact.engagement_temperature === 'cool' ? '#3498db' : '#95a5a6',
                      }}
                      title={contact.engagement_temperature}
                    />
                  )}
                  {contact.disc_type && (
                    <span
                      className="text-[10px] font-montserrat font-bold flex-shrink-0 hidden sm:block"
                      style={{
                        color: contact.disc_type === 'D' ? '#c0392b' : contact.disc_type === 'I' ? '#d3a971' : contact.disc_type === 'S' ? '#27ae60' : '#2980b9',
                      }}
                      title={`DISC: ${contact.disc_type}${contact.disc_secondary ? contact.disc_secondary : ''}`}
                    >
                      {contact.disc_type}{contact.disc_secondary || ''}
                    </span>
                  )}

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded hover:bg-green-500/10 text-navy/30 dark:text-white/30 hover:text-green-600 transition-colors" title="Call">
                        <PhoneCall size={14} />
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`sms:${contact.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded hover:bg-blue-500/10 text-navy/30 dark:text-white/30 hover:text-blue-600 transition-colors" title="Text">
                        <MessageCircle size={14} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDeleteTarget(contact); }}
                      className="hidden sm:block p-1.5 rounded hover:bg-red-500/10 text-navy/30 dark:text-white/30 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={14} className="text-navy/20 dark:text-white/20" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card data-testid="contact-card" className="!p-8 text-center">
            <Users size={40} className="text-gold mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-montserrat font-semibold text-navy dark:text-white mb-2">
              {searchQuery ? 'No Matching Contacts' : 'No Contacts Yet'}
            </h2>
            <p className="text-sm text-navy/50 dark:text-white/50 font-inter max-w-md mx-auto mb-6">
              {searchQuery
                ? `No contacts match "${searchQuery}". Try a different search.`
                : 'Add your first contact or import from CSV, Excel, or Google Contacts to get started. Each contact will be assigned to a track with tailored campaign options.'}
            </p>
            {!searchQuery && (
              <div className="flex items-center justify-center gap-3">
                <Button variant="ghost" onClick={() => setShowVCardImportModal(true)}>
                  <Upload size={16} />
                  Import Contacts
                </Button>
                <Button variant="accent" onClick={() => setShowAddModal(true)}>
                  <Plus size={16} />
                  Add Contact
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      <AddContactModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchContacts}
      />
      <ImportContactsModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchContacts}
      />
      <VCardImportModal
        open={showVCardImportModal}
        onClose={() => setShowVCardImportModal(false)}
        onSuccess={fetchContacts}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete Contact?"
        message={deleteTarget ? `Are you sure you want to delete ${getDisplayName(deleteTarget)}? This action cannot be undone.` : ''}
        variant="danger"
      />

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className="lg:hidden fixed z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform right-4 bottom-[88px]"
        style={{ backgroundColor: BRAND.colors.gold }}
        aria-label="Add Contact"
      >
        <Plus size={20} color="#fff" />
      </button>
    </div>
  );
}
