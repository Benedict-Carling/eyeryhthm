/**
 * Linux platform implementation
 */

import type { NativeImage } from "electron";
import path from "path";
import type { PlatformHandler, PlatformWindowConfig, PlatformTrayConfig, PlatformSettingsUrls, MediaAccessStatus } from "./types";

export class LinuxPlatformHandler implements PlatformHandler {
  readonly platform = "linux" as const;
  readonly supportsDock = false;
  readonly supportsNativeCameraPermission = false;
  readonly supportsLoginItems = false; // Linux login items require desktop-specific handling
  readonly hideToTrayOnClose = false;

  getWindowConfig(): PlatformWindowConfig {
    // Linux uses standard frame
    return {
      frame: true,
    };
  }

  getTrayConfig(_isDev: boolean, _resourcesPath: string, dirname: string): PlatformTrayConfig {
    // Linux uses PNG for tray icons
    const iconPath = path.join(dirname, '../build-resources/icon.png');
    return {
      iconPath,
      isTemplate: false,
    };
  }

  configureTrayIcon(icon: NativeImage): NativeImage {
    // Linux doesn't need special configuration for tray icons
    return icon;
  }

  getNotificationIconPath(_isDev: boolean, _resourcesPath: string, dirname: string): string {
    return path.join(dirname, '../build-resources/icon.png');
  }

  getSettingsUrls(): PlatformSettingsUrls {
    // Linux doesn't have universal settings URLs
    // Different desktop environments have different settings apps
    return {
      notifications: undefined,
      camera: undefined,
    };
  }

  async requestCameraPermission(): Promise<boolean> {
    // Linux handles camera permission through the browser/Chromium
    // Some distros may use PipeWire portal for permission
    return true;
  }

  getCameraPermissionStatus(): MediaAccessStatus {
    // Linux doesn't have a system-level API to check camera permission
    // The permission is handled by Chromium/PipeWire at runtime
    return 'granted';
  }

  showDock(): void {
    // Linux doesn't have a dock in the same way - no-op
  }

  hideDock(): void {
    // Linux doesn't have a dock in the same way - no-op
  }
}
