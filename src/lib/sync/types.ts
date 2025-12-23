/**
 * Sync Types
 *
 * Type definitions for the sync engine that coordinates
 * data synchronization between localStorage and Supabase.
 */

import type { SessionData, BlinkEvent } from '../sessions/types';
import type { Calibration } from '../blink-detection/types';

// ============================================================================
// Queue Types
// ============================================================================

export type SyncOperationType = 'create' | 'update' | 'delete';
export type SyncEntityType = 'session' | 'calibration' | 'blink_pattern' | 'user_settings';

/**
 * Queued sync operation for retry mechanism
 */
export interface QueuedOperation {
  id: string;                     // Unique operation ID
  type: SyncOperationType;
  entity: SyncEntityType;
  payload: unknown;               // Entity-specific data
  userId: string;                 // User who owns this data
  retryCount: number;             // Number of retry attempts
  maxRetries: number;             // Max attempts before dead-letter
  lastAttemptAt: number;          // Timestamp of last attempt (ms)
  createdAt: number;              // Timestamp when queued (ms)
  error?: string;                 // Last error message
}

/**
 * Result type for sync operations
 */
export type SyncResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// Database Types (Supabase Schema)
// ============================================================================

/**
 * Database format for screen_sessions table
 */
export interface DBSession {
  id: string;                          // UUID
  user_id: string;                     // UUID from auth
  calibration_id: string | null;       // UUID
  start_timestamp: string;             // ISO 8601 timestamp
  end_timestamp: string | null;        // ISO 8601 timestamp
  total_blinks: number;
  average_blink_rate: number | null;
  session_type: 'active' | 'completed' | 'interrupted';
  quality_assessment: 'excellent' | 'good' | 'fair' | 'poor' | null;
  device_type: 'web' | 'desktop' | 'mobile' | null;
  platform: 'windows' | 'macos' | 'ios' | 'android' | 'linux' | 'web' | null;
  timezone: string | null;
  face_lost_periods: Array<{ start: number; end?: number }>;
  created_at: string;                  // ISO 8601 timestamp
}

/**
 * Database format for calibrations table
 */
export interface DBCalibration {
  id: string;                          // UUID
  user_id: string;                     // UUID
  name: string;
  ear_threshold: number;               // NUMERIC type
  baseline_ear_open: number | null;
  baseline_ear_closed: number | null;
  is_active: boolean;
  is_default: boolean;
  device_type: 'web' | 'desktop' | 'mobile' | null;
  platform: 'windows' | 'macos' | 'ios' | 'android' | 'linux' | 'web' | null;
  metadata: Record<string, unknown>;   // JSONB
  raw_data: Record<string, unknown>;   // JSONB
  created_at: string;                  // ISO 8601 timestamp
  updated_at: string;                  // ISO 8601 timestamp
}

/**
 * Database format for blink_patterns table
 */
export interface DBBlinkPattern {
  id: string;                          // UUID (generated)
  user_id: string;                     // UUID
  screen_session_id: string;           // UUID
  timestamp: string;                   // ISO 8601 timestamp
  blink_duration_ms: number | null;
  ear_value: number | null;
  created_at: string;                  // ISO 8601 timestamp
}

/**
 * Database format for users table (settings only)
 */
export interface DBUserSettings {
  id: string;                          // UUID
  preferred_blink_threshold: number;
  preferred_blink_threshold_set_at: string;
  break_suggestion_enabled: boolean;
  break_suggestion_enabled_set_at: string;
}

// ============================================================================
// Sync Payload Types
// ============================================================================

/**
 * Payload for session sync operations
 */
export interface SessionSyncPayload {
  session: SessionData;
  userId: string;
}

/**
 * Payload for calibration sync operations
 */
export interface CalibrationSyncPayload {
  calibration: Calibration;
  userId: string;
}

/**
 * Payload for blink events sync operations
 */
export interface BlinkEventsSyncPayload {
  sessionId: string;
  events: BlinkEvent[];
  userId: string;
}

/**
 * Payload for user settings sync operations
 */
export interface UserSettingsSyncPayload {
  userId: string;
  settings: {
    fatigueThreshold?: number;
    notificationsEnabled?: boolean;
    soundEnabled?: boolean;
  };
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Platform detection result
 */
export type Platform = 'windows' | 'macos' | 'ios' | 'android' | 'linux' | 'web';

/**
 * Device type detection result
 */
export type DeviceType = 'web' | 'desktop' | 'mobile';

/**
 * Quality mapping from localStorage to DB format
 */
export type QualityMapping = {
  good: 'good';
  fair: 'fair';
  poor: 'poor';
};
