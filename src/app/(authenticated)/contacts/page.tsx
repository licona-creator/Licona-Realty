/**
 * Contacts Page
 *
 * Five lead entity tracks: Buyers, Sellers, Landlords, Tenants, Investors.
 * Plus Sphere and Referral track - completely separate.
 * Each contact: full profile, pipeline stage, activity timeline,
 * campaign enrollment, lead score, and more.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BRAND } from '@/lib/brand';
import { Users, Plus, Search, Upload, Filter } from 'lucide-react';
import { AddContactModal } from '@/components/modals/AddContactModal';
import { ImportContactsModal } from '@/components/modals/ImportContactsModal';
import type { TrackType } from '@/types/database';

const trackTabs: Array<{ label: string; value: TrackType | 'sphere' | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Buyers', value: 'buyer' },
  { label: 'Sellers', value: 'seller' },
  { label: 'Landlords', value: 'landlord' },
  { label: 'Tenants', value: 'tenant' },
  { label: 'Investors', value: 'investor' },
  { label: 'Sphere', value: 'sphere' },
];

export default function ContactsPage() {
  const [activeTrack, setActiveTrack] = useState<string>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Contacts
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setShowImportModal(true)} className="whitespace-nowrap">
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
            placeholder="Search contacts..."
            className="!pl-10"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowFilter(!showFilter)}>
          <Filter size={16} />
        </Button>
      </div>

      {/* Track Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6 min-w-0 scrollbar-hide [&]:[-webkit-overflow-scrolling:touch]">
        {trackTabs.map((tab) => (
          <button
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

      {/* Empty State */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="!p-8 text-center">
          <Users size={40} className="text-gold mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-montserrat font-semibold text-navy dark:text-white mb-2">
            No Contacts Yet
          </h2>
          <p className="text-sm text-navy/50 dark:text-white/50 font-inter max-w-md mx-auto mb-6">
            Add your first contact or import from CSV, Excel, or Google Contacts
            to get started. Each contact will be assigned to a track with
            tailored campaign options.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" onClick={() => setShowImportModal(true)}>
              <Upload size={16} />
              Import Contacts
            </Button>
            <Button variant="accent" onClick={() => setShowAddModal(true)}>
              <Plus size={16} />
              Add Contact
            </Button>
          </div>
        </Card>
      </motion.div>

      <AddContactModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
      <ImportContactsModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}
