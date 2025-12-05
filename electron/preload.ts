import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

// Notification settings type
export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number; // Hour in 24h format (0-23)
  quietHoursEnd: number;   // Hour in 24h format (0-23)
}

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // App info
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getPlatform: () => ipcRenderer.invoke("get-platform"),
  isElectron: () => ipcRenderer.invoke("is-electron"),

  // Platform detection (synchronous)
  platform: process.platform,

  // Window controls (for custom title bar if needed)
  minimizeWindow: () => ipcRenderer.send("minimize-window"),
  maximizeWindow: () => ipcRenderer.send("maximize-window"),
  closeWindow: () => ipcRenderer.send("close-window"),

  // Auto-update APIs
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const listener = (_event: IpcRendererEvent, status: UpdateStatus) => {
      callback(status);
    };
    ipcRenderer.on("update-status", listener);
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener("update-status", listener);
    };
  },

  // Tracking state synchronization (for tray menu integration)
  notifyTrackingStateChanged: (enabled: boolean) => {
    ipcRenderer.send("tracking-state-changed", enabled);
  },
  getTrackingState: () => ipcRenderer.invoke("get-tracking-state"),
  onToggleTracking: (callback: (enabled: boolean) => void) => {
    const listener = (_event: IpcRendererEvent, enabled: boolean) => {
      callback(enabled);
    };
    ipcRenderer.on("toggle-tracking", listener);
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener("toggle-tracking", listener);
    };
  },

  // Launch at login settings
  getLaunchAtLogin: () => ipcRenderer.invoke("get-launch-at-login"),
  setLaunchAtLogin: (enabled: boolean) => ipcRenderer.invoke("set-launch-at-login", enabled),

  // System power state events (suspend/resume)
  onSystemSuspend: (callback: () => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on("system-suspend", listener);
    return () => {
      ipcRenderer.removeListener("system-suspend", listener);
    };
  },
  onSystemResume: (callback: () => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on("system-resume", listener);
    return () => {
      ipcRenderer.removeListener("system-resume", listener);
    };
  },

  // Notification APIs
  getNotificationSettings: () => ipcRenderer.invoke("get-notification-settings"),
  setNotificationSettings: (settings: Partial<NotificationSettings>) =>
    ipcRenderer.invoke("set-notification-settings", settings),
  sendFatigueAlert: (blinkRate: number) => ipcRenderer.invoke("send-fatigue-alert", blinkRate),
  testNotification: () => ipcRenderer.invoke("test-notification"),
  getNotificationState: () => ipcRenderer.invoke("get-notification-state"),
  openNotificationSettings: () => ipcRenderer.invoke("open-notification-settings"),

  // Camera permission APIs (macOS)
  getCameraPermissionStatus: () => ipcRenderer.invoke("get-camera-permission-status"),
  requestCameraPermission: () => ipcRenderer.invoke("request-camera-permission"),
  openCameraSettings: () => ipcRenderer.invoke("open-camera-settings"),
});

// Update status type (mirrors the one in updater.ts)
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

// Type definitions for the exposed API are in src/lib/electron.ts
// to avoid duplicate global declarations during Next.js build
