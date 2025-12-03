import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isElectron, getElectronAPI, getAppVersion, getPlatformInfo } from "./electron";
import type { ElectronAPI } from "./electron";

describe("electron utilities", () => {
  beforeEach(() => {
    // Reset window between tests
    vi.stubGlobal("window", {
      navigator: {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("isElectron", () => {
    it("returns false when window is undefined", () => {
      vi.stubGlobal("window", undefined);
      expect(isElectron()).toBe(false);
    });

    it("returns false in a regular browser environment", () => {
      vi.stubGlobal("window", {
        navigator: {
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        },
      });
      expect(isElectron()).toBe(false);
    });

    it("returns true when electronAPI is present", () => {
      const mockAPI: ElectronAPI = {
        getAppVersion: vi.fn(),
        getPlatform: vi.fn(),
        isElectron: vi.fn(),
        platform: "darwin",
        minimizeWindow: vi.fn(),
        maximizeWindow: vi.fn(),
        closeWindow: vi.fn(),
        checkForUpdates: vi.fn(),
        downloadUpdate: vi.fn(),
        installUpdate: vi.fn(),
        onUpdateStatus: vi.fn(),
        notifyTrackingStateChanged: vi.fn(),
        getTrackingState: vi.fn(),
        onToggleTracking: vi.fn(),
        getLaunchAtLogin: vi.fn(),
        setLaunchAtLogin: vi.fn(),
      };

      vi.stubGlobal("window", {
        electronAPI: mockAPI,
        navigator: {
          userAgent: "Mozilla/5.0",
        },
      });

      expect(isElectron()).toBe(true);
    });

    it("returns true when userAgent contains 'electron'", () => {
      // Need to stub navigator as well since isElectron uses navigator.userAgent
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Electron/28.0.0",
      });
      vi.stubGlobal("window", {
        navigator: {
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Electron/28.0.0",
        },
      });
      expect(isElectron()).toBe(true);
    });
  });

  describe("getElectronAPI", () => {
    it("returns null when window is undefined", () => {
      vi.stubGlobal("window", undefined);
      expect(getElectronAPI()).toBe(null);
    });

    it("returns null when electronAPI is not present", () => {
      vi.stubGlobal("window", {
        navigator: {
          userAgent: "Mozilla/5.0",
        },
      });
      expect(getElectronAPI()).toBe(null);
    });

    it("returns the electronAPI when present", () => {
      const mockAPI: ElectronAPI = {
        getAppVersion: vi.fn(),
        getPlatform: vi.fn(),
        isElectron: vi.fn(),
        platform: "darwin",
        minimizeWindow: vi.fn(),
        maximizeWindow: vi.fn(),
        closeWindow: vi.fn(),
        checkForUpdates: vi.fn(),
        downloadUpdate: vi.fn(),
        installUpdate: vi.fn(),
        onUpdateStatus: vi.fn(),
        notifyTrackingStateChanged: vi.fn(),
        getTrackingState: vi.fn(),
        onToggleTracking: vi.fn(),
        getLaunchAtLogin: vi.fn(),
        setLaunchAtLogin: vi.fn(),
      };

      vi.stubGlobal("window", {
        electronAPI: mockAPI,
        navigator: {
          userAgent: "Mozilla/5.0",
        },
      });

      expect(getElectronAPI()).toBe(mockAPI);
    });
  });

  describe("getAppVersion", () => {
    it("returns version from electronAPI when in Electron", async () => {
      const mockAPI: ElectronAPI = {
        getAppVersion: vi.fn().mockResolvedValue("1.2.3"),
        getPlatform: vi.fn(),
        isElectron: vi.fn(),
        platform: "darwin",
        minimizeWindow: vi.fn(),
        maximizeWindow: vi.fn(),
        closeWindow: vi.fn(),
        checkForUpdates: vi.fn(),
        downloadUpdate: vi.fn(),
        installUpdate: vi.fn(),
        onUpdateStatus: vi.fn(),
        notifyTrackingStateChanged: vi.fn(),
        getTrackingState: vi.fn(),
        onToggleTracking: vi.fn(),
        getLaunchAtLogin: vi.fn(),
        setLaunchAtLogin: vi.fn(),
      };

      vi.stubGlobal("window", {
        electronAPI: mockAPI,
        navigator: {
          userAgent: "Mozilla/5.0",
        },
      });

      const version = await getAppVersion();
      expect(version).toBe("1.2.3");
      expect(mockAPI.getAppVersion).toHaveBeenCalled();
    });

    it("returns fallback version when not in Electron", async () => {
      vi.stubGlobal("window", {
        navigator: {
          userAgent: "Mozilla/5.0",
        },
      });

      const version = await getAppVersion();
      // The fallback uses process.env.npm_package_version which is set during npm run
      // So we just check that it returns a string version format
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("getPlatformInfo", () => {
    it("returns platform info from electronAPI when in Electron", async () => {
      const mockPlatformInfo = {
        platform: "darwin",
        arch: "arm64",
        version: "14.0.0",
      };

      const mockAPI: ElectronAPI = {
        getAppVersion: vi.fn(),
        getPlatform: vi.fn().mockResolvedValue(mockPlatformInfo),
        isElectron: vi.fn(),
        platform: "darwin",
        minimizeWindow: vi.fn(),
        maximizeWindow: vi.fn(),
        closeWindow: vi.fn(),
        checkForUpdates: vi.fn(),
        downloadUpdate: vi.fn(),
        installUpdate: vi.fn(),
        onUpdateStatus: vi.fn(),
        notifyTrackingStateChanged: vi.fn(),
        getTrackingState: vi.fn(),
        onToggleTracking: vi.fn(),
        getLaunchAtLogin: vi.fn(),
        setLaunchAtLogin: vi.fn(),
      };

      vi.stubGlobal("window", {
        electronAPI: mockAPI,
        navigator: {
          userAgent: "Mozilla/5.0",
        },
      });

      const platformInfo = await getPlatformInfo();
      expect(platformInfo).toEqual({
        ...mockPlatformInfo,
        isElectron: true,
      });
      expect(mockAPI.getPlatform).toHaveBeenCalled();
    });

    it("returns web platform info when not in Electron", async () => {
      vi.stubGlobal("window", {
        navigator: {
          userAgent: "Mozilla/5.0 Test Browser",
        },
      });

      const platformInfo = await getPlatformInfo();
      expect(platformInfo.platform).toBe("web");
      expect(platformInfo.arch).toBe("unknown");
      expect(platformInfo.isElectron).toBe(false);
      // userAgent will be the jsdom default, so just check it's a string
      expect(typeof platformInfo.version).toBe("string");
    });
  });
});
