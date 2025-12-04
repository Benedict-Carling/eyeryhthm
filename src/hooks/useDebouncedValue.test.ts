import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 500));

    expect(result.current).toBe('initial');
  });

  it('debounces value updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated' });

    // Should still be initial
    expect(result.current).toBe('initial');

    // Advance time but not enough
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('initial');

    // Advance past debounce delay
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('updated');
  });

  it('resets debounce timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'first' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Change again before debounce completes
    rerender({ value: 'second' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Still shouldn't have updated
    expect(result.current).toBe('initial');

    // Change again
    rerender({ value: 'third' });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should now show the latest value
    expect(result.current).toBe('third');
  });

  it('works with objects using reference equality', () => {
    const obj1 = { name: 'test' };
    const obj2 = { name: 'test' }; // Same content, different reference

    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: obj1 } }
    );

    expect(result.current).toBe(obj1);

    rerender({ value: obj2 });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(obj2);
  });

  it('cleans up timeout on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });
    unmount();

    // Should not throw when timers advance after unmount
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Result should still be initial (frozen at unmount)
    expect(result.current).toBe('initial');
  });
});
