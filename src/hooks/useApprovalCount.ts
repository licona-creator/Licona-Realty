/**
 * Approval Queue Count Hook
 *
 * Provides real-time pending approval count for badge display.
 * Uses Supabase real-time subscriptions for instant updates.
 * Gold badge visible on every screen at all times.
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useApprovalCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    // Initial count
    async function fetchCount() {
      const { count: pendingCount } = await supabase
        .from('approval_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setCount(pendingCount || 0);
    }

    fetchCount();

    // Real-time subscription for instant badge updates
    const channel = supabase
      .channel('approval-queue-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'approval_queue',
        },
        () => {
          // Refetch count on any change
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
