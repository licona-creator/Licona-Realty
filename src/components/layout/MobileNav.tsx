/**
 * Mobile Bottom Tab Bar
 *
 * Bottom navigation for mobile with gold active indicators.
 * Approval queue gold badge visible at all times.
 * Safe area padding for iPhone notch/home indicator.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import {
  Home,
  CheckCircle,
  Users,
  FileText,
  Settings,
} from 'lucide-react';

interface MobileNavProps {
  approvalCount?: number;
}

const mobileNavItems = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Approval', href: '/approval-queue', icon: CheckCircle, badge: true },
  { label: 'Contacts', href: '/contacts', icon: Users },
  { label: 'Deals', href: '/transactions', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function MobileNav({ approvalCount = 0 }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      data-testid="bottom-tab-bar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-navy border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex w-full">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1 min-w-0">
              <Link
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 py-2 min-h-[48px] relative"
              >
                {isActive && (
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gold" />
                )}
                <div className="relative">
                  <Icon
                    size={20}
                    className={`transition-colors duration-200 ${
                      isActive ? 'text-gold' : 'text-white/70'
                    }`}
                  />
                  {item.badge && approvalCount > 0 && (
                    <Badge
                      count={approvalCount}
                      variant="gold"
                      className="absolute -top-2 -right-3"
                    />
                  )}
                </div>
                <span
                  className={`text-[9px] font-montserrat font-medium ${
                    isActive ? 'text-gold' : 'text-white/70'
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
