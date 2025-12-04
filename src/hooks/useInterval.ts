'use client';

import { useEffect, useRef } from 'react';

/**
 * A React Compiler-compatible interval hook.
 *
 * This hook properly handles intervals without triggering compiler warnings.
 * The callback is stored in a ref to avoid stale closures, and the effect
 * only re-runs when the delay changes.
 *
 * @param callback - Function to call on each interval tick
 * @param delay - Interval delay in milliseconds, or null to pause
 *
 * @example
 * ```tsx
 * // Update every second
 * useInterval(() => {
 *   setCount(c => c + 1);
 * }, 1000);
 *
 * // Pause the interval
 * useInterval(() => {
 *   setCount(c => c + 1);
 * }, isPaused ? null : 1000);
 * ```
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  // Remember the latest callback - this ref update is safe and doesn't
  // cause re-renders or violate React Compiler rules
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (delay === null) {
      return;
    }

    const tick = () => {
      savedCallback.current();
    };

    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}
