import { app, BrowserWindow, ipcMain, shell, protocol, net, Tray, Menu, nativeImage, powerSaveBlocker } from "electron";
import path from "path";
import { pathToFileURL } from "url";
import { setupAutoUpdater } from "./updater";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let powerSaveId: number | null = null;
let isTrackingEnabled = true;

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
      backgroundThrottling: false, // Prevent throttling when minimized for continuous blink tracking
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
}

// Disable hardware acceleration issues on some systems
app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer");

// Request camera/microphone permissions
app.commandLine.appendSwitch("enable-media-stream");

// Prevent renderer process throttling when window is minimized/hidden
// This is critical for continuous blink tracking in the background
app.commandLine.appendSwitch("disable-renderer-backgrounding");

/**
 * Creates the system tray (menu bar) icon with controls for blink tracking
 */
function createTray() {
  // Use the app icon for the tray
  // TODO: Create a proper template image (black and clear) for better dark mode support
  // Template images should be 22x22px (44x44px for @2x retina)
  const iconPath = isDev
    ? path.join(__dirname, "../public/icon-48x48.png")
    : path.join(__dirname, "../build/icons/icon.png");

  try {
    const icon = nativeImage.createFromPath(iconPath);
    // Resize to appropriate menu bar size (22x22 on macOS)
    const resizedIcon = icon.resize({ width: 22, height: 22 });
    tray = new Tray(resizedIcon);

    updateTrayMenu();
    tray.setToolTip("BlinkTrack - Eye Movement Tracking");

    // Show window on tray icon click
    tray.on("click", () => {
      mainWindow?.show();
    });
  } catch (error) {
    console.error("Failed to create tray icon:", error);
    // Continue without tray if icon creation fails
  }
}

/**
 * Updates the tray context menu with current tracking state
 */
function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "BlinkTrack",
      type: "normal",
      enabled: false, // Title item, not clickable
    },
    { type: "separator" },
    {
      label: "Enable Tracking",
      type: "checkbox",
      checked: isTrackingEnabled,
      click: () => {
        isTrackingEnabled = !isTrackingEnabled;
        // Notify renderer process
        mainWindow?.webContents.send("toggle-tracking", isTrackingEnabled);
        updateTrayMenu();

        // Manage power save blocker based on tracking state
        if (isTrackingEnabled && powerSaveId === null) {
          powerSaveId = powerSaveBlocker.start("prevent-display-sleep");
          console.log("[PowerSaveBlocker] Started (prevent-display-sleep)");
        } else if (!isTrackingEnabled && powerSaveId !== null) {
          powerSaveBlocker.stop(powerSaveId);
          console.log("[PowerSaveBlocker] Stopped");
          powerSaveId = null;
        }
      },
    },
    { type: "separator" },
    {
      label: "Show Window",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: "Hide Window",
      click: () => {
        mainWindow?.hide();
      },
    },
    { type: "separator" },
    {
      label: "Quit BlinkTrack",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

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
  // Register custom protocol before creating window
  registerAppProtocol();

  createWindow();

  // Create system tray for menu bar controls
  createTray();

  // Start power save blocker to prevent display sleep during tracking
  // This ensures the camera and video processing continue when minimized
  powerSaveId = powerSaveBlocker.start("prevent-display-sleep");
  console.log("[PowerSaveBlocker] Started on app launch:", {
    id: powerSaveId,
    isStarted: powerSaveBlocker.isStarted(powerSaveId),
    type: "prevent-display-sleep",
  });

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
            "worker-src 'self' blob:", // Sentry web worker
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

// Get tracking enabled state
ipcMain.handle("get-tracking-enabled", () => {
  return isTrackingEnabled;
});

// Set tracking enabled state
ipcMain.handle("set-tracking-enabled", (_event, enabled: boolean) => {
  isTrackingEnabled = enabled;
  updateTrayMenu();

  // Manage power save blocker
  if (enabled && powerSaveId === null) {
    powerSaveId = powerSaveBlocker.start("prevent-display-sleep");
    console.log("[PowerSaveBlocker] Started via IPC");
  } else if (!enabled && powerSaveId !== null) {
    powerSaveBlocker.stop(powerSaveId);
    console.log("[PowerSaveBlocker] Stopped via IPC");
    powerSaveId = null;
  }

  return isTrackingEnabled;
});

// Cleanup power save blocker on quit
app.on("before-quit", () => {
  if (powerSaveId !== null) {
    powerSaveBlocker.stop(powerSaveId);
    console.log("[PowerSaveBlocker] Stopped on app quit");
    powerSaveId = null;
  }
});
