/**
 * Desktop Sidebar Navigation
 *
 * Smooth animated sidebar in #132236 navy with #d3a971 gold active states.
 * LR monogram at the top. Approval queue gold badge visible at all times.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { Badge } from '@/components/ui/Badge';
import { NAV_ITEMS, BRAND } from '@/lib/brand';
import {
  Home,
  CheckCircle,
  Users,
  FileText,
  Send,
  Megaphone,
  MapPin,
  Calendar,
  Palette,
  Star,
  Calculator,
  Settings,
  Handshake,
  Activity,
  Sparkles,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  sparkles: Sparkles,
  home: Home,
  'check-circle': CheckCircle,
  users: Users,
  handshake: Handshake,
  'file-text': FileText,
  send: Send,
  megaphone: Megaphone,
  'map-pin': MapPin,
  calendar: Calendar,
  palette: Palette,
  star: Star,
  calculator: Calculator,
  settings: Settings,
  activity: Activity,
};

interface SidebarProps {
  approvalCount?: number;
  overdueCount?: number;
}

export function Sidebar({ approvalCount = 0, overdueCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 z-40"
      style={{ backgroundColor: BRAND.colors.primary }}
    >
      {/* LR Monogram + Brand */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <LRMonogram size="lg" />
        <div>
          <p
            className="text-xs font-montserrat font-semibold tracking-[3px] uppercase"
            style={{ color: BRAND.colors.accent }}
          >
            Licona Realty
          </p>
          <p className="text-[10px] font-montserrat tracking-[2px] text-white/40 mt-0.5">
            {BRAND.logoTagline}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = iconMap[item.icon];

            return (
              <li key={item.href}>
                <Link href={item.href} prefetch={false} {...('badge' in item && item.badge ? { 'data-testid': 'sidebar-approval-badge' } : {})}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    className={`
                      flex items-center gap-3 px-4 py-2.5 rounded-[8px]
                      font-montserrat text-sm font-medium
                      transition-all duration-200 ease-in-out relative
                      ${
                        isActive
                          ? 'text-gold bg-white/10'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gold"
                      />
                    )}
                    {Icon && <Icon size={18} />}
                    <span>{item.label}</span>
                    {'badge' in item && item.badge && approvalCount > 0 && (
                      <Badge count={approvalCount} variant="gold" className="ml-auto" />
                    )}
                    {item.href === '/today' && overdueCount > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-montserrat font-bold flex items-center justify-center">
                        {overdueCount > 99 ? '99+' : overdueCount}
                      </span>
                    )}
                  </motion.div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Agent Info Footer */}
      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-xs text-white/60 font-inter">
          {BRAND.agent.name}
        </p>
        <p className="text-[10px] text-white/40 font-inter mt-0.5">
          {BRAND.agent.brokerage}
        </p>
        <p className="text-[10px] text-white/30 font-inter mt-0.5">
          {BRAND.agent.license}
        </p>
      </div>
    </aside>
  );
}
