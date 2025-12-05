"use client";

import { useState, useMemo, useEffect } from "react";

/**
 * Platform types supported by the application
 */
export type Platform = "darwin" | "win32" | "linux" | "web";

/**
 * Platform capabilities and features
 */
export interface PlatformCapabilities {
  /** Whether the platform supports native camera permission dialogs */
  supportsNativeCameraPermission: boolean;
  /** Whether the platform supports dock icon visibility control */
  supportsDock: boolean;
  /** Whether the platform supports login item settings */
  supportsLoginItems: boolean;
  /** Whether the platform hides to tray on window close */
  hideToTrayOnClose: boolean;
  /** Whether this is a macOS native title bar platform */
  hasNativeTitleBar: boolean;
  /** Whether this platform requires traffic light accommodation */
  hasTrafficLights: boolean;
}

/**
 * Platform information returned by the hook
 */
export interface PlatformInfo {
  /** The current platform identifier */
  platform: Platform;
  /** Whether running in Electron desktop app */
  isElectron: boolean;
  /** Whether running on macOS */
  isDarwin: boolean;
  /** Whether running on Windows */
  isWindows: boolean;
  /** Whether running on Linux */
  isLinux: boolean;
  /** Whether running in a browser (not Electron) */
  isWeb: boolean;
  /** Platform-specific capabilities */
  capabilities: PlatformCapabilities;
  /** Whether the platform info has been loaded */
  isLoading: boolean;
}

/**
 * Default capabilities for web/unknown platforms
 */
const WEB_CAPABILITIES: PlatformCapabilities = {
  supportsNativeCameraPermission: false,
  supportsDock: false,
  supportsLoginItems: false,
  hideToTrayOnClose: false,
  hasNativeTitleBar: false,
  hasTrafficLights: false,
};

/**
 * macOS-specific capabilities
 */
const DARWIN_CAPABILITIES: PlatformCapabilities = {
  supportsNativeCameraPermission: true,
  supportsDock: true,
  supportsLoginItems: true,
  hideToTrayOnClose: true,
  hasNativeTitleBar: true,
  hasTrafficLights: true,
};

/**
 * Windows-specific capabilities
 */
const WIN32_CAPABILITIES: PlatformCapabilities = {
  supportsNativeCameraPermission: false,
  supportsDock: false,
  supportsLoginItems: true,
  hideToTrayOnClose: false,
  hasNativeTitleBar: false,
  hasTrafficLights: false,
};

/**
 * Linux-specific capabilities
 */
const LINUX_CAPABILITIES: PlatformCapabilities = {
  supportsNativeCameraPermission: false,
  supportsDock: false,
  supportsLoginItems: false,
  hideToTrayOnClose: false,
  hasNativeTitleBar: false,
  hasTrafficLights: false,
};

/**
 * Get capabilities for a given platform
 */
function getCapabilitiesForPlatform(platform: Platform): PlatformCapabilities {
  switch (platform) {
    case "darwin":
      return DARWIN_CAPABILITIES;
    case "win32":
      return WIN32_CAPABILITIES;
    case "linux":
      return LINUX_CAPABILITIES;
    default:
      return WEB_CAPABILITIES;
  }
}

/**
 * Detect platform information at initialization
 * This runs once and returns static values
 */
function detectPlatform(): { platform: Platform; isElectron: boolean } {
  if (typeof window !== "undefined" && window.electronAPI) {
    const electronPlatform = window.electronAPI.platform as Platform;
    if (electronPlatform === "darwin" || electronPlatform === "win32" || electronPlatform === "linux") {
      return { platform: electronPlatform, isElectron: true };
    }
    return { platform: "web", isElectron: true };
  }
  return { platform: "web", isElectron: false };
}

/**
 * Hook to get current platform information
 *
 * This hook provides platform detection and capability information for both
 * Electron desktop and web browser environments. It handles the complexity
 * of platform-specific features and provides a unified interface.
 *
 * Note: Platform detection happens after hydration to avoid SSR mismatches.
 * The initial render will show web defaults, then update to the correct
 * platform after mount.
 *
 * @example
 * ```tsx
 * const { isDarwin, isElectron, capabilities } = usePlatform();
 *
 * if (isElectron && capabilities.hasTrafficLights) {
 *   // Render macOS traffic light accommodation
 * }
 * ```
 */
export function usePlatform(): PlatformInfo {
  // Start with safe defaults that match server-side rendering
  // This prevents hydration mismatches
  const [platformState, setPlatformState] = useState<{
    platform: Platform;
    isElectron: boolean;
    isLoading: boolean;
  }>({
    platform: "web",
    isElectron: false,
    isLoading: true,
  });

  // Detect platform after mount to avoid hydration mismatch
  useEffect(() => {
    const detected = detectPlatform();
    setPlatformState({
      platform: detected.platform,
      isElectron: detected.isElectron,
      isLoading: false,
    });
  }, []);

  const { platform, isElectron, isLoading } = platformState;

  // Derive platform-specific values
  const isDarwin = platform === "darwin";
  const isWindows = platform === "win32";
  const isLinux = platform === "linux";
  const isWeb = !isElectron;

  // Get capabilities for current platform
  const capabilities = useMemo(
    () => getCapabilitiesForPlatform(platform),
    [platform]
  );

  return {
    platform,
    isElectron,
    isDarwin,
    isWindows,
    isLinux,
    isWeb,
    capabilities,
    isLoading,
  };
}
