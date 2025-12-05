"use client";

import { useState, useEffect, useCallback } from "react";
import type { CameraPermissionStatus } from "@/lib/electron";
import { usePlatform } from "./usePlatform";

export function useCameraPermission() {
  const { isElectron, capabilities, isLoading: isPlatformLoading } = usePlatform();
  const [status, setStatus] = useState<CameraPermissionStatus>("unknown");
  const [isLoading, setIsLoading] = useState(true);

  // Platform supports native camera permission if it has this capability
  const supportsNativePermission = capabilities.supportsNativeCameraPermission;

  // Update loading state when platform is loaded
  useEffect(() => {
    if (!isPlatformLoading && !supportsNativePermission) {
      // Platforms without native permission don't need this UI
      setIsLoading(false);
    }
  }, [isPlatformLoading, supportsNativePermission]);

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
    if (isElectron && supportsNativePermission && !isPlatformLoading) {
      refreshStatus();
    }
  }, [isElectron, supportsNativePermission, isPlatformLoading, refreshStatus]);

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

  // Determine if permission needs attention (only on platforms with native permission)
  const needsAttention = supportsNativePermission && (status === "denied" || status === "restricted");
  const isGranted = status === "granted";
  const isNotDetermined = status === "not-determined";

  return {
    isElectron,
    /** @deprecated Use usePlatform().isDarwin instead */
    isMacOS: supportsNativePermission,
    /** Whether native camera permission is supported on this platform */
    supportsNativePermission,
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
