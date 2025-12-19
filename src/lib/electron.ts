/**
 * Electron integration utilities
 *
 * This module provides utilities for detecting and interacting with
 * the Electron environment when running as a desktop app.
 */

import type {
  NotificationSettings,
  NotificationState,
  TestNotificationResult,
} from "../../shared/types/notifications";

// Re-export notification types for consumers
export type { NotificationSettings, NotificationState, TestNotificationResult };

export interface UpdateStatus {
  status:
    | "checking"
    | "available"
    | "not-available"
    | "downloading"
    | "downloaded"
    | "error";
  info?: {
    version: string;
    releaseDate?: string;
    releaseNotes?: string;
  };
  error?: string;
  progress?: {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
  };
}

export type CameraPermissionStatus = 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';

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
  // Auto-update APIs
  checkForUpdates: () => Promise<unknown>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
  // Tracking state synchronization (for tray menu integration)
  notifyTrackingStateChanged: (enabled: boolean) => void;
  getTrackingState: () => Promise<boolean>;
  onToggleTracking: (callback: (enabled: boolean) => void) => () => void;
  // Launch at login settings
  getLaunchAtLogin: () => Promise<boolean>;
  setLaunchAtLogin: (enabled: boolean) => Promise<boolean>;
  // System power state events (suspend/resume)
  onSystemSuspend: (callback: () => void) => () => void;
  onSystemResume: (callback: () => void) => () => void;
  // Notification APIs
  getNotificationSettings: () => Promise<NotificationSettings>;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<NotificationSettings>;
  sendFatigueAlert: (blinkRate: number) => Promise<boolean>;
  testNotification: () => Promise<TestNotificationResult>;
  getNotificationState: () => Promise<NotificationState>;
  openNotificationSettings: () => Promise<boolean>;
  // Camera permission APIs (macOS)
  getCameraPermissionStatus: () => Promise<CameraPermissionStatus>;
  requestCameraPermission: () => Promise<boolean>;
  openCameraSettings: () => Promise<boolean>;
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
