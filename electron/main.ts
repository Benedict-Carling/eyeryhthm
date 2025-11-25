import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== "production" && !app.isPackaged;

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
      sandbox: false, // Required for some media APIs
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
    // In production, load the static export
    mainWindow.loadFile(path.join(__dirname, "../out/index.html"));
  }

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Handle navigation within the app for static export
  mainWindow.webContents.on("will-navigate", (event, url) => {
    // Allow navigation to local files and dev server
    if (
      url.startsWith("file://") ||
      url.startsWith("http://localhost:3000")
    ) {
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
  createWindow();

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
