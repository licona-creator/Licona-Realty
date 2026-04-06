/**
 * Mobile Bottom Tab Bar
 *
 * Bottom navigation with gold active indicators.
 * Navy background with gold 1px top border.
 * Safe area padding for iPhone home indicator.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Users,
  Briefcase,
  MoreHorizontal,
} from 'lucide-react';

const mobileNavItems = [
  { label: 'Today', href: '/today', icon: Sparkles },
  { label: 'Contacts', href: '/contacts', icon: Users },
  { label: 'Deals', href: '/transactions', icon: Briefcase },
  { label: 'More', href: '/more', icon: MoreHorizontal },
];

interface MobileNavProps {
  approvalCount?: number;
  overdueCount?: number;
}

export function MobileNav({ overdueCount = 0 }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      data-testid="bottom-tab-bar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 lr-glass-bottom"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className="flex w-full">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1 min-w-0">
              <Link
                href={item.href}
                prefetch={false}
                className="flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[52px] relative active:scale-95 transition-transform duration-100"
              >
                <div className="relative">
                  <Icon
                    size={22}
                    className={`transition-colors duration-200 ${
                      isActive ? 'text-gold' : 'text-white/60'
                    }`}
                  />
                  {item.href === '/today' && overdueCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-montserrat font-bold flex items-center justify-center">
                      {overdueCount > 99 ? '99+' : overdueCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-montserrat font-medium ${
                    isActive ? 'text-gold' : 'text-white/60'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
