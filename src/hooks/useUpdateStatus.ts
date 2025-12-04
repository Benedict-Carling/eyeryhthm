"use client";

import { useState, useEffect, useCallback } from "react";
import type { UpdateStatus } from "@/lib/electron";

function getIsElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI;
}

export function useUpdateStatus() {
  const [isElectron] = useState(getIsElectron);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onUpdateStatus) return;

    const cleanup = window.electronAPI.onUpdateStatus((status) => {
      setUpdateStatus(status);
    });

    return cleanup;
  }, [isElectron]);

  const checkForUpdates = useCallback(async () => {
    if (!window.electronAPI?.checkForUpdates) return;
    try {
      await window.electronAPI.checkForUpdates();
    } catch (error) {
      console.error("Failed to check for updates:", error);
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    if (!window.electronAPI?.downloadUpdate) return;
    try {
      await window.electronAPI.downloadUpdate();
    } catch (error) {
      console.error("Failed to download update:", error);
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!window.electronAPI?.installUpdate) return;
    try {
      await window.electronAPI.installUpdate();
    } catch (error) {
      console.error("Failed to install update:", error);
    }
  }, []);

  const hasUpdate = updateStatus?.status === "available" ||
                    updateStatus?.status === "downloading" ||
                    updateStatus?.status === "downloaded";

  return {
    isElectron,
    updateStatus,
    hasUpdate,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  };
}
