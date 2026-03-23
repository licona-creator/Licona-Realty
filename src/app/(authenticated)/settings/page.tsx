/**
 * Settings Page
 *
 * Complete control center for the Licona Realty Platform.
 * Left sidebar navigation on desktop, segmented tab bar on mobile.
 * All changes require explicit "Save Changes" button.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND } from '@/lib/brand';
import {
  Image,
  Plug,
  Shield,
  Bell,
  MessageSquare,
  SlidersHorizontal,
  CreditCard,
} from 'lucide-react';

import { BrandAssets } from '@/components/settings/BrandAssets';
import { Integrations } from '@/components/settings/Integrations';
import { AccountSecurity } from '@/components/settings/AccountSecurity';
import { Notifications } from '@/components/settings/Notifications';
import { CampaignDefaults } from '@/components/settings/CampaignDefaults';
import { PlatformPreferences } from '@/components/settings/PlatformPreferences';
import { BillingPlan } from '@/components/settings/BillingPlan';

const SETTINGS_SECTIONS = [
  { id: 'brand', label: 'Brand & Assets', icon: Image },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'account', label: 'Account & Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'campaigns', label: 'Campaign Defaults', icon: MessageSquare },
  { id: 'platform', label: 'Platform Preferences', icon: SlidersHorizontal },
  { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
] as const;

type SectionId = (typeof SETTINGS_SECTIONS)[number]['id'];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('brand');

  const renderSection = () => {
    switch (activeSection) {
      case 'brand':
        return <BrandAssets />;
      case 'integrations':
        return <Integrations />;
      case 'account':
        return <AccountSecurity />;
      case 'notifications':
        return <Notifications />;
      case 'campaigns':
        return <CampaignDefaults />;
      case 'platform':
        return <PlatformPreferences />;
      case 'billing':
        return <BillingPlan />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="min-h-screen bg-surface dark:bg-navy"
    >
      {/* Page Header */}
      <div className="px-6 lg:px-8 pt-6 pb-4">
        <h1
          className="text-2xl lg:text-3xl font-semibold text-navy dark:text-white"
          style={{ fontFamily: BRAND.fonts.playfair }}
        >
          Settings
        </h1>
        <p className="text-sm text-navy/50 dark:text-white/50 font-inter mt-1">
          Manage your platform, integrations, and brand assets
        </p>
      </div>

      {/* Mobile Tab Bar */}
      <div className="lg:hidden px-4 pb-4">
        <div className="flex overflow-x-auto gap-1 pb-2 scrollbar-hide">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-[8px] whitespace-nowrap
                  font-montserrat text-xs font-medium transition-all duration-200 relative
                  ${isActive
                    ? 'bg-gold/15 text-gold'
                    : 'text-navy/50 dark:text-white/50 hover:text-navy dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/5'
                  }
                `}
              >
                <Icon size={14} />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: Sidebar + Content */}
      <div className="flex px-4 lg:px-8 gap-6 pb-8">
        {/* Desktop Settings Sidebar */}
        <div
          className="hidden lg:block w-56 flex-shrink-0 rounded-[12px] overflow-hidden self-start sticky top-6"
          style={{ backgroundColor: BRAND.colors.primary }}
        >
          <nav className="py-3 px-2">
            <ul className="space-y-0.5">
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <li key={section.id}>
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 rounded-[8px]
                        font-montserrat text-sm font-medium text-left
                        transition-all duration-200 relative
                        ${isActive
                          ? 'text-gold bg-white/10'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="settings-sidebar-active"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gold"
                        />
                      )}
                      <Icon size={16} />
                      <span>{section.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
