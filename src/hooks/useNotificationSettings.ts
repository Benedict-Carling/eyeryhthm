"use client";

import { useState, useEffect, useCallback } from "react";
import type { NotificationSettings, NotificationState, TestNotificationResult } from "@/lib/electron";

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  quietHoursEnabled: true,
  quietHoursStart: 23, // 11 PM
  quietHoursEnd: 7,    // 7 AM
};

export function useNotificationSettings() {
  const [isElectron, setIsElectron] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [notificationState, setNotificationState] = useState<NotificationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if running in Electron
  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI) {
      setIsElectron(true);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Load settings from Electron
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.getNotificationSettings) {
      return;
    }

    const loadSettings = async () => {
      try {
        const savedSettings = await window.electronAPI!.getNotificationSettings();
        setSettings(savedSettings);
      } catch (error) {
        console.error("Failed to load notification settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [isElectron]);

  // React Compiler auto-memoizes these handlers

  // Update a single setting
  const updateSetting = async <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    if (!window.electronAPI?.setNotificationSettings) return;

    try {
      const updatedSettings = await window.electronAPI.setNotificationSettings({
        [key]: value,
      });
      setSettings(updatedSettings);
    } catch (error) {
      console.error(`Failed to update notification setting ${key}:`, error);
    }
  };

  // Update multiple settings at once
  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!window.electronAPI?.setNotificationSettings) return;

    try {
      const updatedSettings = await window.electronAPI.setNotificationSettings(newSettings);
      setSettings(updatedSettings);
    } catch (error) {
      console.error("Failed to update notification settings:", error);
    }
  };

  // Send a test notification
  const testNotification = async (): Promise<TestNotificationResult> => {
    if (!window.electronAPI?.testNotification) {
      return { success: false, reason: "not-electron" };
    }

    try {
      return await window.electronAPI.testNotification();
    } catch (error) {
      console.error("Failed to send test notification:", error);
      return { success: false, reason: "error" };
    }
  };

  // Send a fatigue alert
  const sendFatigueAlert = async (blinkRate: number): Promise<boolean> => {
    if (!window.electronAPI?.sendFatigueAlert) {
      return false;
    }

    try {
      return await window.electronAPI.sendFatigueAlert(blinkRate);
    } catch (error) {
      console.error("Failed to send fatigue alert:", error);
      return false;
    }
  };

  // Get current notification state
  const refreshNotificationState = useCallback(async () => {
    if (!window.electronAPI?.getNotificationState) return;

    try {
      const state = await window.electronAPI.getNotificationState();
      setNotificationState(state);
    } catch (error) {
      console.error("Failed to get notification state:", error);
    }
  }, []);

  // Open system notification settings
  const openNotificationSettings = async () => {
    if (!window.electronAPI?.openNotificationSettings) return;

    try {
      await window.electronAPI.openNotificationSettings();
    } catch (error) {
      console.error("Failed to open notification settings:", error);
    }
  };

  // Helper to format hour as 12-hour time
  const formatHour = (hour: number): string => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  };

  // Load notification state on mount
  useEffect(() => {
    if (isElectron) {
      refreshNotificationState();
    }
  }, [isElectron, refreshNotificationState]);

  return {
    isElectron,
    isLoading,
    settings,
    notificationState,
    updateSetting,
    updateSettings,
    testNotification,
    sendFatigueAlert,
    refreshNotificationState,
    openNotificationSettings,
    formatHour,
  };
}
