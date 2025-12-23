/**
 * Supabase Sync Service
 *
 * Coordinates synchronization between localStorage and Supabase.
 * Handles dual-write operations, data merging, and conflict resolution.
 */

import { getSupabaseClient } from '../auth/supabase-client';
import { getSyncQueue, SyncQueue } from './sync-queue';
import { SessionMapper, CalibrationMapper, BlinkEventMapper } from './mappers';
import type { SessionData, BlinkEvent } from '../sessions/types';
import type { Calibration } from '../blink-detection/types';
import type { SyncResult, DBSession, DBCalibration, DBBlinkPattern } from './types';

/**
 * Supabase Sync Service
 *
 * Core service for syncing data between localStorage and Supabase
 */
export class SupabaseSyncService {
  private static _supabase: ReturnType<typeof getSupabaseClient> | null = null;
  private static _queue: SyncQueue | null = null;

  /**
   * Lazy-load Supabase client (only initialized when needed)
   */
  private static get supabase() {
    if (!this._supabase) {
      this._supabase = getSupabaseClient();
    }
    return this._supabase;
  }

  /**
   * Lazy-load sync queue (only initialized when needed)
   */
  private static get queue() {
    if (!this._queue) {
      this._queue = getSyncQueue();
    }
    return this._queue;
  }

  // ============================================================================
  // Session Sync Operations
  // ============================================================================

  /**
   * Sync a session to Supabase
   *
   * Session start: Creates record with is_active = true
   * Session end: Updates record with final data
   */
  static async syncSession(session: SessionData, userId: string): Promise<SyncResult> {
    try {
      const dbSession = SessionMapper.toDatabase(session, userId);

      const { error } = await this.supabase
        .from('screen_sessions')
        .upsert(dbSession, { onConflict: 'id' });

      if (error) {
        console.error('[SupabaseSyncService] Session sync failed:', error);
        await this.queue.enqueue({
          type: session.isActive ? 'create' : 'update',
          entity: 'session',
          payload: { session, userId },
          userId,
        });
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseSyncService] Session synced: ${session.id}`);
      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SupabaseSyncService] Session sync exception:', error);
      await this.queue.enqueue({
        type: session.isActive ? 'create' : 'update',
        entity: 'session',
        payload: { session, userId },
        userId,
      });
      return { success: false, error: message };
    }
  }

  /**
   * Sync blink events to Supabase (batch operation)
   *
   * Used for:
   * - Session end: Sync all blinks
   * - Active session: Batch sync every 5 mins
   */
  static async syncBlinkEvents(
    sessionId: string,
    events: BlinkEvent[],
    userId: string
  ): Promise<SyncResult> {
    if (events.length === 0) {
      return { success: true, data: undefined };
    }

    try {
      const normalizedSessionId = SessionMapper.normalizeUUID(sessionId);
      const dbBlinkPatterns = BlinkEventMapper.batchToDatabase(
        events,
        normalizedSessionId,
        userId
      );

      // Batch insert with on conflict do nothing (idempotent)
      const { error } = await this.supabase
        .from('blink_patterns')
        .upsert(dbBlinkPatterns, { onConflict: 'id', ignoreDuplicates: true });

      if (error) {
        console.error('[SupabaseSyncService] Blink events sync failed:', error);
        await this.queue.enqueue({
          type: 'create',
          entity: 'blink_pattern',
          payload: { sessionId, events, userId },
          userId,
        });
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseSyncService] ${events.length} blink events synced for session ${sessionId}`);
      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SupabaseSyncService] Blink events sync exception:', error);
      await this.queue.enqueue({
        type: 'create',
        entity: 'blink_pattern',
        payload: { sessionId, events, userId },
        userId,
      });
      return { success: false, error: message };
    }
  }

  /**
   * Delete a session from Supabase
   */
  static async deleteSession(sessionId: string, userId: string): Promise<SyncResult> {
    try {
      const normalizedId = SessionMapper.normalizeUUID(sessionId);

      const { error } = await this.supabase
        .from('screen_sessions')
        .delete()
        .eq('id', normalizedId)
        .eq('user_id', userId);

      if (error) {
        console.error('[SupabaseSyncService] Session delete failed:', error);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseSyncService] Session deleted: ${sessionId}`);
      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SupabaseSyncService] Session delete exception:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Load all sessions for a user from Supabase
   */
  static async loadSessions(userId: string): Promise<SessionData[]> {
    try {
      // Fetch sessions
      const { data: sessions, error: sessionsError } = await this.supabase
        .from('screen_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_timestamp', { ascending: false });

      if (sessionsError) {
        console.error('[SupabaseSyncService] Failed to load sessions:', sessionsError);
        return [];
      }

      if (!sessions || sessions.length === 0) {
        return [];
      }

      // Fetch blink patterns for all sessions
      const sessionIds = sessions.map((s) => s.id);
      const { data: blinkPatterns, error: blinksError } = await this.supabase
        .from('blink_patterns')
        .select('*')
        .in('screen_session_id', sessionIds)
        .order('timestamp', { ascending: true });

      if (blinksError) {
        console.warn('[SupabaseSyncService] Failed to load blink patterns:', blinksError);
      }

      // Group blink patterns by session
      const blinksBySession = new Map<string, BlinkEvent[]>();
      if (blinkPatterns) {
        blinkPatterns.forEach((pattern: DBBlinkPattern) => {
          const sessionId = pattern.screen_session_id;
          if (!blinksBySession.has(sessionId)) {
            blinksBySession.set(sessionId, []);
          }
          blinksBySession.get(sessionId)!.push({
            timestamp: new Date(pattern.timestamp).getTime(),
          });
        });
      }

      // Map sessions with their blink events
      const mappedSessions = sessions.map((dbSession: DBSession) => {
        const blinkEvents = blinksBySession.get(dbSession.id) || [];
        return SessionMapper.fromDatabase(dbSession, blinkEvents);
      });

      console.log(`[SupabaseSyncService] Loaded ${mappedSessions.length} sessions from Supabase`);
      return mappedSessions;
    } catch (error) {
      console.error('[SupabaseSyncService] Load sessions exception:', error);
      return [];
    }
  }

  // ============================================================================
  // Calibration Sync Operations
  // ============================================================================

  /**
   * Sync a calibration to Supabase
   */
  static async syncCalibration(calibration: Calibration, userId: string): Promise<SyncResult> {
    try {
      const dbCalibration = CalibrationMapper.toDatabase(calibration, userId);

      const { error } = await this.supabase
        .from('calibrations')
        .upsert(dbCalibration, { onConflict: 'id' });

      if (error) {
        console.error('[SupabaseSyncService] Calibration sync failed:', error);
        await this.queue.enqueue({
          type: 'update',
          entity: 'calibration',
          payload: { calibration, userId },
          userId,
        });
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseSyncService] Calibration synced: ${calibration.id}`);
      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SupabaseSyncService] Calibration sync exception:', error);
      await this.queue.enqueue({
        type: 'update',
        entity: 'calibration',
        payload: { calibration, userId },
        userId,
      });
      return { success: false, error: message };
    }
  }

  /**
   * Delete a calibration from Supabase
   */
  static async deleteCalibration(calibrationId: string, userId: string): Promise<SyncResult> {
    try {
      const normalizedId = CalibrationMapper.normalizeUUID(calibrationId);

      const { error } = await this.supabase
        .from('calibrations')
        .delete()
        .eq('id', normalizedId)
        .eq('user_id', userId);

      if (error) {
        console.error('[SupabaseSyncService] Calibration delete failed:', error);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseSyncService] Calibration deleted: ${calibrationId}`);
      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SupabaseSyncService] Calibration delete exception:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Load all calibrations for a user from Supabase
   */
  static async loadCalibrations(userId: string): Promise<Calibration[]> {
    try {
      const { data, error } = await this.supabase
        .from('calibrations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SupabaseSyncService] Failed to load calibrations:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      const calibrations = data.map((dbCal: DBCalibration) =>
        CalibrationMapper.fromDatabase(dbCal)
      );

      console.log(`[SupabaseSyncService] Loaded ${calibrations.length} calibrations from Supabase`);
      return calibrations;
    } catch (error) {
      console.error('[SupabaseSyncService] Load calibrations exception:', error);
      return [];
    }
  }

  /**
   * Set active calibration globally across all devices
   */
  static async setActiveCalibration(calibrationId: string, userId: string): Promise<SyncResult> {
    try {
      const normalizedId = CalibrationMapper.normalizeUUID(calibrationId);

      // First, set all calibrations to inactive
      const { error: deactivateError } = await this.supabase
        .from('calibrations')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (deactivateError) {
        console.error('[SupabaseSyncService] Failed to deactivate calibrations:', deactivateError);
        return { success: false, error: deactivateError.message };
      }

      // Then, set the target calibration to active
      const { error: activateError } = await this.supabase
        .from('calibrations')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', normalizedId)
        .eq('user_id', userId);

      if (activateError) {
        console.error('[SupabaseSyncService] Failed to activate calibration:', activateError);
        return { success: false, error: activateError.message };
      }

      console.log(`[SupabaseSyncService] Active calibration set: ${calibrationId}`);
      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SupabaseSyncService] Set active calibration exception:', error);
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // Data Migration
  // ============================================================================

  /**
   * Migrate existing localStorage data to Supabase
   *
   * Called on first authenticated app load
   */
  static async migrateLocalData(
    userId: string,
    localSessions: SessionData[],
    localCalibrations: Calibration[]
  ): Promise<SyncResult> {
    try {
      console.log('[SupabaseSyncService] Starting data migration...');

      // Filter out example sessions (don't migrate demo data)
      const realSessions = localSessions.filter((s) => !s.isExample);

      // Migrate calibrations first (sessions reference calibration IDs)
      for (const calibration of localCalibrations) {
        const result = await this.syncCalibration(calibration, userId);
        if (!result.success) {
          console.warn(`[SupabaseSyncService] Failed to migrate calibration ${calibration.id}:`, result.error);
        }
      }

      // Migrate sessions with their blink events
      for (const session of realSessions) {
        const result = await this.syncSession(session, userId);
        if (!result.success) {
          console.warn(`[SupabaseSyncService] Failed to migrate session ${session.id}:`, result.error);
          continue;
        }

        // Sync blink events for completed sessions
        if (!session.isActive && session.blinkEvents.length > 0) {
          const blinksResult = await this.syncBlinkEvents(
            session.id,
            session.blinkEvents,
            userId
          );
          if (!blinksResult.success) {
            console.warn(`[SupabaseSyncService] Failed to migrate blinks for session ${session.id}:`, blinksResult.error);
          }
        }
      }

      console.log(
        `[SupabaseSyncService] Migration complete: ${localCalibrations.length} calibrations, ${realSessions.length} sessions`
      );
      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SupabaseSyncService] Migration exception:', error);
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // Queue Retry Processor
  // ============================================================================

  /**
   * Process queued operations that are ready for retry
   *
   * Should be called periodically (e.g., every minute) by a background worker
   */
  static async processRetryQueue(): Promise<void> {
    try {
      const operations = await this.queue.getRetryableOperations();

      if (operations.length === 0) {
        return;
      }

      console.log(`[SupabaseSyncService] Processing ${operations.length} queued operations...`);

      for (const op of operations) {
        try {
          let result: SyncResult = { success: false, error: 'Unknown operation type' };

          // Process based on entity type
          switch (op.entity) {
            case 'session':
              const { session, userId: sessionUserId } = op.payload as {
                session: SessionData;
                userId: string;
              };
              result = await this.syncSession(session, sessionUserId);
              break;

            case 'calibration':
              const { calibration, userId: calUserId } = op.payload as {
                calibration: Calibration;
                userId: string;
              };
              result = await this.syncCalibration(calibration, calUserId);
              break;

            case 'blink_pattern':
              const { sessionId, events, userId: blinkUserId } = op.payload as {
                sessionId: string;
                events: BlinkEvent[];
                userId: string;
              };
              result = await this.syncBlinkEvents(sessionId, events, blinkUserId);
              break;
          }

          // If successful, mark as complete
          if (result.success) {
            await this.queue.markComplete(op.id);
            console.log(`[SupabaseSyncService] Queued operation ${op.id} completed successfully`);
          } else {
            // Mark as failed and increment retry count
            await this.queue.markFailed(op.id, result.error || 'Unknown error');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          await this.queue.markFailed(op.id, message);
        }
      }
    } catch (error) {
      console.error('[SupabaseSyncService] Queue processing error:', error);
    }
  }

  // ============================================================================
  // Merge Helpers
  // ============================================================================

  /**
   * Merge local and remote sessions
   *
   * Strategy: Deduplicate by ID, most recent timestamp wins
   */
  static mergeSessions(local: SessionData[], remote: SessionData[]): SessionData[] {
    const merged = new Map<string, SessionData>();

    // Add all local sessions
    local.forEach((session) => merged.set(session.id, session));

    // Add/merge remote sessions
    remote.forEach((remoteSession) => {
      const localSession = merged.get(remoteSession.id);

      if (!localSession) {
        // New session from another device
        merged.set(remoteSession.id, remoteSession);
      } else {
        // Conflict: Use most recent by endTime (or startTime for active sessions)
        const localTime = localSession.endTime || localSession.startTime;
        const remoteTime = remoteSession.endTime || remoteSession.startTime;

        if (remoteTime > localTime) {
          merged.set(remoteSession.id, remoteSession);
        }
      }
    });

    return Array.from(merged.values()).sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );
  }

  /**
   * Merge local and remote calibrations
   *
   * Strategy:
   * - Deduplicate by ID, most recent updatedAt wins
   * - Remote active calibration takes precedence (global state)
   */
  static mergeCalibrations(local: Calibration[], remote: Calibration[]): Calibration[] {
    const merged = new Map<string, Calibration>();

    // Add all local calibrations (mark all inactive initially)
    local.forEach((cal) => {
      merged.set(cal.id, { ...cal, isActive: false });
    });

    // Add/merge remote calibrations
    remote.forEach((remoteCal) => {
      const localCal = merged.get(remoteCal.id);

      if (!localCal) {
        // New calibration from another device
        merged.set(remoteCal.id, remoteCal);
      } else {
        // Conflict: Use most recent by updatedAt
        if (remoteCal.updatedAt > localCal.updatedAt) {
          merged.set(remoteCal.id, remoteCal);
        } else {
          // Keep local version but honor remote active state (global state)
          merged.set(remoteCal.id, {
            ...localCal,
            isActive: remoteCal.isActive,
          });
        }
      }
    });

    return Array.from(merged.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
}
