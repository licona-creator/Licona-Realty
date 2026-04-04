'use client';

import { useState, useEffect } from 'react';

export function useOverdueCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch('/api/dashboard/follow-ups');
        if (res.ok) {
          const data = await res.json();
          // Only truly overdue (before today), not today or tomorrow
          setCount(data.counts?.overdue || 0);
        }
      } catch { /* empty */ }
    }

    fetchCount();

    // Refresh every 5 minutes
    const interval = setInterval(fetchCount, 300_000);
    return () => clearInterval(interval);
  }, []);

  return count;
}
