import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock matchMedia
const mockMatchMedia = vi.fn().mockImplementation(query => ({
  matches: true, // Default to dark mode
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides default theme values', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('loads saved theme from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValueOnce('light');
    
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('saves theme to localStorage when changed', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('resolves system theme based on media query', () => {
    mockLocalStorage.getItem.mockReturnValue(null); // No saved theme
    mockMatchMedia.mockImplementation(query => ({
      matches: true, // dark mode preferred
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('throws error when used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');

    console.error = originalError;
  });

  it('updates resolved theme when system preference changes', () => {
    mockLocalStorage.getItem.mockReturnValue(null); // No saved theme
    let changeListener: ((event: MediaQueryListEvent) => void) | null = null;
    
    mockMatchMedia.mockImplementation(query => ({
      matches: false, // light mode initially
      media: query,
      onchange: null,
      addEventListener: vi.fn((event, listener) => {
        if (event === 'change') {
          changeListener = listener;
        }
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.resolvedTheme).toBe('light');

    // Simulate system preference change
    act(() => {
      if (changeListener) {
        changeListener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current.resolvedTheme).toBe('dark');
  });
});