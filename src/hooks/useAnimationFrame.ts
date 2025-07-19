import { useRef, useCallback, useEffect } from 'react';

export function useAnimationFrame(callback: (timestamp: number) => void, enabled = true) {
  const callbackRef = useRef(callback);
  const frameRef = useRef<number | null>(null);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const animate = useCallback((timestamp: number) => {
    callbackRef.current(timestamp);
    frameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (enabled) {
      frameRef.current = requestAnimationFrame(animate);
    } else if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [enabled, animate]);

  const start = useCallback(() => {
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  return { start, stop };
}