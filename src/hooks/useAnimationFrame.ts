import { useRef, useCallback, useEffect } from 'react';

/**
 * A React Compiler-compatible animation frame hook.
 *
 * This hook properly manages requestAnimationFrame without triggering
 * compiler warnings about self-referential callbacks.
 *
 * @param callback - Function to call on each animation frame
 * @param enabled - Whether the animation loop is active (default: true)
 * @returns Object with start and stop functions for manual control
 *
 * @example
 * ```tsx
 * useAnimationFrame((timestamp) => {
 *   // Update animation state
 *   setPosition(calculatePosition(timestamp));
 * }, isAnimating);
 * ```
 */
export function useAnimationFrame(callback: (timestamp: number) => void, enabled = true) {
  const savedCallback = useRef(callback);
  const frameRef = useRef<number | null>(null);

  // Keep callback ref up to date
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Start the animation loop
  // React Compiler auto-memoizes this callback
  const startLoop = useCallback(() => {
    if (frameRef.current !== null) return; // Already running

    const loop = (timestamp: number) => {
      savedCallback.current(timestamp);
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
  }, []);

  // Stop the animation loop
  const stopLoop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  // Auto start/stop based on enabled prop
  useEffect(() => {
    if (enabled) {
      startLoop();
    } else {
      stopLoop();
    }

    return stopLoop;
  }, [enabled, startLoop, stopLoop]);

  return {
    start: startLoop,
    stop: stopLoop,
  };
}
