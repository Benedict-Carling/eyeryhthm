/**
 * Electron integration utilities
 *
 * This module provides utilities for detecting and interacting with
 * the Electron environment when running as a desktop app.
 */

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<{
    platform: string;
    arch: string;
    version: string;
  }>;
  isElectron: () => Promise<boolean>;
  platform: string;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/**
 * Check if the app is running in Electron
 */
export function isElectron(): boolean {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    return false;
  }

  // Check for Electron-specific indicators
  return (
    typeof window.electronAPI !== "undefined" ||
    // Alternative detection methods
    navigator.userAgent.toLowerCase().includes("electron") ||
    // Check for Electron's process object (though this is deprecated)
    typeof (window as unknown as { process?: { type?: string } }).process?.type === "string"
  );
}

/**
 * Get the Electron API if available
 */
export function getElectronAPI(): ElectronAPI | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.electronAPI ?? null;
}

/**
 * Get the app version (works in both web and Electron)
 */
export async function getAppVersion(): Promise<string> {
  const api = getElectronAPI();
  if (api) {
    return api.getAppVersion();
  }
  // Fallback for web
  return process.env.npm_package_version ?? "0.1.0";
}

/**
 * Get platform information
 */
export async function getPlatformInfo(): Promise<{
  platform: string;
  arch: string;
  version: string;
  isElectron: boolean;
}> {
  const api = getElectronAPI();
  if (api) {
    const platformInfo = await api.getPlatform();
    return {
      ...platformInfo,
      isElectron: true,
    };
  }

  // Fallback for web
  return {
    platform: "web",
    arch: "unknown",
    version: navigator.userAgent,
    isElectron: false,
  };
}
