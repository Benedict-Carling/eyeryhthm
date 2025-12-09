import { app, BrowserWindow, ipcMain, shell, protocol, net, Tray, Menu, nativeImage, powerSaveBlocker, powerMonitor, Notification, session } from "electron";
import path from "path";
import { pathToFileURL } from "url";
import { setupAutoUpdater } from "./updater";
// IMPORTANT: Import analytics early - it initializes Aptabase on import (before app.whenReady)
import { trackEvent, AnalyticsEvents } from "./analytics";
import { log, warn, error } from "./logger";
import { platform, isDarwin, isWindows } from "./platform";

import type { NotificationSettings } from "../shared/types/notifications";
import { DEFAULT_NOTIFICATION_SETTINGS } from "../shared/types/notifications";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let powerSaveBlockerId: number | null = null;

// Tracking state managed by main process (synced with renderer)
let isTrackingEnabled = false;
let launchAtLoginEnabled = false;

// Notification settings state
let notificationSettings: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };
let lastFatigueAlertTime: number = 0;
const FATIGUE_ALERT_COOLDOWN_MS = 60000; // 1 minute cooldown between alerts

const isDev = process.env.NODE_ENV !== "production" && !app.isPackaged;
// With rootDir: ".." in tsconfig, main.js is at dist-electron/electron/main.js
// So we need to go up two levels to reach the out/ directory
const outDir = path.resolve(__dirname, "../../out");

// Camera permission status type - imported from platform abstraction
import type { MediaAccessStatus } from "./platform";

// Request camera permission (delegates to platform handler)
async function requestCameraPermission(): Promise<boolean> {
  return platform.requestCameraPermission();
}

// Get current camera permission status (delegates to platform handler)
function getCameraPermissionStatus(): MediaAccessStatus {
  return platform.getCameraPermissionStatus();
}

// Set up session permission handlers for camera/media access
// This is critical for macOS to properly persist camera permissions and prevent
// repeated permission prompts. Without these handlers, each getUserMedia() call
// may trigger a new permission request on macOS.
function setupSessionPermissionHandlers() {
  const defaultSession = session.defaultSession;

  // Permission check handler - called before any permission request
  // Returns true/false synchronously based on current permission status
  defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    // Allow all permissions for our app protocol and localhost (dev server)
    const isAllowedOrigin = requestingOrigin.startsWith('app://') ||
                            requestingOrigin.startsWith('http://localhost');

    if (!isAllowedOrigin) {
      log(`[Permission] Denied check for ${permission} from untrusted origin: ${requestingOrigin}`);
      return false;
    }

    // For media permissions, check macOS system permission status
    if (permission === 'media') {
      const mediaType = details.mediaType;

      if (mediaType === 'video') {
        const status = getCameraPermissionStatus();
        const granted = status === 'granted';
        log(`[Permission] Camera check: ${status} -> ${granted ? 'allowed' : 'denied'}`);
        return granted;
      }

      // Allow audio checks (we don't use audio but don't want to block it)
      if (mediaType === 'audio') {
        return true;
      }
    }

    // Allow other permission types for our origin
    return true;
  });

  // Permission request handler - called when a permission is requested
  // Can be async via callback
  defaultSession.setPermissionRequestHandler(async (webContents, permission, callback, details) => {
    // Verify the request comes from our app
    const requestingUrl = webContents.getURL();
    const isAllowedOrigin = requestingUrl.startsWith('app://') ||
                            requestingUrl.startsWith('http://localhost');

    if (!isAllowedOrigin) {
      log(`[Permission] Denied request for ${permission} from untrusted origin: ${requestingUrl}`);
      callback(false);
      return;
    }

    // Handle media permission requests (camera/microphone)
    if (permission === 'media') {
      // Type-narrow to MediaAccessPermissionRequest
      const mediaDetails = details as { mediaTypes?: Array<'video' | 'audio'> };
      const mediaTypes = mediaDetails.mediaTypes || [];

      // Check if camera is requested
      if (mediaTypes.includes('video')) {
        const status = getCameraPermissionStatus();

        if (status === 'granted') {
          log('[Permission] Camera already granted at system level');
          callback(true);
          return;
        }

        if (status === 'denied' || status === 'restricted') {
          log('[Permission] Camera denied/restricted at system level');
          callback(false);
          return;
        }

        // Status is 'not-determined' - request permission from macOS
        if (status === 'not-determined') {
          log('[Permission] Camera not determined, requesting from macOS...');
          const granted = await requestCameraPermission();
          log(`[Permission] macOS camera request result: ${granted ? 'granted' : 'denied'}`);
          callback(granted);
          return;
        }
      }

      // Allow audio-only requests
      if (mediaTypes.includes('audio') && !mediaTypes.includes('video')) {
        callback(true);
        return;
      }

      // Default: allow media requests from trusted origins
      callback(true);
      return;
    }

    // Allow other permissions from our app
    callback(true);
  });

  log('[Permission] Session permission handlers configured');
}

// Register custom protocol for serving static files
function registerAppProtocol() {
  protocol.handle("app", (request) => {
    // Convert app://./path to file path
    let urlPath = request.url.replace("app://./", "");

    // Remove leading slash if present
    if (urlPath.startsWith("/")) {
      urlPath = urlPath.slice(1);
    }

    // Handle root path
    if (urlPath === "" || urlPath === "/") {
      urlPath = "index.html";
    }

    // Remove query strings and hashes
    const withoutQuery = urlPath.split("?")[0];
    const withoutHash = withoutQuery ? withoutQuery.split("#")[0] : "";
    urlPath = withoutHash ?? urlPath;

    // Handle directory paths - append index.html
    // This handles paths like "calibration/", "account/", etc.
    if (urlPath.endsWith("/") || (!urlPath.includes(".") && !urlPath.endsWith("/"))) {
      const testPath = urlPath.endsWith("/") ? urlPath : `${urlPath}/`;
      urlPath = `${testPath}index.html`;
    }

    // Build the file path relative to the out directory
    const filePath = path.resolve(__dirname, "../../out", urlPath);

    // Security: Prevent path traversal attacks
    if (!filePath.startsWith(outDir)) {
      error(`[Security] Path traversal attempt blocked: ${urlPath}`);
      return new Response("Forbidden", { status: 403 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

// Get the tray icon configuration based on platform and environment
function getTrayConfig() {
  return platform.getTrayConfig(isDev, process.resourcesPath, __dirname);
}

// Update the tray context menu based on current state
function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: isTrackingEnabled ? 'Stop Tracking' : 'Start Tracking',
      click: () => {
        toggleTracking();
      }
    },
    { type: 'separator' },
    {
      label: 'Show EyeRhythm',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
        // Show dock icon when window is shown (platform-specific)
        platform.showDock();
      }
    },
    { type: 'separator' },
    {
      label: 'Launch at Login',
      type: 'checkbox',
      checked: launchAtLoginEnabled,
      click: (menuItem) => {
        setLaunchAtLogin(menuItem.checked);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit EyeRhythm',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // Update tooltip to show current status
  const status = isTrackingEnabled ? 'Tracking Active' : 'Tracking Paused';
  tray.setToolTip(`EyeRhythm - ${status}`);
}

// Toggle tracking state and notify renderer
function toggleTracking() {
  isTrackingEnabled = !isTrackingEnabled;
  updateTrayMenu();

  // Track analytics event
  trackEvent(isTrackingEnabled ? AnalyticsEvents.TRACKING_STARTED : AnalyticsEvents.TRACKING_STOPPED);

  // Notify renderer process to toggle tracking
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('toggle-tracking', isTrackingEnabled);
  }
}

// Set launch at login preference
function setLaunchAtLogin(enabled: boolean) {
  launchAtLoginEnabled = enabled;

  // Track analytics event
  trackEvent(enabled ? AnalyticsEvents.LAUNCH_AT_LOGIN_ENABLED : AnalyticsEvents.LAUNCH_AT_LOGIN_DISABLED);

  if (platform.supportsLoginItems) {
    // Note: openAsHidden is deprecated on macOS 13+ (Ventura/Sonoma)
    // The app will launch normally, but our window close handler will keep it in tray
    // For true hidden launch on macOS 13+, consider using LSUIElement in Info.plist
    app.setLoginItemSettings({
      openAtLogin: enabled,
    });
  }

  updateTrayMenu();
}

// Initialize launch at login state from system settings
function initLaunchAtLoginState() {
  if (platform.supportsLoginItems) {
    const settings = app.getLoginItemSettings();
    launchAtLoginEnabled = settings.openAtLogin;
  }
}

function createTray() {
  // Destroy existing tray if present (prevents duplicate icons on hot reload)
  if (tray) {
    tray.destroy();
    tray = null;
  }

  // Get platform-specific tray configuration
  const trayConfig = getTrayConfig();
  let icon: Electron.NativeImage;

  try {
    icon = nativeImage.createFromPath(trayConfig.iconPath);
    // Apply platform-specific icon configuration
    icon = platform.configureTrayIcon(icon);

    if (icon.isEmpty()) {
      warn('[Tray] Icon loaded but is empty, check icon path:', trayConfig.iconPath);
    }
  } catch (err) {
    error('[Tray] Failed to load tray icon, using empty icon:', err);
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);

  // Initialize menu
  updateTrayMenu();

  // Single click to show menu (default behavior)
  // Double-click to show window
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
    // Show dock icon when window is shown (platform-specific)
    platform.showDock();
  });
}

function createWindow() {
  // Get platform-specific window configuration
  const windowConfig = platform.getWindowConfig();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true, // Security: Enable sandbox (MediaPipe works fine with it)
      backgroundThrottling: false, // Prevent throttling when window is hidden
    },
    // Platform-specific title bar configuration
    titleBarStyle: windowConfig.titleBarStyle,
    frame: windowConfig.frame,
    trafficLightPosition: windowConfig.trafficLightPosition,
    show: false, // Don't show until ready
    backgroundColor: "#111113", // Match app background
  });

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Load the app
  if (isDev) {
    // In development, load from Next.js dev server
    mainWindow.loadURL("http://localhost:3000");
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load via custom protocol for proper path resolution
    mainWindow.loadURL("app://./index.html");
  }

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Handle navigation within the app for static export
  mainWindow.webContents.on("will-navigate", (event, url) => {
    // Allow navigation to local files, dev server, and app protocol
    if (
      url.startsWith("file://") ||
      url.startsWith("http://localhost:3000") ||
      url.startsWith("app://")
    ) {
      return;
    }

    // In production, intercept absolute path navigations and convert to app:// URLs
    // Next.js Link components use absolute paths like /calibration/, /account/
    if (!isDev && (url.startsWith("app://./") || !url.startsWith("http"))) {
      event.preventDefault();
      // Extract path from the URL - handle both absolute and relative paths
      let navPath = url;
      try {
        const parsedUrl = new URL(url);
        navPath = parsedUrl.pathname;
      } catch {
        // URL might be a relative path, use as-is
        if (url.startsWith("/")) {
          navPath = url;
        }
      }

      // Ensure path ends with /index.html for directories
      if (!navPath.endsWith(".html")) {
        navPath = navPath.endsWith("/") ? `${navPath}index.html` : `${navPath}/index.html`;
      }

      // Navigate using the app protocol
      mainWindow?.loadURL(`app://.${navPath}`);
      return;
    }

    // Open external URLs in default browser
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // On platforms that support it, hide window to tray instead of closing (unless quitting the app)
  // This allows the app to continue running in the background
  let isQuitting = false;

  app.on('before-quit', () => {
    isQuitting = true;
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting && platform.hideToTrayOnClose) {
      event.preventDefault();
      mainWindow?.hide();
      // Hide dock icon when window is hidden (platform-specific)
      platform.hideDock();
    }
  });
}

// CRITICAL: Prevent background throttling - these flags must be set BEFORE app.ready
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// CalculateNativeWinOcclusion is Windows-only and does nothing on macOS/Linux
if (isWindows()) {
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
}

// Disable hardware acceleration issues on some systems
app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer");

// Request camera/microphone permissions
app.commandLine.appendSwitch("enable-media-stream");

// Register app:// protocol as a standard scheme with privileges
// MUST be called before app is ready - required for localStorage and web APIs
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: false,
    },
  },
]);

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Track app started (analytics already initialized on module import)
  trackEvent(AnalyticsEvents.APP_STARTED);

  // Register custom protocol before creating window
  registerAppProtocol();

  // Request camera permission (triggers system permission dialog if needed on macOS)
  // This must be done before the renderer tries to access the camera
  if (platform.supportsNativeCameraPermission) {
    const cameraGranted = await requestCameraPermission();
    if (!cameraGranted) {
      warn('[App] Camera permission not granted. Eye tracking will not work.');
    }
  }

  // Set up session permission handlers for camera/media access
  // This ensures Electron properly mediates between renderer getUserMedia() calls
  // and macOS system permissions, preventing repeated permission prompts
  setupSessionPermissionHandlers();

  // Initialize launch at login state from system settings
  initLaunchAtLoginState();

  // Create system tray for background operation
  createTray();

  // Prevent system from throttling timers (allows tracking when hidden/minimized)
  powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
  log('[PowerSave] Timer throttling prevention enabled:', powerSaveBlockerId);

  createWindow();

  /**
   * Content Security Policy (CSP) Configuration
   *
   * CURRENT IMPLEMENTATION:
   * This CSP configuration uses 'unsafe-inline' for both scripts and styles to support
   * the current Next.js static export with React 19 and Radix UI components.
   *
   * WHY 'unsafe-inline' IS CURRENTLY NEEDED:
   *
   * 1. Script Inline (script-src):
   *    - Next.js static exports include inline <script> tags for hydration and routing
   *    - React 19 uses inline event handlers and state management code
   *    - Removing this would break Next.js client-side functionality
   *
   * 2. Style Inline (style-src):
   *    - Radix UI components inject inline styles for positioning (popovers, tooltips, etc.)
   *    - CSS-in-JS solutions used by UI libraries require inline style attributes
   *    - Theme switching dynamically injects CSS custom properties
   *
   * PRODUCTION HARDENING ROADMAP:
   *
   * Before removing 'unsafe-inline' for production, evaluate:
   *
   * 1. Next.js Build Output Analysis:
   *    - Inspect the /out directory after `npm run build`
   *    - Identify all inline scripts and their purposes
   *    - Consider using nonce-based CSP if Next.js supports it in static exports
   *
   * 2. Style Extraction Options:
   *    - Audit Radix UI inline style usage (check for data-radix-popper-content-wrapper, etc.)
   *    - Evaluate if CSS modules can replace all inline styles
   *    - Consider build-time CSS extraction tools
   *
   * 3. Alternative Approaches:
   *    - Use hash-based CSP (calculate hashes of legitimate inline scripts/styles)
   *    - Migrate to a nonce-based approach if bundler supports it
   *    - Consider Electron's Content Security Policy alternatives (e.g., webRequest filtering)
   *
   * 4. Testing Strategy:
   *    - Test with stricter CSP in development mode first
   *    - Verify MediaPipe, camera access, and theme switching still work
   *    - Run full E2E test suite with hardened CSP
   *
   * RELATED ISSUE:
   * TODO: Create a GitHub issue to track CSP hardening evaluation and implementation
   *
   * SECURITY NOTE:
   * While 'unsafe-inline' reduces CSP protection, the risk is mitigated by:
   * - Electron's sandbox mode is enabled (line 60)
   * - contextIsolation prevents renderer access to Node.js (line 58)
   * - Custom app:// protocol restricts file access to /out directory
   * - No eval() or Function() constructors are used in the codebase
   */
  // Add Content Security Policy headers for security
  if (mainWindow) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self' app:",
            "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' app: blob:", // blob: needed for Sentry worker
            "style-src 'self' 'unsafe-inline' app:", // unsafe-inline needed for Radix UI themes
            "img-src 'self' data: app:",
            "font-src 'self' app:",
            "connect-src 'self' https://*.ingest.de.sentry.io", // Sentry error reporting
            "worker-src 'self' app: blob:", // Frame capture worker + Sentry web worker
            "media-src 'self' mediastream:", // Camera access
          ].join("; "),
        },
      });
    });
  }

  // Setup auto-updater (only in production)
  if (!isDev && mainWindow) {
    setupAutoUpdater(mainWindow);
  }

  // Handle system suspend/resume to prevent state desync
  // When system sleeps, camera stream is destroyed by OS but main process state persists
  powerMonitor.on('suspend', () => {
    log('[PowerMonitor] System suspending');
    if (isTrackingEnabled) {
      // Reset tracking state - camera will be dead after resume
      isTrackingEnabled = false;
      updateTrayMenu();
      // Notify renderer to stop tracking gracefully
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('system-suspend');
      }
      log('[PowerMonitor] Tracking stopped due to system suspend');
    }
  });

  powerMonitor.on('resume', () => {
    log('[PowerMonitor] System resumed');
    // Notify renderer that system has resumed (for any cleanup/reconciliation)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('system-resume');
    }
  });

  // On macOS, re-create window when dock icon is clicked or app is activated via Spotlight
  // The hasVisibleWindows parameter indicates if any windows are currently visible
  app.on("activate", (_event, hasVisibleWindows) => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (!hasVisibleWindows && mainWindow) {
      // Window exists but is hidden (e.g., user closed to tray) - show it
      mainWindow.show();
      mainWindow.focus();
      platform.showDock();
    }
  });
});

// Quit when all windows are closed (except on platforms that hide to tray)
app.on("window-all-closed", () => {
  if (!platform.hideToTrayOnClose) {
    app.quit();
  }
});

// Centralized cleanup function to ensure tray is destroyed
function cleanupBeforeExit() {
  if (tray) {
    tray.destroy();
    tray = null;
  }

  if (powerSaveBlockerId !== null) {
    powerSaveBlocker.stop(powerSaveBlockerId);
    powerSaveBlockerId = null;
    log('[PowerSave] Timer throttling prevention disabled');
  }
}

// Cleanup on quit
app.on('before-quit', () => {
  trackEvent(AnalyticsEvents.APP_QUIT);
  cleanupBeforeExit();
});

// Additional cleanup handlers for edge cases
app.on('will-quit', () => {
  cleanupBeforeExit();
});

app.on('quit', () => {
  cleanupBeforeExit();
});

// Handle process signals for force-quit scenarios
process.on('SIGTERM', () => {
  log('[Process] Received SIGTERM, cleaning up...');
  cleanupBeforeExit();
  app.quit();
});

process.on('SIGINT', () => {
  log('[Process] Received SIGINT, cleaning up...');
  cleanupBeforeExit();
  app.quit();
});

// Handle uncaught exceptions - attempt cleanup before crash
process.on('uncaughtException', (err) => {
  error('[Process] Uncaught exception:', err);
  cleanupBeforeExit();
  process.exit(1);
});

// IPC Handlers

// Get app version
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

// Get platform info
ipcMain.handle("get-platform", () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.getSystemVersion(),
  };
});

// Check if running in Electron
ipcMain.handle("is-electron", () => {
  return true;
});

// Window control handlers (for custom title bar)
ipcMain.on("minimize-window", () => {
  mainWindow?.minimize();
});

ipcMain.on("maximize-window", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on("close-window", () => {
  mainWindow?.close();
});

// Tracking state synchronization handlers

// Renderer reports its tracking state to main process (to sync tray menu)
ipcMain.on("tracking-state-changed", (_event, enabled: boolean) => {
  isTrackingEnabled = enabled;
  updateTrayMenu();
  // Track analytics event when tracking is toggled from renderer (navbar)
  trackEvent(enabled ? AnalyticsEvents.TRACKING_STARTED : AnalyticsEvents.TRACKING_STOPPED);
});

// Renderer requests current tracking state (e.g., on startup)
ipcMain.handle("get-tracking-state", () => {
  return isTrackingEnabled;
});

// Renderer requests to toggle tracking (alternative to tray menu)
ipcMain.handle("toggle-tracking-from-renderer", () => {
  toggleTracking();
  return isTrackingEnabled;
});

// Get launch at login state
ipcMain.handle("get-launch-at-login", () => {
  return launchAtLoginEnabled;
});

// Set launch at login state
ipcMain.handle("set-launch-at-login", (_event, enabled: boolean) => {
  setLaunchAtLogin(enabled);
  return launchAtLoginEnabled;
});

// Notification helper functions

function isWithinQuietHours(): boolean {
  if (!notificationSettings.quietHoursEnabled) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const { quietHoursStart, quietHoursEnd } = notificationSettings;

  // Edge case: if start equals end, quiet hours are disabled (no range)
  if (quietHoursStart === quietHoursEnd) {
    return false;
  }

  // Handle overnight quiet hours (e.g., 11 PM to 7 AM)
  if (quietHoursStart > quietHoursEnd) {
    // Quiet hours span midnight
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd;
  } else {
    // Quiet hours within same day
    return currentHour >= quietHoursStart && currentHour < quietHoursEnd;
  }
}

function canSendNotification(): boolean {
  if (!notificationSettings.enabled) {
    return false;
  }

  if (isWithinQuietHours()) {
    return false;
  }

  // Check cooldown
  const now = Date.now();
  if (now - lastFatigueAlertTime < FATIGUE_ALERT_COOLDOWN_MS) {
    return false;
  }

  return true;
}

function sendFatigueNotification(blinkRate: number): boolean {
  if (!canSendNotification()) {
    return false;
  }

  if (!Notification.isSupported()) {
    warn('[Notification] Notifications not supported on this system');
    return false;
  }

  const notification = new Notification({
    title: 'Eye Fatigue Alert',
    body: `Your blink rate has dropped to ${blinkRate.toFixed(1)} blinks/min. Consider taking a break.`,
    silent: !notificationSettings.soundEnabled,
    icon: platform.getNotificationIconPath(isDev, process.resourcesPath, __dirname),
  });

  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      platform.showDock();
    }
  });

  notification.show();
  lastFatigueAlertTime = Date.now();

  trackEvent(AnalyticsEvents.FATIGUE_ALERT_SENT);

  return true;
}

// Notification IPC handlers

ipcMain.handle("get-notification-settings", () => {
  return notificationSettings;
});

ipcMain.handle("set-notification-settings", (_event, settings: Partial<NotificationSettings>) => {
  notificationSettings = {
    ...notificationSettings,
    ...settings,
  };
  return notificationSettings;
});

ipcMain.handle("send-fatigue-alert", (_event, blinkRate: number) => {
  return sendFatigueNotification(blinkRate);
});

ipcMain.handle("test-notification", () => {
  if (!Notification.isSupported()) {
    return { success: false, reason: 'not-supported' };
  }

  const notification = new Notification({
    title: 'EyeRhythm Test Notification',
    body: 'Notifications are working correctly!',
    silent: !notificationSettings.soundEnabled,
    icon: platform.getNotificationIconPath(isDev, process.resourcesPath, __dirname),
  });

  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      platform.showDock();
    }
  });

  notification.show();

  return { success: true };
});

ipcMain.handle("get-notification-state", () => {
  // Note: There's no reliable way to check notification permission on macOS
  // without using native modules that don't support it. We return 'unknown'
  // and let users test notifications to verify they work.
  const permissionStatus: 'not-determined' | 'denied' | 'authorized' | 'unknown' =
    !isDarwin() && Notification.isSupported() ? 'authorized' : 'unknown';

  return {
    isSupported: Notification.isSupported(),
    canSend: canSendNotification(),
    isWithinQuietHours: isWithinQuietHours(),
    cooldownRemaining: Math.max(0, FATIGUE_ALERT_COOLDOWN_MS - (Date.now() - lastFatigueAlertTime)),
    permissionStatus,
  };
});

ipcMain.handle("open-notification-settings", async () => {
  try {
    const settingsUrls = platform.getSettingsUrls();
    if (settingsUrls.notifications) {
      await shell.openExternal(settingsUrls.notifications);
      return true;
    }
    // Platform doesn't have a standard notifications settings URL
    return false;
  } catch (err) {
    error('[Settings] Failed to open notification settings:', err);
    return false;
  }
});

// Camera permission IPC handlers

ipcMain.handle("get-camera-permission-status", () => {
  return getCameraPermissionStatus();
});

ipcMain.handle("request-camera-permission", async () => {
  return await requestCameraPermission();
});

ipcMain.handle("open-camera-settings", async () => {
  try {
    const settingsUrls = platform.getSettingsUrls();
    if (settingsUrls.camera) {
      await shell.openExternal(settingsUrls.camera);
      return true;
    }
    // Platform doesn't have a standard camera settings URL
    return false;
  } catch (err) {
    error('[Settings] Failed to open camera settings:', err);
    return false;
  }
});
