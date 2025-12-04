/**
 * Aptabase Analytics Module
 *
 * Privacy-first analytics for EyeRhythm.
 * - No personal data collected
 * - No cookies or persistent identifiers
 * - Aggregated counts only
 *
 * IMPORTANT: This module must be imported BEFORE app.whenReady() is called.
 * The Aptabase SDK requires synchronous initialization before the app is ready.
 */

import {
  initialize,
  trackEvent as aptabaseTrackEvent,
} from "@aptabase/electron/main";
import { log } from "./logger";

// Aptabase App Key - get yours at https://aptabase.com
const APTABASE_APP_KEY = "A-EU-1500337563";

// Initialize Aptabase synchronously at module load time (BEFORE app.whenReady)
// This is required by the Aptabase SDK
if (APTABASE_APP_KEY) {
  initialize(APTABASE_APP_KEY);
  log("[Analytics] Aptabase initialized");
} else {
  log("[Analytics] Aptabase not configured - analytics disabled");
}

/**
 * Track an event with optional properties.
 * Events are only sent if Aptabase is properly configured.
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean>
): void {
  if (!APTABASE_APP_KEY) {
    return;
  }

  try {
    if (properties) {
      aptabaseTrackEvent(eventName, properties);
    } else {
      aptabaseTrackEvent(eventName);
    }
    log(`[Analytics] Event tracked: ${eventName}`);
  } catch {
    // Silently fail - analytics should never crash the app
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
