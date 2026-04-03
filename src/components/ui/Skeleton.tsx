/**
 * Skeleton Loading Components
 *
 * Animated placeholder shapes that match real content layout.
 * Uses CSS animate-pulse. Respects prefers-reduced-motion.
 */

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonBox({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`skeleton-pulse rounded-[8px] bg-navy/[0.06] dark:bg-white/[0.06] ${className}`}
      style={style}
    />
  );
}

export function SkeletonCircle({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton-pulse rounded-full bg-navy/[0.06] dark:bg-white/[0.06] ${className}`}
    />
  );
}

export function SkeletonText({ className = '', lines = 1 }: SkeletonProps & { lines?: number }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`skeleton-pulse rounded bg-navy/[0.06] dark:bg-white/[0.06] h-3 ${
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}

/** Skeleton that matches a stat card: icon + big number + label */
export function SkeletonStatCard() {
  return (
    <div className="rounded-[12px] border border-gold/15 p-3 lg:p-4 bg-surface dark:bg-dark-card min-h-[80px]">
      <SkeletonBox className="w-4 h-4 mb-2 rounded-full" />
      <SkeletonBox className="w-20 h-6 mb-1" />
      <SkeletonBox className="w-16 h-3" />
    </div>
  );
}

/** Skeleton that matches a contact list row */
export function SkeletonContactRow() {
  return (
    <div className="rounded-[12px] border border-gold/15 p-2.5 sm:p-4 bg-surface dark:bg-dark-card flex items-center gap-3 sm:gap-4 min-h-[56px]">
      <SkeletonCircle className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <SkeletonBox className="w-32 h-3.5" />
        <SkeletonBox className="w-24 h-3" />
      </div>
      <SkeletonBox className="w-12 h-5 rounded-full flex-shrink-0" />
    </div>
  );
}

/** Skeleton that matches a deal list row */
export function SkeletonDealRow() {
  return (
    <div className="rounded-[12px] border border-gold/15 p-4 bg-surface dark:bg-dark-card min-h-[72px]">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBox className="w-40 h-3.5" />
            <SkeletonBox className="w-16 h-5 rounded-full" />
          </div>
          <SkeletonBox className="w-28 h-3" />
          <div className="flex items-center gap-4">
            <SkeletonBox className="w-20 h-3" />
            <SkeletonBox className="w-16 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for a follow-up row in dashboard */
export function SkeletonFollowUpRow() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface dark:bg-navy/30 min-h-[52px]">
      <div className="flex-1 min-w-0 space-y-1.5">
        <SkeletonBox className="w-28 h-3.5" />
        <SkeletonBox className="w-48 h-3" />
      </div>
      <SkeletonBox className="w-10 h-8 rounded-full flex-shrink-0" />
    </div>
  );
}

/** Skeleton for an activity item in dashboard/contact detail */
export function SkeletonActivityRow() {
  return (
    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface dark:bg-navy/30 min-h-[48px]">
      <SkeletonCircle className="w-7 h-7 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <SkeletonBox className="w-24 h-3.5" />
        <SkeletonBox className="w-36 h-3" />
      </div>
      <SkeletonBox className="w-10 h-3 flex-shrink-0" />
    </div>
  );
}

/** Skeleton for info card on detail pages */
export function SkeletonDetailCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-[12px] border border-gold/15 p-5 bg-surface dark:bg-dark-card">
      <SkeletonBox className="w-32 h-4 mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBox className="w-3.5 h-3.5 rounded-full flex-shrink-0" />
            <div className="space-y-1">
              <SkeletonBox className="w-16 h-2.5" />
              <SkeletonBox className="w-28 h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full dashboard skeleton */
export function DashboardSkeleton() {
  return (
    <div className="p-3 pt-2 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 lg:mb-8">
        <div className="space-y-2">
          <SkeletonBox className="w-56 h-7" />
          <SkeletonBox className="w-40 h-4" />
        </div>
        <SkeletonCircle className="w-10 h-10" />
      </div>
      {/* Mobile metric pills */}
      <div className="flex gap-2 overflow-hidden pb-1 lg:hidden mb-6">
        {[80, 64, 72, 80].map((w, i) => (
          <SkeletonBox key={i} className={`h-8 rounded-full flex-shrink-0`} style={{ width: w }} />
        ))}
      </div>
      {/* Follow-ups card */}
      <div className="space-y-6 mb-6">
        <div className="rounded-[12px] border border-gold/15 p-5 bg-surface dark:bg-dark-card">
          <SkeletonBox className="w-28 h-5 mb-4" />
          <div className="space-y-2">
            <SkeletonFollowUpRow />
            <SkeletonFollowUpRow />
            <SkeletonFollowUpRow />
          </div>
        </div>
      </div>
      {/* Stat cards */}
      <div className="hidden lg:grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      {/* Activity */}
      <div className="rounded-[12px] border border-gold/15 p-5 bg-surface dark:bg-dark-card">
        <SkeletonBox className="w-28 h-5 mb-4" />
        <div className="space-y-2">
          <SkeletonActivityRow />
          <SkeletonActivityRow />
          <SkeletonActivityRow />
        </div>
      </div>
    </div>
  );
}

/** Full contact list skeleton */
export function ContactListSkeleton() {
  return (
    <div className="p-3 pt-2 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-6 h-6 rounded" />
          <SkeletonBox className="w-24 h-7" />
        </div>
        <div className="flex gap-2">
          <SkeletonBox className="w-16 h-8 rounded-[8px]" />
          <SkeletonBox className="w-20 h-8 rounded-[8px]" />
        </div>
      </div>
      <SkeletonBox className="w-full h-10 rounded-[8px] mb-4" />
      <div className="flex gap-1 overflow-hidden pb-2 mb-4">
        {[48, 56, 56, 64, 56, 60, 52].map((w, i) => (
          <SkeletonBox key={i} className="h-8 rounded-[8px] flex-shrink-0" style={{ width: w }} />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonContactRow key={i} />
        ))}
      </div>
    </div>
  );
}

/** Full deal list skeleton */
export function DealListSkeleton() {
  return (
    <div className="p-3 pt-2 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-6 h-6 rounded" />
          <SkeletonBox className="w-16 h-7" />
        </div>
        <SkeletonBox className="w-20 h-8 rounded-[8px]" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonDealRow key={i} />
        ))}
      </div>
    </div>
  );
}

/** Contact detail skeleton */
export function ContactDetailSkeleton() {
  return (
    <div className="p-3 pt-2 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <SkeletonBox className="w-32 h-4 mb-4" />
      <div className="flex items-center gap-4 mb-6">
        <SkeletonCircle className="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="w-40 h-6" />
          <div className="flex gap-2">
            <SkeletonBox className="w-16 h-5 rounded-full" />
            <SkeletonBox className="w-20 h-5 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonDetailCard rows={6} />
          <div className="rounded-[12px] border border-gold/15 p-5 bg-surface dark:bg-dark-card">
            <SkeletonBox className="w-32 h-4 mb-4" />
            <div className="space-y-2">
              <SkeletonActivityRow />
              <SkeletonActivityRow />
              <SkeletonActivityRow />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-[12px] border border-gold/15 p-5 bg-surface dark:bg-dark-card">
            <SkeletonBox className="w-20 h-4 mb-3" />
            <SkeletonBox className="w-full h-4" />
            <SkeletonBox className="w-24 h-3 mt-2" />
          </div>
          <SkeletonDetailCard rows={3} />
        </div>
      </div>
    </div>
  );
}

/** Deal detail skeleton */
export function DealDetailSkeleton() {
  return (
    <div className="p-3 pt-2 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <SkeletonBox className="w-28 h-4 mb-4" />
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 space-y-2">
          <SkeletonBox className="w-52 h-6" />
          <div className="flex gap-2">
            <SkeletonBox className="w-20 h-5 rounded-full" />
            <SkeletonBox className="w-16 h-5 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <div className="rounded-[12px] border border-gold/15 p-5 bg-surface dark:bg-dark-card">
            <SkeletonBox className="w-24 h-4 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBox className="w-5 h-5 rounded flex-shrink-0" />
                  <SkeletonBox className="w-full h-3.5" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <SkeletonDetailCard rows={3} />
          <SkeletonDetailCard rows={4} />
        </div>
      </div>
    </div>
  );
}
