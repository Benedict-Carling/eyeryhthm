/**
 * Safe logging utilities for Electron main process.
 *
 * In packaged Electron apps, stdout/stderr may be closed (no terminal attached),
 * causing EPIPE errors when console.log/error/warn are called.
 * These utilities safely handle those cases to prevent app crashes.
 */

function safeWrite(fn: (...args: unknown[]) => void, ...args: unknown[]): void {
  try {
    fn(...args);
  } catch {
    // Ignore EPIPE errors when console is unavailable in packaged apps
  }
}

export function log(...args: unknown[]): void {
  safeWrite(console.log.bind(console), ...args);
}

export function error(...args: unknown[]): void {
  safeWrite(console.error.bind(console), ...args);
}

export function warn(...args: unknown[]): void {
  safeWrite(console.warn.bind(console), ...args);
}
