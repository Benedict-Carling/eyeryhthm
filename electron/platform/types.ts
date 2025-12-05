/**
 * Platform abstraction types for cross-platform Electron support
 */

import type { BrowserWindowConstructorOptions, NativeImage } from "electron";

/**
 * Camera permission status returned by the platform
 */
export type MediaAccessStatus = 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';

/**
 * Platform-specific window configuration
 */
export interface PlatformWindowConfig {
  /** Title bar style for the window */
  titleBarStyle?: BrowserWindowConstructorOptions['titleBarStyle'];
  /** Whether the window has a frame (title bar and borders) */
  frame?: boolean;
  /** Position of traffic light buttons (macOS only) */
  trafficLightPosition?: { x: number; y: number };
  /** Whether the title bar overlay is visible (Windows only) */
  titleBarOverlay?: boolean | { color?: string; symbolColor?: string; height?: number };
}

/**
 * Platform-specific tray configuration
 */
export interface PlatformTrayConfig {
  /** Path to the tray icon */
  iconPath: string;
  /** Whether the icon is a template image (for automatic dark/light mode on macOS) */
  isTemplate: boolean;
}

/**
 * System settings URLs for each platform
 */
export interface PlatformSettingsUrls {
  /** URL to open notification settings */
  notifications?: string;
  /** URL to open camera/privacy settings */
  camera?: string;
}

/**
 * Platform handler interface - each platform implements this
 */
export interface PlatformHandler {
  /** Platform identifier */
  readonly platform: NodeJS.Platform;

  /** Whether this platform supports dock icon visibility control */
  readonly supportsDock: boolean;

  /** Whether this platform supports native camera permission APIs */
  readonly supportsNativeCameraPermission: boolean;

  /** Whether this platform supports login item settings */
  readonly supportsLoginItems: boolean;

  /** Whether the window should hide to tray instead of closing */
  readonly hideToTrayOnClose: boolean;

  /**
   * Get window configuration options for this platform
   */
  getWindowConfig(): PlatformWindowConfig;

  /**
   * Get tray icon configuration for this platform
   * @param isDev Whether running in development mode
   * @param resourcesPath Path to app resources in production
   * @param dirname The __dirname of the caller
   */
  getTrayConfig(isDev: boolean, resourcesPath: string, dirname: string): PlatformTrayConfig;

  /**
   * Configure the tray icon for the platform
   * @param icon The native image to configure
   * @returns The configured native image
   */
  configureTrayIcon(icon: NativeImage): NativeImage;

  /**
   * Get the path to the notification icon
   * @param isDev Whether running in development mode
   * @param resourcesPath Path to app resources in production
   * @param dirname The __dirname of the caller
   */
  getNotificationIconPath(isDev: boolean, resourcesPath: string, dirname: string): string;

  /**
   * Get URLs for opening system settings
   */
  getSettingsUrls(): PlatformSettingsUrls;

  /**
   * Request camera permission from the operating system
   * @returns Promise resolving to whether permission was granted
   */
  requestCameraPermission(): Promise<boolean>;

  /**
   * Get the current camera permission status
   * @returns The current permission status
   */
  getCameraPermissionStatus(): MediaAccessStatus;

  /**
   * Show the dock icon (macOS only, no-op on other platforms)
   */
  showDock(): void;

  /**
   * Hide the dock icon (macOS only, no-op on other platforms)
   */
  hideDock(): void;
}
