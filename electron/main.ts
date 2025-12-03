import { app, BrowserWindow, ipcMain, shell, protocol, net, Tray, Menu, nativeImage, powerSaveBlocker } from "electron";
import path from "path";
import { pathToFileURL } from "url";
import { setupAutoUpdater } from "./updater";
import { initAnalytics, trackEvent, AnalyticsEvents } from "./analytics";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let powerSaveBlockerId: number | null = null;

// Tracking state managed by main process (synced with renderer)
let isTrackingEnabled = false;
let launchAtLoginEnabled = false;

const isDev = process.env.NODE_ENV !== "production" && !app.isPackaged;
const outDir = path.resolve(__dirname, "../out");

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
    const filePath = path.resolve(__dirname, "../out", urlPath);

    // Security: Prevent path traversal attacks
    if (!filePath.startsWith(outDir)) {
      console.error(`[Security] Path traversal attempt blocked: ${urlPath}`);
      return new Response("Forbidden", { status: 403 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

// Get the tray icon path based on environment
function getTrayIconPath(): string {
  if (isDev) {
    // In development, use the build-resources directory
    return path.join(__dirname, '../build-resources/trayIconTemplate.png');
  } else {
    // In production, the icon is bundled with the app
    // On macOS, resources are in Contents/Resources
    if (process.platform === 'darwin') {
      return path.join(process.resourcesPath, 'trayIconTemplate.png');
    }
    return path.join(__dirname, '../build-resources/trayIconTemplate.png');
  }
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
      label: 'Show BlinkTrack',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
        // Show dock icon when window is shown (macOS)
        if (process.platform === 'darwin' && app.dock) {
          app.dock.show();
        }
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
      label: 'Quit BlinkTrack',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // Update tooltip to show current status
  const status = isTrackingEnabled ? 'Tracking Active' : 'Tracking Paused';
  tray.setToolTip(`BlinkTrack - ${status}`);
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

  if (process.platform === 'darwin' || process.platform === 'win32') {
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
  if (process.platform === 'darwin' || process.platform === 'win32') {
    const settings = app.getLoginItemSettings();
    launchAtLoginEnabled = settings.openAtLogin;
  }
}

function createTray() {
  // Load the template image for macOS (automatically handles dark/light mode)
  // Icon sizes follow Apple HIG: 18x18 (1x) and 36x36 (@2x for Retina)
  const iconPath = getTrayIconPath();
  let icon: Electron.NativeImage;

  try {
    icon = nativeImage.createFromPath(iconPath);
    // Mark as template image for macOS (enables automatic dark/light mode inversion)
    if (process.platform === 'darwin') {
      icon.setTemplateImage(true);
    }

    if (icon.isEmpty()) {
      console.warn('[Tray] Icon loaded but is empty, check icon path:', iconPath);
    }
  } catch (error) {
    console.error('[Tray] Failed to load tray icon, using empty icon:', error);
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
    // Show dock icon when window is shown (macOS)
    if (process.platform === 'darwin' && app.dock) {
      app.dock.show();
    }
  });
}

function createWindow() {
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
    titleBarStyle: "hiddenInset", // macOS native title bar
    trafficLightPosition: { x: 16, y: 12 },
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

  // On macOS, hide window to tray instead of closing (unless quitting the app)
  // This allows the app to continue running in the background
  let isQuitting = false;

  app.on('before-quit', () => {
    isQuitting = true;
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
      // Hide dock icon when window is hidden
      if (app.dock) {
        app.dock.hide();
      }
    }
  });
}

// CRITICAL: Prevent background throttling - these flags must be set BEFORE app.ready
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// CalculateNativeWinOcclusion is Windows-only and does nothing on macOS/Linux
if (process.platform === 'win32') {
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
app.whenReady().then(() => {
  // Initialize analytics (privacy-first, no personal data collected)
  initAnalytics();
  trackEvent(AnalyticsEvents.APP_STARTED);

  // Register custom protocol before creating window
  registerAppProtocol();

  // Initialize launch at login state from system settings
  initLaunchAtLoginState();

  // Create system tray for background operation
  createTray();

  // Prevent system from throttling timers (allows tracking when hidden/minimized)
  powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
  console.log('[PowerSave] Timer throttling prevention enabled:', powerSaveBlockerId);

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

  // On macOS, re-create window when dock icon is clicked
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Cleanup on quit
app.on('before-quit', () => {
  trackEvent(AnalyticsEvents.APP_QUIT);

  if (powerSaveBlockerId !== null) {
    powerSaveBlocker.stop(powerSaveBlockerId);
    console.log('[PowerSave] Timer throttling prevention disabled');
  }
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
