/**
 * Aptabase Analytics Module
 *
 * Privacy-first analytics for EyeRhythm.
 * - No personal data collected
 * - No cookies or persistent identifiers
 * - Aggregated counts only
 *
 * To enable analytics:
 * 1. Create an account at https://aptabase.com
 * 2. Create a new app and get your App Key
 * 3. Replace the placeholder below with your key
 */

import {
  initialize,
  trackEvent as aptabaseTrackEvent,
} from "@aptabase/electron/main";

// TODO: Replace with your Aptabase App Key from https://aptabase.com
// The key looks like: A-US-1234567890 or A-EU-1234567890
const APTABASE_APP_KEY = "A-EU-1500337563";

let isInitialized = false;

/**
 * Initialize Aptabase analytics.
 * Call this once when the app starts.
 */
export async function initAnalytics(): Promise<void> {
  if (!APTABASE_APP_KEY) {
    console.log("[Analytics] Aptabase not configured - analytics disabled");
    console.log("[Analytics] Get your App Key at https://aptabase.com");
    return;
  }

  try {
    await initialize(APTABASE_APP_KEY);
    isInitialized = true;
    console.log("[Analytics] Aptabase initialized");
  } catch (error) {
    console.error("[Analytics] Failed to initialize Aptabase:", error);
  }
}

/**
 * Track an event with optional properties.
 * Events are only sent if Aptabase is properly configured.
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean>
): void {
  if (!isInitialized) {
    return;
  }

  try {
    if (properties) {
      aptabaseTrackEvent(eventName, properties);
    } else {
      aptabaseTrackEvent(eventName);
    }
  } catch (error) {
    console.error(`[Analytics] Failed to track event "${eventName}":`, error);
  }
}

// Pre-defined events for consistency
export const AnalyticsEvents = {
  // App lifecycle
  APP_STARTED: "app_started",
  APP_QUIT: "app_quit",

  // Tracking
  TRACKING_STARTED: "tracking_started",
  TRACKING_STOPPED: "tracking_stopped",

  // Sessions
  SESSION_STARTED: "session_started",
  SESSION_ENDED: "session_ended",

  // Calibration
  CALIBRATION_STARTED: "calibration_started",
  CALIBRATION_COMPLETED: "calibration_completed",

  // Features
  LAUNCH_AT_LOGIN_ENABLED: "launch_at_login_enabled",
  LAUNCH_AT_LOGIN_DISABLED: "launch_at_login_disabled",

  // Updates
  UPDATE_AVAILABLE: "update_available",
  UPDATE_DOWNLOADED: "update_downloaded",
  UPDATE_INSTALLED: "update_installed",

  // Notifications
  FATIGUE_ALERT_SENT: "fatigue_alert_sent",
} as const;
