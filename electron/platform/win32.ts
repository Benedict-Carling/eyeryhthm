/**
 * Windows platform implementation
 */

import type { NativeImage } from "electron";
import path from "path";
import type { PlatformHandler, PlatformWindowConfig, PlatformTrayConfig, PlatformSettingsUrls, MediaAccessStatus } from "./types";

export class Win32PlatformHandler implements PlatformHandler {
  readonly platform = "win32" as const;
  readonly supportsDock = false;
  readonly supportsNativeCameraPermission = false;
  readonly supportsLoginItems = true;
  readonly hideToTrayOnClose = false; // Windows typically quits on window close, but can minimize to tray

  getWindowConfig(): PlatformWindowConfig {
    // Windows uses standard frame with custom title bar possible via titleBarOverlay
    return {
      frame: true,
      // titleBarOverlay can be used for Windows custom title bar if desired:
      // titleBarOverlay: {
      //   color: '#111113',
      //   symbolColor: '#ffffff',
      //   height: 30,
      // },
    };
  }

  getTrayConfig(_isDev: boolean, _resourcesPath: string, dirname: string): PlatformTrayConfig {
    // Windows uses .ico files for best quality, but PNG also works
    // For now, use the same icon file - Windows handles PNG fine for tray
    const iconPath = path.join(dirname, '../build-resources/icon.png');
    return {
      iconPath,
      isTemplate: false,
    };
  }

  configureTrayIcon(icon: NativeImage): NativeImage {
    // Windows doesn't need special configuration for tray icons
    return icon;
  }

  getNotificationIconPath(_isDev: boolean, _resourcesPath: string, dirname: string): string {
    // Windows notifications work best with PNG
    return path.join(dirname, '../build-resources/icon.png');
  }

  getSettingsUrls(): PlatformSettingsUrls {
    return {
      notifications: 'ms-settings:notifications',
      camera: 'ms-settings:privacy-webcam',
    };
  }

  async requestCameraPermission(): Promise<boolean> {
    // Windows handles camera permission through the browser/Chromium
    // Permission is requested when getUserMedia is called
    return true;
  }

  getCameraPermissionStatus(): MediaAccessStatus {
    // Windows doesn't have a system-level API to check camera permission
    // The permission is handled by Chromium at runtime
    return 'granted';
  }

  showDock(): void {
    // Windows doesn't have a dock - no-op
  }

  hideDock(): void {
    // Windows doesn't have a dock - no-op
  }
}
