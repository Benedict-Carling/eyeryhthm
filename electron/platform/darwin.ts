/**
 * macOS platform implementation
 */

import { app, systemPreferences, NativeImage } from "electron";
import path from "path";
import type { PlatformHandler, PlatformWindowConfig, PlatformTrayConfig, PlatformSettingsUrls, MediaAccessStatus } from "./types";
import { log, warn } from "../logger";

export class DarwinPlatformHandler implements PlatformHandler {
  readonly platform = "darwin" as const;
  readonly supportsDock = true;
  readonly supportsNativeCameraPermission = true;
  readonly supportsLoginItems = true;
  readonly hideToTrayOnClose = true;

  getWindowConfig(): PlatformWindowConfig {
    return {
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: 16, y: 12 },
    };
  }

  getTrayConfig(isDev: boolean, resourcesPath: string, dirname: string): PlatformTrayConfig {
    let iconPath: string;
    if (isDev) {
      iconPath = path.join(dirname, '../build-resources/trayIconTemplate.png');
    } else {
      iconPath = path.join(resourcesPath, 'trayIconTemplate.png');
    }
    return {
      iconPath,
      isTemplate: true,
    };
  }

  configureTrayIcon(icon: NativeImage): NativeImage {
    // Mark as template image for macOS (enables automatic dark/light mode inversion)
    icon.setTemplateImage(true);
    return icon;
  }

  getNotificationIconPath(isDev: boolean, resourcesPath: string, dirname: string): string {
    if (isDev) {
      return path.join(dirname, '../build-resources/icon.png');
    }
    return path.join(resourcesPath, 'icon.png');
  }

  getSettingsUrls(): PlatformSettingsUrls {
    return {
      notifications: 'x-apple.systempreferences:com.apple.preference.notifications',
      camera: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera',
    };
  }

  async requestCameraPermission(): Promise<boolean> {
    const status = systemPreferences.getMediaAccessStatus('camera');
    log('[Camera] Current permission status:', status);

    if (status === 'granted') {
      return true;
    }

    if (status === 'denied' || status === 'restricted') {
      warn('[Camera] Permission denied or restricted. User must enable in System Settings.');
      return false;
    }

    // Status is 'not-determined' - request permission
    log('[Camera] Requesting camera permission from user...');
    const granted = await systemPreferences.askForMediaAccess('camera');
    log('[Camera] Permission request result:', granted ? 'granted' : 'denied');
    return granted;
  }

  getCameraPermissionStatus(): MediaAccessStatus {
    return systemPreferences.getMediaAccessStatus('camera') as MediaAccessStatus;
  }

  showDock(): void {
    if (app.dock) {
      app.dock.show();
    }
  }

  hideDock(): void {
    if (app.dock) {
      app.dock.hide();
    }
  }
}
