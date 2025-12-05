"use client";

import { useState, useEffect, useCallback } from "react";
import type { CameraPermissionStatus } from "@/lib/electron";

export function useCameraPermission() {
  const [isElectron, setIsElectron] = useState(false);
  const [isMacOS, setIsMacOS] = useState(false);
  const [status, setStatus] = useState<CameraPermissionStatus>("unknown");
  const [isLoading, setIsLoading] = useState(true);

  // Check if running in Electron on macOS
  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI) {
      setIsElectron(true);
      // Check platform
      if (window.electronAPI.platform === "darwin") {
        setIsMacOS(true);
      } else {
        // Non-macOS platforms don't need this UI
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  // Load camera permission status
  const refreshStatus = useCallback(async () => {
    if (!window.electronAPI?.getCameraPermissionStatus) {
      setIsLoading(false);
      return;
    }

    try {
      const currentStatus = await window.electronAPI.getCameraPermissionStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error("Failed to get camera permission status:", error);
      setStatus("unknown");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load status on mount
  useEffect(() => {
    if (isElectron && isMacOS) {
      refreshStatus();
    }
  }, [isElectron, isMacOS, refreshStatus]);

  // Request camera permission
  const requestPermission = async (): Promise<boolean> => {
    if (!window.electronAPI?.requestCameraPermission) {
      return false;
    }

    try {
      const granted = await window.electronAPI.requestCameraPermission();
      // Refresh status after requesting
      await refreshStatus();
      return granted;
    } catch (error) {
      console.error("Failed to request camera permission:", error);
      return false;
    }
  };

  // Open system camera settings
  const openCameraSettings = async (): Promise<boolean> => {
    if (!window.electronAPI?.openCameraSettings) {
      return false;
    }

    try {
      return await window.electronAPI.openCameraSettings();
    } catch (error) {
      console.error("Failed to open camera settings:", error);
      return false;
    }
  };

  // Determine if permission needs attention
  const needsAttention = isMacOS && (status === "denied" || status === "restricted");
  const isGranted = status === "granted";
  const isNotDetermined = status === "not-determined";

  return {
    isElectron,
    isMacOS,
    isLoading,
    status,
    needsAttention,
    isGranted,
    isNotDetermined,
    refreshStatus,
    requestPermission,
    openCameraSettings,
  };
}
