import { app, BrowserWindow, ipcMain, shell, protocol, net } from "electron";
import path from "path";
import { pathToFileURL } from "url";
import { setupAutoUpdater } from "./updater";

let mainWindow: BrowserWindow | null = null;

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
    urlPath = urlPath.split("?")[0].split("#")[0];

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

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Register app:// protocol as a standard scheme with privileges
  // MUST be called before creating window - required for localStorage and web APIs
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

  // Register custom protocol before creating window
  registerAppProtocol();

  createWindow();

  // Add Content Security Policy headers for security
  if (mainWindow) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self' app:",
            "script-src 'self' 'unsafe-inline' app:", // unsafe-inline needed for Next.js React
            "style-src 'self' 'unsafe-inline' app:", // unsafe-inline needed for Radix UI themes
            "img-src 'self' data: app:",
            "font-src 'self' app:",
            "connect-src 'self' https://cdn.jsdelivr.net https://storage.googleapis.com", // MediaPipe CDN
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
