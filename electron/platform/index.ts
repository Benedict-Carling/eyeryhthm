/**
 * Platform abstraction layer for cross-platform Electron support
 *
 * This module provides a unified interface for platform-specific functionality,
 * allowing the main process code to be platform-agnostic while still supporting
 * platform-specific features where necessary.
 */

import type { PlatformHandler } from "./types";
import { DarwinPlatformHandler } from "./darwin";
import { Win32PlatformHandler } from "./win32";
import { LinuxPlatformHandler } from "./linux";

export type { PlatformHandler, PlatformWindowConfig, PlatformTrayConfig, PlatformSettingsUrls, MediaAccessStatus } from "./types";

/**
 * Create the appropriate platform handler for the current OS
 */
function createPlatformHandler(): PlatformHandler {
  switch (process.platform) {
    case "darwin":
      return new DarwinPlatformHandler();
    case "win32":
      return new Win32PlatformHandler();
    case "linux":
      return new LinuxPlatformHandler();
    default:
      // Default to Linux behavior for unknown platforms
      return new LinuxPlatformHandler();
  }
}

/**
 * Singleton platform handler instance
 * Use this for all platform-specific operations
 */
export const platform = createPlatformHandler();

/**
 * Check if running on macOS
 */
export function isDarwin(): boolean {
  return process.platform === "darwin";
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return process.platform === "win32";
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return process.platform === "linux";
}
