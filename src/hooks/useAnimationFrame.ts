import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook for running a callback on every frame
 *
 * IMPORTANT: This uses setInterval instead of requestAnimationFrame to ensure
 * continuous execution when the Electron window is minimized or hidden.
 * requestAnimationFrame is throttled to ~1fps or completely paused in background,
 * which breaks blink detection. setInterval continues running in background when
 * backgroundThrottling is disabled in Electron.
 *
 * Target: 30 FPS (33.33ms interval) for video processing
 */
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS; // ~33ms

export function useAnimationFrame(callback: (timestamp: number) => void, enabled = true) {
  const callbackRef = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const animate = useCallback(() => {
    const timestamp = performance.now();
    callbackRef.current(timestamp);
  }, []);

  useEffect(() => {
    if (enabled) {
      // Start interval-based animation loop
      intervalRef.current = setInterval(animate, FRAME_INTERVAL);
      console.log(`[useAnimationFrame] Started with ${TARGET_FPS}fps (${FRAME_INTERVAL}ms interval)`);
    } else if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('[useAnimationFrame] Stopped');
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, animate]);

  const start = useCallback(() => {
    if (intervalRef.current === null) {
      intervalRef.current = setInterval(animate, FRAME_INTERVAL);
      console.log(`[useAnimationFrame] Manually started with ${TARGET_FPS}fps`);
    }
  }, [animate]);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('[useAnimationFrame] Manually stopped');
    }
  }, []);

  return { start, stop };
}