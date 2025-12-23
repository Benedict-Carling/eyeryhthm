/**
 * SupabaseSyncService Unit Tests
 *
 * Tests for sync operations between localStorage and Supabase
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseSyncService } from './supabase-sync-service';
import type { SessionData, BlinkEvent } from '../sessions/types';
import type { Calibration, CalibrationMetadata, CalibrationRawData } from '../blink-detection/types';

// Helper to create mock calibration metadata
const createMockMetadata = (): CalibrationMetadata => ({
  totalBlinksRequested: 5,
  totalBlinksDetected: 5,
  accuracy: 1.0,
  averageBlinkInterval: 1000,
  minEarValue: 0.15,
  maxEarValue: 0.35,
});

// Helper to create mock calibration raw data
const createMockRawData = (): CalibrationRawData => ({
  timestamps: [1000, 2000, 3000],
  earValues: [0.25, 0.15, 0.25],
  blinkEvents: [],
});

// Mock the sync queue
const mockEnqueue = vi.fn().mockResolvedValue('queued-op-id');
const mockMarkComplete = vi.fn().mockResolvedValue(undefined);
const mockMarkFailed = vi.fn().mockResolvedValue(undefined);
const mockGetRetryableOperations = vi.fn().mockResolvedValue([]);

vi.mock('./sync-queue', () => ({
  getSyncQueue: () => ({
    enqueue: mockEnqueue,
    markComplete: mockMarkComplete,
    markFailed: mockMarkFailed,
    getRetryableOperations: mockGetRetryableOperations,
  }),
  SyncQueue: vi.fn(),
}));

// Mock the Supabase client - needs to be after sync-queue mock
let mockUpsertResult: { error: { message: string } | null } = { error: null };
let mockDeleteResult: { error: { message: string } | null } = { error: null };
let mockSelectResult: { data: unknown[] | null; error: { message: string } | null } = { data: [], error: null };

vi.mock('../auth/supabase-client', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      upsert: () => mockUpsertResult,
      delete: () => ({
        eq: () => ({
          eq: () => Promise.resolve(mockDeleteResult),
        }),
      }),
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve(mockSelectResult),
        }),
        in: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
    }),
  }),
}));

describe('SupabaseSyncService', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock results
    mockUpsertResult = { error: null };
    mockDeleteResult = { error: null };
    mockSelectResult = { data: [], error: null };
  });

  describe('syncSession', () => {
    const mockSession: SessionData = {
      id: 'session-123',
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T11:00:00Z'),
      isActive: false,
      averageBlinkRate: 15,
      blinkEvents: [],
      quality: 'good',
      fatigueAlertCount: 0,
      duration: 3600,
      totalBlinks: 900,
      faceLostPeriods: [],
    };

    it('syncs session successfully', async () => {
      mockUpsertResult = { error: null };

      const result = await SupabaseSyncService.syncSession(mockSession, mockUserId);

      expect(result.success).toBe(true);
      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it('queues operation on failure', async () => {
      mockUpsertResult = { error: { message: 'Network error' } };

      const result = await SupabaseSyncService.syncSession(mockSession, mockUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Network error');
      }
      expect(mockEnqueue).toHaveBeenCalledWith({
        type: 'update',
        entity: 'session',
        payload: { session: mockSession, userId: mockUserId },
        userId: mockUserId,
      });
    });

    it('queues with create type for active sessions', async () => {
      const activeSession = { ...mockSession, isActive: true };
      mockUpsertResult = { error: { message: 'Error' } };

      await SupabaseSyncService.syncSession(activeSession, mockUserId);

      expect(mockEnqueue).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'create' })
      );
    });
  });

  describe('syncBlinkEvents', () => {
    const mockEvents: BlinkEvent[] = [
      { timestamp: 1705312800000 },
      { timestamp: 1705312860000 },
    ];
    const mockSessionId = 'session-123';

    it('returns success for empty events array', async () => {
      const result = await SupabaseSyncService.syncBlinkEvents(mockSessionId, [], mockUserId);

      expect(result.success).toBe(true);
    });

    it('syncs blink events successfully', async () => {
      mockUpsertResult = { error: null };

      const result = await SupabaseSyncService.syncBlinkEvents(
        mockSessionId,
        mockEvents,
        mockUserId
      );

      expect(result.success).toBe(true);
    });

    it('queues on failure', async () => {
      mockUpsertResult = { error: { message: 'Insert failed' } };

      const result = await SupabaseSyncService.syncBlinkEvents(
        mockSessionId,
        mockEvents,
        mockUserId
      );

      expect(result.success).toBe(false);
      expect(mockEnqueue).toHaveBeenCalledWith({
        type: 'create',
        entity: 'blink_pattern',
        payload: { sessionId: mockSessionId, events: mockEvents, userId: mockUserId },
        userId: mockUserId,
      });
    });
  });

  describe('syncCalibration', () => {
    const mockCalibration: Calibration = {
      id: 'cal-123',
      name: 'Test Calibration',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      isActive: true,
      isDefault: false,
      earThreshold: 0.21,
      metadata: createMockMetadata(),
      rawData: createMockRawData(),
    };

    it('syncs calibration successfully', async () => {
      mockUpsertResult = { error: null };

      const result = await SupabaseSyncService.syncCalibration(mockCalibration, mockUserId);

      expect(result.success).toBe(true);
    });

    it('queues on failure', async () => {
      mockUpsertResult = { error: { message: 'Upsert failed' } };

      const result = await SupabaseSyncService.syncCalibration(mockCalibration, mockUserId);

      expect(result.success).toBe(false);
      expect(mockEnqueue).toHaveBeenCalledWith({
        type: 'update',
        entity: 'calibration',
        payload: { calibration: mockCalibration, userId: mockUserId },
        userId: mockUserId,
      });
    });
  });

  describe('mergeSessions', () => {
    it('combines local and remote sessions without duplicates', () => {
      const localSessions: SessionData[] = [
        {
          id: 'session-1',
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z'),
          isActive: false,
          averageBlinkRate: 15,
          blinkEvents: [],
          quality: 'good',
          fatigueAlertCount: 0,
          totalBlinks: 900,
          faceLostPeriods: [],
        },
      ];

      const remoteSessions: SessionData[] = [
        {
          id: 'session-2',
          startTime: new Date('2024-01-16T10:00:00Z'),
          endTime: new Date('2024-01-16T11:00:00Z'),
          isActive: false,
          averageBlinkRate: 16,
          blinkEvents: [],
          quality: 'good',
          fatigueAlertCount: 0,
          totalBlinks: 960,
          faceLostPeriods: [],
        },
      ];

      const merged = SupabaseSyncService.mergeSessions(localSessions, remoteSessions);

      expect(merged).toHaveLength(2);
      expect(merged.find((s) => s.id === 'session-1')).toBeDefined();
      expect(merged.find((s) => s.id === 'session-2')).toBeDefined();
    });

    it('uses most recent version for duplicate IDs', () => {
      const older: SessionData = {
        id: 'session-1',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        isActive: false,
        averageBlinkRate: 15,
        blinkEvents: [],
        quality: 'fair',
        fatigueAlertCount: 0,
        totalBlinks: 900,
        faceLostPeriods: [],
      };

      const newer: SessionData = {
        id: 'session-1',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T12:00:00Z'), // Later end time
        isActive: false,
        averageBlinkRate: 16,
        blinkEvents: [],
        quality: 'good',
        fatigueAlertCount: 0,
        totalBlinks: 1000,
        faceLostPeriods: [],
      };

      const merged = SupabaseSyncService.mergeSessions([older], [newer]);

      expect(merged).toHaveLength(1);
      expect(merged[0]!.endTime).toEqual(new Date('2024-01-15T12:00:00Z'));
      expect(merged[0]!.totalBlinks).toBe(1000);
    });

    it('sorts merged sessions by startTime descending', () => {
      const sessions1: SessionData[] = [
        {
          id: 'session-1',
          startTime: new Date('2024-01-15T10:00:00Z'),
          isActive: false,
          averageBlinkRate: 15,
          blinkEvents: [],
          quality: 'good',
          fatigueAlertCount: 0,
          totalBlinks: 900,
          faceLostPeriods: [],
        },
      ];

      const sessions2: SessionData[] = [
        {
          id: 'session-2',
          startTime: new Date('2024-01-16T10:00:00Z'),
          isActive: false,
          averageBlinkRate: 16,
          blinkEvents: [],
          quality: 'good',
          fatigueAlertCount: 0,
          totalBlinks: 960,
          faceLostPeriods: [],
        },
      ];

      const merged = SupabaseSyncService.mergeSessions(sessions1, sessions2);

      expect(merged[0]!.id).toBe('session-2'); // Most recent first
      expect(merged[1]!.id).toBe('session-1');
    });
  });

  describe('mergeCalibrations', () => {
    it('combines local and remote calibrations', () => {
      const local: Calibration[] = [
        {
          id: 'cal-1',
          name: 'Local Cal',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          updatedAt: new Date('2024-01-15T10:00:00Z'),
          isActive: true,
          isDefault: false,
          earThreshold: 0.21,
          metadata: createMockMetadata(),
          rawData: createMockRawData(),
        },
      ];

      const remote: Calibration[] = [
        {
          id: 'cal-2',
          name: 'Remote Cal',
          createdAt: new Date('2024-01-16T10:00:00Z'),
          updatedAt: new Date('2024-01-16T10:00:00Z'),
          isActive: false,
          isDefault: false,
          earThreshold: 0.22,
          metadata: createMockMetadata(),
          rawData: createMockRawData(),
        },
      ];

      const merged = SupabaseSyncService.mergeCalibrations(local, remote);

      expect(merged).toHaveLength(2);
    });

    it('uses remote active state for conflicts', () => {
      const local: Calibration[] = [
        {
          id: 'cal-1',
          name: 'Cal',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          updatedAt: new Date('2024-01-15T12:00:00Z'), // Local is newer
          isActive: true,
          isDefault: false,
          earThreshold: 0.21,
          metadata: createMockMetadata(),
          rawData: createMockRawData(),
        },
      ];

      const remote: Calibration[] = [
        {
          id: 'cal-1',
          name: 'Cal',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          updatedAt: new Date('2024-01-15T10:00:00Z'),
          isActive: false, // Remote says inactive
          isDefault: false,
          earThreshold: 0.21,
          metadata: createMockMetadata(),
          rawData: createMockRawData(),
        },
      ];

      const merged = SupabaseSyncService.mergeCalibrations(local, remote);

      expect(merged).toHaveLength(1);
      // Local data is newer so it wins, but remote active state is honored
      expect(merged[0]!.isActive).toBe(false);
    });

    it('uses remote version when remote is newer', () => {
      const local: Calibration[] = [
        {
          id: 'cal-1',
          name: 'Old Name',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          updatedAt: new Date('2024-01-15T10:00:00Z'),
          isActive: true,
          isDefault: false,
          earThreshold: 0.20,
          metadata: createMockMetadata(),
          rawData: createMockRawData(),
        },
      ];

      const remote: Calibration[] = [
        {
          id: 'cal-1',
          name: 'New Name',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          updatedAt: new Date('2024-01-15T12:00:00Z'), // Remote is newer
          isActive: false,
          isDefault: false,
          earThreshold: 0.22,
          metadata: createMockMetadata(),
          rawData: createMockRawData(),
        },
      ];

      const merged = SupabaseSyncService.mergeCalibrations(local, remote);

      expect(merged).toHaveLength(1);
      expect(merged[0]!.name).toBe('New Name');
      expect(merged[0]!.earThreshold).toBe(0.22);
    });

    it('sorts by createdAt descending', () => {
      const cals: Calibration[] = [
        {
          id: 'cal-1',
          name: 'Older',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          updatedAt: new Date('2024-01-15T10:00:00Z'),
          isActive: false,
          isDefault: false,
          earThreshold: 0.21,
          metadata: createMockMetadata(),
          rawData: createMockRawData(),
        },
        {
          id: 'cal-2',
          name: 'Newer',
          createdAt: new Date('2024-01-16T10:00:00Z'),
          updatedAt: new Date('2024-01-16T10:00:00Z'),
          isActive: false,
          isDefault: false,
          earThreshold: 0.22,
          metadata: createMockMetadata(),
          rawData: createMockRawData(),
        },
      ];

      const merged = SupabaseSyncService.mergeCalibrations(cals, []);

      expect(merged[0]!.id).toBe('cal-2'); // Newer first
      expect(merged[1]!.id).toBe('cal-1');
    });
  });

  describe('migrateLocalData', () => {
    it('filters out example sessions', async () => {
      mockUpsertResult = { error: null };
      const sessions: SessionData[] = [
        {
          id: 'real-session',
          startTime: new Date(),
          isActive: false,
          averageBlinkRate: 15,
          blinkEvents: [],
          quality: 'good',
          fatigueAlertCount: 0,
          totalBlinks: 900,
          faceLostPeriods: [],
        },
        {
          id: 'example-session',
          startTime: new Date(),
          isActive: false,
          isExample: true,
          averageBlinkRate: 15,
          blinkEvents: [],
          quality: 'good',
          fatigueAlertCount: 0,
          totalBlinks: 900,
          faceLostPeriods: [],
        },
      ];

      const result = await SupabaseSyncService.migrateLocalData(mockUserId, sessions, []);

      // Should complete successfully (example sessions filtered out)
      expect(result.success).toBe(true);
    });

    it('returns success result', async () => {
      mockUpsertResult = { error: null };
      const result = await SupabaseSyncService.migrateLocalData(mockUserId, [], []);

      expect(result.success).toBe(true);
    });
  });

  describe('processRetryQueue', () => {
    it('does nothing when queue is empty', async () => {
      mockGetRetryableOperations.mockResolvedValue([]);

      await SupabaseSyncService.processRetryQueue();

      expect(mockMarkComplete).not.toHaveBeenCalled();
      expect(mockMarkFailed).not.toHaveBeenCalled();
    });

    it('processes session operations successfully', async () => {
      mockUpsertResult = { error: null };
      mockGetRetryableOperations.mockResolvedValue([
        {
          id: 'op-1',
          type: 'update',
          entity: 'session',
          payload: {
            session: {
              id: 'session-1',
              startTime: new Date(),
              isActive: false,
              averageBlinkRate: 15,
              blinkEvents: [],
              quality: 'good',
              fatigueAlertCount: 0,
              totalBlinks: 900,
              faceLostPeriods: [],
            },
            userId: mockUserId,
          },
          userId: mockUserId,
          retryCount: 1,
          maxRetries: 6,
          lastAttemptAt: Date.now() - 60000,
          createdAt: Date.now() - 120000,
        },
      ]);

      await SupabaseSyncService.processRetryQueue();

      expect(mockMarkComplete).toHaveBeenCalledWith('op-1');
    });

    it('marks failed on sync error', async () => {
      mockUpsertResult = { error: { message: 'Still failing' } };
      mockGetRetryableOperations.mockResolvedValue([
        {
          id: 'op-1',
          type: 'update',
          entity: 'session',
          payload: {
            session: {
              id: 'session-1',
              startTime: new Date(),
              isActive: false,
              averageBlinkRate: 15,
              blinkEvents: [],
              quality: 'good',
              fatigueAlertCount: 0,
              totalBlinks: 900,
              faceLostPeriods: [],
            },
            userId: mockUserId,
          },
          userId: mockUserId,
          retryCount: 1,
          maxRetries: 6,
          lastAttemptAt: Date.now() - 60000,
          createdAt: Date.now() - 120000,
        },
      ]);

      await SupabaseSyncService.processRetryQueue();

      expect(mockMarkFailed).toHaveBeenCalledWith('op-1', 'Still failing');
    });

    it('processes calibration operations successfully', async () => {
      mockUpsertResult = { error: null };
      mockGetRetryableOperations.mockResolvedValue([
        {
          id: 'op-2',
          type: 'update',
          entity: 'calibration',
          payload: {
            calibration: {
              id: 'cal-1',
              name: 'Test',
              createdAt: new Date(),
              updatedAt: new Date(),
              isActive: true,
              isDefault: false,
              earThreshold: 0.21,
              metadata: createMockMetadata(),
              rawData: createMockRawData(),
            },
            userId: mockUserId,
          },
          userId: mockUserId,
          retryCount: 0,
          maxRetries: 6,
          lastAttemptAt: Date.now() - 60000,
          createdAt: Date.now() - 120000,
        },
      ]);

      await SupabaseSyncService.processRetryQueue();

      expect(mockMarkComplete).toHaveBeenCalledWith('op-2');
    });

    it('processes blink_pattern operations successfully', async () => {
      mockUpsertResult = { error: null };
      mockGetRetryableOperations.mockResolvedValue([
        {
          id: 'op-3',
          type: 'create',
          entity: 'blink_pattern',
          payload: {
            sessionId: 'session-1',
            events: [{ timestamp: 1705312800000 }],
            userId: mockUserId,
          },
          userId: mockUserId,
          retryCount: 0,
          maxRetries: 6,
          lastAttemptAt: Date.now() - 60000,
          createdAt: Date.now() - 120000,
        },
      ]);

      await SupabaseSyncService.processRetryQueue();

      expect(mockMarkComplete).toHaveBeenCalledWith('op-3');
    });
  });
});
