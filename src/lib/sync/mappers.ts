/**
 * Data Mappers
 *
 * Transform data between localStorage format and Supabase database format.
 * Handles UUID generation, type conversions, and schema differences.
 */

import { v5 as uuidv5, v4 as uuidv4 } from 'uuid';
import type { SessionData, BlinkEvent } from '../sessions/types';
import type { Calibration } from '../blink-detection/types';
import type {
  DBSession,
  DBCalibration,
  DBBlinkPattern,
  Platform,
  DeviceType,
} from './types';

// UUID namespace for deterministic ID generation
const NAMESPACE_OID = '6ba7b812-9dad-11d1-80b4-00c04fd430c8';

/**
 * Session Mapper
 *
 * Converts SessionData between localStorage and Supabase formats
 */
export class SessionMapper {
  /**
   * Convert localStorage session to database format
   * Note: total_blinks and average_blink_rate are computed from blink_patterns table
   */
  static toDatabase(local: SessionData, userId: string): DBSession {
    return {
      id: this.normalizeUUID(local.id),
      user_id: userId,
      calibration_id: local.calibrationId ? this.normalizeUUID(local.calibrationId) : null,
      start_timestamp: local.startTime.toISOString(),
      end_timestamp: local.endTime?.toISOString() || null,
      session_type: local.isActive ? 'active' : 'completed',
      quality_assessment: this.mapQuality(local.quality),
      device_type: this.detectDeviceType(),
      platform: this.detectPlatform(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      face_lost_periods: local.faceLostPeriods || [],
      created_at: local.startTime.toISOString(),
    };
  }

  /**
   * Convert database session to localStorage format
   * Note: totalBlinks computed from blinkEvents count, averageBlinkRate computed from duration
   */
  static fromDatabase(db: DBSession, blinkEvents: BlinkEvent[] = []): SessionData {
    const totalBlinks = blinkEvents.length;
    const durationSeconds = db.end_timestamp
      ? Math.floor(
          (new Date(db.end_timestamp).getTime() - new Date(db.start_timestamp).getTime()) / 1000
        )
      : undefined;
    const durationMinutes = durationSeconds ? durationSeconds / 60 : 0;
    const averageBlinkRate = durationMinutes > 0 ? totalBlinks / durationMinutes : 0;

    return {
      id: db.id,
      startTime: new Date(db.start_timestamp),
      endTime: db.end_timestamp ? new Date(db.end_timestamp) : undefined,
      isActive: db.session_type === 'active',
      averageBlinkRate,
      blinkEvents,
      quality: this.mapQualityFromDB(db.quality_assessment),
      fatigueAlertCount: 0, // Not stored in DB, would need separate table
      duration: durationSeconds,
      calibrationId: db.calibration_id || undefined,
      totalBlinks,
      faceLostPeriods: db.face_lost_periods,
    };
  }

  /**
   * Normalize localStorage IDs to UUIDs
   *
   * localStorage uses "session-{timestamp}" format
   * Database uses UUID format
   *
   * Strategy: Generate deterministic UUID v5 from localStorage ID
   */
  static normalizeUUID(id: string): string {
    // Already a UUID (has dashes and correct length)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }

    // Generate deterministic UUID from localStorage ID
    return uuidv5(id, NAMESPACE_OID);
  }

  /**
   * Map localStorage quality to database quality
   */
  private static mapQuality(
    quality: 'good' | 'fair' | 'poor'
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    // localStorage doesn't have "excellent", only "good"
    // Map directly for fair/poor, keep good as good
    return quality as 'good' | 'fair' | 'poor';
  }

  /**
   * Map database quality to localStorage quality
   */
  private static mapQualityFromDB(
    quality: 'excellent' | 'good' | 'fair' | 'poor' | null
  ): 'good' | 'fair' | 'poor' {
    if (!quality) return 'fair';
    // Map excellent → good for localStorage compatibility
    if (quality === 'excellent') return 'good';
    return quality as 'good' | 'fair' | 'poor';
  }

  /**
   * Detect current device type
   */
  static detectDeviceType(): DeviceType {
    if (typeof window === 'undefined') return 'web';

    // Check if Electron
    if ((window as any).electronAPI) {
      return 'desktop';
    }

    // Check if mobile
    const userAgent = navigator.userAgent.toLowerCase();
    if (/android|iphone|ipad|ipod|mobile/.test(userAgent)) {
      return 'mobile';
    }

    return 'web';
  }

  /**
   * Detect current platform
   */
  static detectPlatform(): Platform {
    if (typeof window === 'undefined') return 'web';

    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('win')) return 'windows';
    if (userAgent.includes('mac')) return 'macos';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('linux')) return 'linux';

    return 'web';
  }
}

/**
 * Calibration Mapper
 *
 * Converts Calibration between localStorage and Supabase formats
 */
export class CalibrationMapper {
  /**
   * Convert localStorage calibration to database format
   */
  static toDatabase(local: Calibration, userId: string): DBCalibration {
    return {
      id: this.normalizeUUID(local.id),
      user_id: userId,
      name: local.name,
      ear_threshold: local.earThreshold,
      is_active: local.isActive,
      is_default: local.isDefault || false,
      device_type: SessionMapper.detectDeviceType(),
      platform: SessionMapper.detectPlatform(),
      metadata: local.metadata as unknown as Record<string, unknown>,
      raw_data: local.rawData as unknown as Record<string, unknown>,
      created_at: local.createdAt.toISOString(),
      updated_at: local.updatedAt.toISOString(),
    };
  }

  /**
   * Convert database calibration to localStorage format
   */
  static fromDatabase(db: DBCalibration): Calibration {
    return {
      id: db.id,
      name: db.name,
      createdAt: new Date(db.created_at),
      updatedAt: new Date(db.updated_at),
      isActive: db.is_active,
      isDefault: db.is_default,
      earThreshold: Number(db.ear_threshold),
      metadata: db.metadata as unknown as any, // Cast to CalibrationMetadata
      rawData: db.raw_data as unknown as any, // Cast to CalibrationRawData
    };
  }

  /**
   * Normalize localStorage IDs to UUIDs
   *
   * localStorage uses "cal_{timestamp}_{random}" format
   * Database uses UUID format
   */
  static normalizeUUID(id: string): string {
    // Already a UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }

    // Generate deterministic UUID from localStorage ID
    return uuidv5(id, NAMESPACE_OID);
  }
}

/**
 * Blink Event Mapper
 *
 * Converts BlinkEvent between localStorage and Supabase formats
 */
export class BlinkEventMapper {
  /**
   * Convert localStorage blink events to database format (batch operation)
   */
  static batchToDatabase(
    events: BlinkEvent[],
    sessionId: string,
    userId: string
  ): DBBlinkPattern[] {
    return events.map((event) => ({
      id: uuidv4(), // Generate new UUID for each blink
      user_id: userId,
      screen_session_id: sessionId,
      timestamp: new Date(event.timestamp).toISOString(),
      created_at: new Date().toISOString(),
    }));
  }

  /**
   * Convert database blink patterns to localStorage format
   */
  static batchFromDatabase(patterns: DBBlinkPattern[]): BlinkEvent[] {
    return patterns.map((pattern) => ({
      timestamp: new Date(pattern.timestamp).getTime(),
    }));
  }
}
