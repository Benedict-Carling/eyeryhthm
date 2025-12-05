/**
 * Shared notification types used by both renderer and main process.
 * This file is the single source of truth for notification-related types.
 */

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number; // Hour in 24h format (0-23)
  quietHoursEnd: number; // Hour in 24h format (0-23)
}

export interface NotificationState {
  isSupported: boolean;
  canSend: boolean;
  isWithinQuietHours: boolean;
  cooldownRemaining: number;
  permissionStatus: "not-determined" | "denied" | "authorized" | "unknown";
}

export interface TestNotificationResult {
  success: boolean;
  reason?: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  quietHoursEnabled: true,
  quietHoursStart: 23, // 11 PM - notifications disabled from 11 PM
  quietHoursEnd: 7, // 7 AM - notifications enabled again at 7 AM
};
