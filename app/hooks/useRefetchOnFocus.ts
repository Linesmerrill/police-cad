'use client';

import { useEffect, useRef } from 'react';

const STALE_TIME = 30_000; // 30 seconds

/**
 * Calls `refetch` when the browser tab regains visibility,
 * throttled so it fires at most once every 30 seconds.
 */
export function useRefetchOnFocus(refetch: () => void, enabled = true) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const lastFetchRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    // Mark "just fetched" so the very first focus doesn't double-fire
    lastFetchRef.current = Date.now();

    const onVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastFetchRef.current > STALE_TIME
      ) {
        lastFetchRef.current = Date.now();
        refetchRef.current();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [enabled]);
}
