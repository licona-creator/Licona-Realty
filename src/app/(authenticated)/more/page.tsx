/**
 * More Page - Mobile navigation overflow
 *
 * Shows all navigation items not visible in the mobile bottom tab bar.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BRAND, NAV_ITEMS } from '@/lib/brand';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import {
  Send, Megaphone, MapPin, Calendar, Palette,
  Star, Calculator, Settings, LogOut, Handshake, Activity, ChevronRight,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  send: Send,
  handshake: Handshake,
  megaphone: Megaphone,
  'map-pin': MapPin,
  calendar: Calendar,
  palette: Palette,
  star: Star,
  calculator: Calculator,
  activity: Activity,
};

// Show items not in mobile bottom nav
const moreItems = NAV_ITEMS.filter(
  (item) => !['Dashboard', 'Approval Queue', 'Contacts', 'Deals', 'Settings'].includes(item.label)
);

export default function MorePage() {
  const [showSignOut, setShowSignOut] = useState(false);
  const { signOut } = useAuth();

  return (
    <div className="p-3 pt-2 lg:p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4 lg:mb-6">
        <LRMonogram size="md" />
        <div>
          <h1 className="text-lg font-montserrat font-semibold text-navy dark:text-white">
            {BRAND.agent.name}
          </h1>
          <p className="text-xs text-navy/70 dark:text-white/60 font-inter">
            {BRAND.agent.title}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        {moreItems.map((item, i) => {
          const Icon = iconMap[item.icon];
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={item.href}
                prefetch={false}
                className="flex items-center gap-3 px-4 py-3 rounded-[8px] hover:bg-gold/20 transition-colors"
              >
                {Icon && <Icon size={20} className="text-gold" />}
                <span className="font-montserrat text-sm font-medium text-navy dark:text-white flex-1">
                  {item.label}
                </span>
                <ChevronRight size={14} className="text-navy/20 dark:text-white/20" />
              </Link>
            </motion.div>
          );
        })}

        <div className="border-t border-gold/15 my-3" />

        <Link
          href="/settings"
          prefetch={false}
          className="flex items-center gap-3 px-4 py-3 rounded-[8px] hover:bg-gold/20 transition-colors"
        >
          <Settings size={20} className="text-navy/60 dark:text-white/50" />
          <span className="font-montserrat text-sm font-medium text-navy/80 dark:text-white/70 flex-1">
            Settings
          </span>
          <ChevronRight size={14} className="text-navy/20 dark:text-white/20" />
        </Link>

        <button onClick={() => setShowSignOut(true)} className="flex items-center gap-3 px-4 py-3 rounded-[8px] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full">
          <LogOut size={20} className="text-red-500/60" />
          <span className="font-montserrat text-sm font-medium text-red-500/60">
            Sign Out
          </span>
        </button>
      </div>

      <ConfirmDialog
        open={showSignOut}
        onClose={() => setShowSignOut(false)}
        onConfirm={() => { signOut(); }}
        title="Sign Out?"
        message="Are you sure you want to sign out of the Licona Realty Platform?"
        confirmLabel="Sign Out"
        variant="danger"
      />

      <div className="mt-8 text-center">
        <p className="text-[10px] text-navy/30 dark:text-white/30 font-inter">
          {BRAND.agent.brokerage} &middot; {BRAND.agent.license}
        </p>
        <p className="text-[10px] text-gold/40 font-inter mt-1">
          {BRAND.tagline}
        </p>
      </div>
    </div>
  );
}
