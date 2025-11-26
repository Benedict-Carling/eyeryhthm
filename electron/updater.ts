import { autoUpdater, UpdateInfo } from "electron-updater";
import { BrowserWindow, ipcMain } from "electron";
import log from "electron-log";

/**
 * Auto-updater configuration for public GitHub repository
 *
 * This app uses electron-updater to check for new releases from the public
 * GitHub repository. No authentication is required for public repositories.
 *
 * How it works:
 * - electron-builder publishes releases to GitHub with release assets
 * - electron-updater checks the GitHub Releases API for updates
 * - For public repos, the API allows unauthenticated access
 * - Rate limit: 60 requests/hour per IP (sufficient for update checks)
 *
 * Configuration in package.json:
 *   "publish": {
 *     "provider": "github",
 *     "owner": "Benedict-Carling",
 *     "repo": "eyeryhthm",
 *     "private": false
 *   }
 *
 * When releasing a new version:
 * 1. Update version in package.json
 * 2. Run: npm run electron:build
 * 3. Create GitHub release with generated assets from /release folder
 * 4. Users will automatically be notified of the update
 */

// Configure logging for auto-updater
log.transports.file.level = "info";
autoUpdater.logger = log;

// Disable auto-download - we'll let the user choose when to download
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

export interface UpdateStatus {
  status:
    | "checking"
    | "available"
    | "not-available"
    | "downloading"
    | "downloaded"
    | "error";
  info?: UpdateInfo;
  error?: string;
  progress?: {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
  };
}

let mainWindow: BrowserWindow | null = null;

function sendUpdateStatus(status: UpdateStatus) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", status);
  }
}

export function setupAutoUpdater(window: BrowserWindow) {
  mainWindow = window;

  // Public repository - no authentication required
  // GitHub API allows unauthenticated access to public releases
  log.info("Configured for public repository - no authentication required");

  // Auto-updater events
  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for updates...");
    sendUpdateStatus({ status: "checking" });
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    log.info("Update available:", info.version);
    sendUpdateStatus({ status: "available", info });
  });

  autoUpdater.on("update-not-available", (info: UpdateInfo) => {
    log.info("No updates available. Current version is up to date.");
    sendUpdateStatus({ status: "not-available", info });
  });

  autoUpdater.on("download-progress", (progress) => {
    log.info(`Download progress: ${progress.percent.toFixed(1)}%`);
    sendUpdateStatus({
      status: "downloading",
      progress: {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      },
    });
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    log.info("Update downloaded:", info.version);
    sendUpdateStatus({ status: "downloaded", info });
  });

  autoUpdater.on("error", (error: Error) => {
    log.error("Auto-updater error:", error.message);
    sendUpdateStatus({ status: "error", error: error.message });
  });

  // IPC handlers for update actions
  ipcMain.handle("check-for-updates", async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return result;
    } catch (error) {
      log.error("Failed to check for updates:", error);
      throw error;
    }
  });

  ipcMain.handle("download-update", async () => {
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      log.error("Failed to download update:", error);
      throw error;
    }
  });

  ipcMain.handle("install-update", () => {
    log.info("Installing update and restarting...");
    autoUpdater.quitAndInstall(false, true);
  });

  // Check for updates on startup (with a small delay to let the app fully load)
  setTimeout(() => {
    log.info("Performing initial update check...");
    autoUpdater.checkForUpdates().catch((error) => {
      log.error("Initial update check failed:", error);
    });
  }, 3000);
}
