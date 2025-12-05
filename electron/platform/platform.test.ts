import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NativeImage } from "electron";

// Mock Electron modules before importing platform handlers
vi.mock("electron", () => ({
  app: {
    dock: {
      show: vi.fn(),
      hide: vi.fn(),
    },
  },
  systemPreferences: {
    getMediaAccessStatus: vi.fn(),
    askForMediaAccess: vi.fn(),
  },
  nativeImage: {
    createFromPath: vi.fn(),
    createEmpty: vi.fn(),
  },
}));

vi.mock("../logger", () => ({
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Import after mocks are set up
import { DarwinPlatformHandler } from "./darwin";
import { Win32PlatformHandler } from "./win32";
import { LinuxPlatformHandler } from "./linux";
import { app, systemPreferences } from "electron";

describe("Platform Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DarwinPlatformHandler", () => {
    let handler: DarwinPlatformHandler;

    beforeEach(() => {
      handler = new DarwinPlatformHandler();
    });

    it("should have correct platform identifier", () => {
      expect(handler.platform).toBe("darwin");
    });

    it("should support dock", () => {
      expect(handler.supportsDock).toBe(true);
    });

    it("should support native camera permission", () => {
      expect(handler.supportsNativeCameraPermission).toBe(true);
    });

    it("should support login items", () => {
      expect(handler.supportsLoginItems).toBe(true);
    });

    it("should hide to tray on close", () => {
      expect(handler.hideToTrayOnClose).toBe(true);
    });

    describe("getWindowConfig", () => {
      it("should return hiddenInset title bar style", () => {
        const config = handler.getWindowConfig();
        expect(config.titleBarStyle).toBe("hiddenInset");
      });

      it("should set traffic light position", () => {
        const config = handler.getWindowConfig();
        expect(config.trafficLightPosition).toEqual({ x: 16, y: 12 });
      });
    });

    describe("getTrayConfig", () => {
      it("should use template icon path in dev mode", () => {
        const config = handler.getTrayConfig(true, "/resources", "/electron");
        expect(config.iconPath).toContain("trayIconTemplate.png");
        expect(config.iconPath).toContain("build-resources");
        expect(config.isTemplate).toBe(true);
      });

      it("should use resources path in production", () => {
        const config = handler.getTrayConfig(false, "/app/resources", "/electron");
        expect(config.iconPath).toBe("/app/resources/trayIconTemplate.png");
        expect(config.isTemplate).toBe(true);
      });
    });

    describe("configureTrayIcon", () => {
      it("should set template image to true", () => {
        const mockIcon = {
          setTemplateImage: vi.fn(),
        } as unknown as NativeImage;

        handler.configureTrayIcon(mockIcon);
        expect(mockIcon.setTemplateImage).toHaveBeenCalledWith(true);
      });
    });

    describe("getNotificationIconPath", () => {
      it("should use build-resources in dev mode", () => {
        const path = handler.getNotificationIconPath(true, "/resources", "/electron");
        expect(path).toContain("build-resources/icon.png");
      });

      it("should use resources path in production", () => {
        const path = handler.getNotificationIconPath(false, "/app/resources", "/electron");
        expect(path).toBe("/app/resources/icon.png");
      });
    });

    describe("getSettingsUrls", () => {
      it("should return macOS system preferences URLs", () => {
        const urls = handler.getSettingsUrls();
        expect(urls.notifications).toContain("x-apple.systempreferences");
        expect(urls.camera).toContain("Privacy_Camera");
      });
    });

    describe("getCameraPermissionStatus", () => {
      it("should delegate to systemPreferences", () => {
        vi.mocked(systemPreferences.getMediaAccessStatus).mockReturnValue("granted");
        const status = handler.getCameraPermissionStatus();
        expect(status).toBe("granted");
        expect(systemPreferences.getMediaAccessStatus).toHaveBeenCalledWith("camera");
      });
    });

    describe("requestCameraPermission", () => {
      it("should return true if already granted", async () => {
        vi.mocked(systemPreferences.getMediaAccessStatus).mockReturnValue("granted");
        const result = await handler.requestCameraPermission();
        expect(result).toBe(true);
        expect(systemPreferences.askForMediaAccess).not.toHaveBeenCalled();
      });

      it("should return false if denied", async () => {
        vi.mocked(systemPreferences.getMediaAccessStatus).mockReturnValue("denied");
        const result = await handler.requestCameraPermission();
        expect(result).toBe(false);
      });

      it("should request access if not-determined", async () => {
        vi.mocked(systemPreferences.getMediaAccessStatus).mockReturnValue("not-determined");
        vi.mocked(systemPreferences.askForMediaAccess).mockResolvedValue(true);
        const result = await handler.requestCameraPermission();
        expect(result).toBe(true);
        expect(systemPreferences.askForMediaAccess).toHaveBeenCalledWith("camera");
      });
    });

    describe("dock visibility", () => {
      it("should call app.dock.show when showDock is called", () => {
        handler.showDock();
        expect(app.dock?.show).toHaveBeenCalled();
      });

      it("should call app.dock.hide when hideDock is called", () => {
        handler.hideDock();
        expect(app.dock?.hide).toHaveBeenCalled();
      });
    });
  });

  describe("Win32PlatformHandler", () => {
    let handler: Win32PlatformHandler;

    beforeEach(() => {
      handler = new Win32PlatformHandler();
    });

    it("should have correct platform identifier", () => {
      expect(handler.platform).toBe("win32");
    });

    it("should not support dock", () => {
      expect(handler.supportsDock).toBe(false);
    });

    it("should not support native camera permission", () => {
      expect(handler.supportsNativeCameraPermission).toBe(false);
    });

    it("should support login items", () => {
      expect(handler.supportsLoginItems).toBe(true);
    });

    it("should not hide to tray on close by default", () => {
      expect(handler.hideToTrayOnClose).toBe(false);
    });

    describe("getWindowConfig", () => {
      it("should use standard frame", () => {
        const config = handler.getWindowConfig();
        expect(config.frame).toBe(true);
      });

      it("should not set traffic light position", () => {
        const config = handler.getWindowConfig();
        expect(config.trafficLightPosition).toBeUndefined();
      });
    });

    describe("getTrayConfig", () => {
      it("should use icon.png in dev mode", () => {
        const config = handler.getTrayConfig(true, "/resources", "/electron");
        expect(config.iconPath).toContain("build-resources/icon.png");
        expect(config.isTemplate).toBe(false);
      });

      it("should use resources path in production", () => {
        const config = handler.getTrayConfig(false, "/app/resources", "/electron");
        expect(config.iconPath).toBe("/app/resources/icon.png");
        expect(config.isTemplate).toBe(false);
      });
    });

    describe("getNotificationIconPath", () => {
      it("should use build-resources in dev mode", () => {
        const path = handler.getNotificationIconPath(true, "/resources", "/electron");
        expect(path).toContain("build-resources/icon.png");
      });

      it("should use resources path in production", () => {
        const path = handler.getNotificationIconPath(false, "/app/resources", "/electron");
        expect(path).toBe("/app/resources/icon.png");
      });
    });

    describe("getSettingsUrls", () => {
      it("should return Windows ms-settings URLs", () => {
        const urls = handler.getSettingsUrls();
        expect(urls.notifications).toBe("ms-settings:notifications");
        expect(urls.camera).toBe("ms-settings:privacy-webcam");
      });
    });

    describe("camera permission", () => {
      it("should always return granted status", () => {
        expect(handler.getCameraPermissionStatus()).toBe("granted");
      });

      it("should always grant permission request", async () => {
        const result = await handler.requestCameraPermission();
        expect(result).toBe(true);
      });
    });

    describe("dock visibility (no-op)", () => {
      it("should not throw when showDock is called", () => {
        expect(() => handler.showDock()).not.toThrow();
      });

      it("should not throw when hideDock is called", () => {
        expect(() => handler.hideDock()).not.toThrow();
      });
    });
  });

  describe("LinuxPlatformHandler", () => {
    let handler: LinuxPlatformHandler;

    beforeEach(() => {
      handler = new LinuxPlatformHandler();
    });

    it("should have correct platform identifier", () => {
      expect(handler.platform).toBe("linux");
    });

    it("should not support dock", () => {
      expect(handler.supportsDock).toBe(false);
    });

    it("should not support native camera permission", () => {
      expect(handler.supportsNativeCameraPermission).toBe(false);
    });

    it("should not support login items", () => {
      expect(handler.supportsLoginItems).toBe(false);
    });

    it("should not hide to tray on close", () => {
      expect(handler.hideToTrayOnClose).toBe(false);
    });

    describe("getWindowConfig", () => {
      it("should use standard frame", () => {
        const config = handler.getWindowConfig();
        expect(config.frame).toBe(true);
      });
    });

    describe("getTrayConfig", () => {
      it("should use icon.png in dev mode", () => {
        const config = handler.getTrayConfig(true, "/resources", "/electron");
        expect(config.iconPath).toContain("build-resources/icon.png");
        expect(config.isTemplate).toBe(false);
      });

      it("should use resources path in production", () => {
        const config = handler.getTrayConfig(false, "/app/resources", "/electron");
        expect(config.iconPath).toBe("/app/resources/icon.png");
        expect(config.isTemplate).toBe(false);
      });
    });

    describe("getNotificationIconPath", () => {
      it("should use build-resources in dev mode", () => {
        const path = handler.getNotificationIconPath(true, "/resources", "/electron");
        expect(path).toContain("build-resources/icon.png");
      });

      it("should use resources path in production", () => {
        const path = handler.getNotificationIconPath(false, "/app/resources", "/electron");
        expect(path).toBe("/app/resources/icon.png");
      });
    });

    describe("getSettingsUrls", () => {
      it("should return undefined URLs (no universal settings on Linux)", () => {
        const urls = handler.getSettingsUrls();
        expect(urls.notifications).toBeUndefined();
        expect(urls.camera).toBeUndefined();
      });
    });

    describe("camera permission", () => {
      it("should always return granted status", () => {
        expect(handler.getCameraPermissionStatus()).toBe("granted");
      });

      it("should always grant permission request", async () => {
        const result = await handler.requestCameraPermission();
        expect(result).toBe(true);
      });
    });

    describe("dock visibility (no-op)", () => {
      it("should not throw when showDock is called", () => {
        expect(() => handler.showDock()).not.toThrow();
      });

      it("should not throw when hideDock is called", () => {
        expect(() => handler.hideDock()).not.toThrow();
      });
    });
  });
});
