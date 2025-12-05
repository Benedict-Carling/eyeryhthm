/**
 * Safe logging utilities for Electron main process.
 *
 * In packaged Electron apps, stdout/stderr may be closed (no terminal attached),
 * causing EPIPE errors when console.log/error/warn are called.
 * These utilities safely handle those cases to prevent app crashes.
 *
 * The EPIPE error is thrown asynchronously by Node.js streams, so try/catch
 * doesn't work. Instead, we check if the stream is writable before writing
 * and suppress EPIPE errors at the process level.
 */

// Suppress EPIPE errors on stdout/stderr to prevent crashes in packaged apps
// This handles the async nature of stream errors that try/catch can't handle
process.stdout?.on?.('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EPIPE') return;
  throw err;
});

process.stderr?.on?.('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EPIPE') return;
  throw err;
});

function isStreamWritable(stream: NodeJS.WriteStream | undefined): boolean {
  return stream?.writable === true;
}

export function log(...args: unknown[]): void {
  if (isStreamWritable(process.stdout)) {
    console.log(...args);
  }
}

export function error(...args: unknown[]): void {
  if (isStreamWritable(process.stderr)) {
    console.error(...args);
  }
}

export function warn(...args: unknown[]): void {
  if (isStreamWritable(process.stderr)) {
    console.warn(...args);
  }
}
