import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInterval } from './useInterval';

describe('useInterval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls callback at specified interval', () => {
    const callback = vi.fn();

    renderHook(() => useInterval(callback, 1000));

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('does not call callback when delay is null', () => {
    const callback = vi.fn();

    renderHook(() => useInterval(callback, null));

    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('pauses and resumes when delay changes from number to null and back', () => {
    const callback = vi.fn();

    const { rerender } = renderHook(
      ({ delay }) => useInterval(callback, delay),
      { initialProps: { delay: 1000 as number | null } }
    );

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Pause
    rerender({ delay: null });
    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(1); // Still 1

    // Resume
    rerender({ delay: 1000 });
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('uses the latest callback without restarting interval', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { rerender } = renderHook(
      ({ callback }) => useInterval(callback, 1000),
      { initialProps: { callback: callback1 } }
    );

    vi.advanceTimersByTime(500);
    expect(callback1).not.toHaveBeenCalled();

    // Change callback mid-interval
    rerender({ callback: callback2 });

    vi.advanceTimersByTime(500);
    // Should call the new callback, not the old one
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it('clears interval on unmount', () => {
    const callback = vi.fn();

    const { unmount } = renderHook(() => useInterval(callback, 1000));

    vi.advanceTimersByTime(500);
    unmount();
    vi.advanceTimersByTime(5000);

    expect(callback).not.toHaveBeenCalled();
  });

  it('restarts interval when delay changes', () => {
    const callback = vi.fn();

    const { rerender } = renderHook(
      ({ delay }) => useInterval(callback, delay),
      { initialProps: { delay: 1000 } }
    );

    vi.advanceTimersByTime(500);
    expect(callback).not.toHaveBeenCalled();

    // Change delay - should restart the interval
    rerender({ delay: 500 });

    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  // Note: Zero delay intervals with fake timers can cause memory issues in vitest
  // because advanceTimersByTime triggers many synchronous callbacks
  it.skip('handles zero delay', () => {
    const callback = vi.fn();

    const { unmount } = renderHook(() => useInterval(callback, 0));

    // setInterval with 0 delay still runs - advance by 10ms to trigger a few calls
    vi.advanceTimersByTime(10);
    expect(callback).toHaveBeenCalled();

    // Cleanup to prevent memory leak
    unmount();
  });
});
