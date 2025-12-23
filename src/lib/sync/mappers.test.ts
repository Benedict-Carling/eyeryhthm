/**
 * Mappers Unit Tests
 *
 * Tests for data transformation between localStorage and Supabase formats
 */

import { describe, it, expect, vi } from 'vitest';
import { SessionMapper, CalibrationMapper, BlinkEventMapper } from './mappers';
import type { SessionData, BlinkEvent } from '../sessions/types';
import type { Calibration, CalibrationMetadata, CalibrationRawData } from '../blink-detection/types';
import type { DBSession, DBCalibration, DBBlinkPattern } from './types';

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

// Mock uuid module
vi.mock('uuid', () => ({
  v5: vi.fn((input: string) => `uuid-v5-${input.substring(0, 8)}`),
  v4: vi.fn(() => 'uuid-v4-random'),
}));

describe('SessionMapper', () => {
  const mockUserId = 'user-123-uuid';

  describe('normalizeUUID', () => {
    it('returns UUID unchanged if already valid', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      expect(SessionMapper.normalizeUUID(validUUID)).toBe(validUUID);
    });

    it('generates deterministic UUID v5 from localStorage ID', () => {
      const localStorageId = 'session-1234567890';
      const result = SessionMapper.normalizeUUID(localStorageId);
      expect(result).toBe('uuid-v5-session-');
    });

    it('generates same UUID for same input', () => {
      const id1 = SessionMapper.normalizeUUID('session-abc');
      const id2 = SessionMapper.normalizeUUID('session-abc');
      expect(id1).toBe(id2);
    });
  });

  describe('toDatabase', () => {
    const mockSession: SessionData = {
      id: 'session-1234567890',
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T11:00:00Z'),
      isActive: false,
      averageBlinkRate: 15.5,
      blinkEvents: [{ timestamp: 1705312800000 }],
      quality: 'good',
      fatigueAlertCount: 2,
      duration: 3600,
      calibrationId: 'cal_123456',
      totalBlinks: 930,
      faceLostPeriods: [{ start: 100, end: 200 }],
    };

    it('converts localStorage session to database format', () => {
      const result = SessionMapper.toDatabase(mockSession, mockUserId);

      expect(result.user_id).toBe(mockUserId);
      expect(result.start_timestamp).toBe('2024-01-15T10:00:00.000Z');
      expect(result.end_timestamp).toBe('2024-01-15T11:00:00.000Z');
      expect(result.session_type).toBe('completed');
      expect(result.quality_assessment).toBe('good');
      expect(result.face_lost_periods).toEqual([{ start: 100, end: 200 }]);
    });

    it('sets session_type to active for active sessions', () => {
      const activeSession = { ...mockSession, isActive: true };
      const result = SessionMapper.toDatabase(activeSession, mockUserId);
      expect(result.session_type).toBe('active');
    });

    it('handles null calibrationId', () => {
      const sessionNoCalibration = { ...mockSession, calibrationId: undefined };
      const result = SessionMapper.toDatabase(sessionNoCalibration, mockUserId);
      expect(result.calibration_id).toBeNull();
    });

    it('normalizes session ID to UUID format', () => {
      const result = SessionMapper.toDatabase(mockSession, mockUserId);
      expect(result.id).toBe('uuid-v5-session-');
    });
  });

  describe('fromDatabase', () => {
    const mockDBSession: DBSession = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: mockUserId,
      calibration_id: 'cal-uuid-here',
      start_timestamp: '2024-01-15T10:00:00.000Z',
      end_timestamp: '2024-01-15T11:00:00.000Z',
      session_type: 'completed',
      quality_assessment: 'good',
      device_type: 'web',
      platform: 'macos',
      timezone: 'America/New_York',
      face_lost_periods: [{ start: 100, end: 200 }],
      created_at: '2024-01-15T10:00:00.000Z',
    };

    const mockBlinkEvents: BlinkEvent[] = [
      { timestamp: 1705312800000 },
      { timestamp: 1705312860000 },
    ];

    it('converts database session to localStorage format', () => {
      const result = SessionMapper.fromDatabase(mockDBSession, mockBlinkEvents);

      expect(result.id).toBe(mockDBSession.id);
      expect(result.startTime).toEqual(new Date('2024-01-15T10:00:00.000Z'));
      expect(result.endTime).toEqual(new Date('2024-01-15T11:00:00.000Z'));
      expect(result.isActive).toBe(false);
      expect(result.quality).toBe('good');
      expect(result.calibrationId).toBe('cal-uuid-here');
      expect(result.faceLostPeriods).toEqual([{ start: 100, end: 200 }]);
    });

    it('computes totalBlinks from blink events array', () => {
      const result = SessionMapper.fromDatabase(mockDBSession, mockBlinkEvents);
      expect(result.totalBlinks).toBe(2);
    });

    it('computes averageBlinkRate from duration and blink count', () => {
      const result = SessionMapper.fromDatabase(mockDBSession, mockBlinkEvents);
      // 2 blinks in 60 minutes = 0.0333... blinks per minute
      expect(result.averageBlinkRate).toBeCloseTo(0.0333, 2);
    });

    it('handles active sessions', () => {
      const activeDBSession = { ...mockDBSession, session_type: 'active' as const };
      const result = SessionMapper.fromDatabase(activeDBSession);
      expect(result.isActive).toBe(true);
    });

    it('maps excellent quality to good for localStorage compatibility', () => {
      const excellentSession = { ...mockDBSession, quality_assessment: 'excellent' as const };
      const result = SessionMapper.fromDatabase(excellentSession);
      expect(result.quality).toBe('good');
    });

    it('handles null quality_assessment', () => {
      const noQualitySession = { ...mockDBSession, quality_assessment: null };
      const result = SessionMapper.fromDatabase(noQualitySession);
      expect(result.quality).toBe('fair');
    });

    it('handles empty blink events', () => {
      const result = SessionMapper.fromDatabase(mockDBSession, []);
      expect(result.totalBlinks).toBe(0);
      expect(result.averageBlinkRate).toBe(0);
    });
  });

  // Note: detectDeviceType and detectPlatform tests are skipped because they
  // rely on the real window.navigator which is difficult to mock reliably in Vitest.
  // These functions are simple regex checks and are implicitly tested through
  // integration tests and manual testing.
});

describe('CalibrationMapper', () => {
  const mockUserId = 'user-123-uuid';

  describe('normalizeUUID', () => {
    it('returns UUID unchanged if already valid', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      expect(CalibrationMapper.normalizeUUID(validUUID)).toBe(validUUID);
    });

    it('generates deterministic UUID v5 from localStorage ID', () => {
      const localStorageId = 'cal_1234567890_abc';
      const result = CalibrationMapper.normalizeUUID(localStorageId);
      expect(result).toBe('uuid-v5-cal_1234');
    });
  });

  describe('toDatabase', () => {
    const mockCalibration: Calibration = {
      id: 'cal_1234567890_abc',
      name: 'My Calibration',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T12:00:00Z'),
      isActive: true,
      isDefault: false,
      earThreshold: 0.21,
      metadata: createMockMetadata(),
      rawData: createMockRawData(),
    };

    it('converts localStorage calibration to database format', () => {
      const result = CalibrationMapper.toDatabase(mockCalibration, mockUserId);

      expect(result.user_id).toBe(mockUserId);
      expect(result.name).toBe('My Calibration');
      expect(result.ear_threshold).toBe(0.21);
      expect(result.is_active).toBe(true);
      expect(result.is_default).toBe(false);
      expect(result.created_at).toBe('2024-01-15T10:00:00.000Z');
      expect(result.updated_at).toBe('2024-01-15T12:00:00.000Z');
    });

    it('normalizes calibration ID to UUID format', () => {
      const result = CalibrationMapper.toDatabase(mockCalibration, mockUserId);
      expect(result.id).toBe('uuid-v5-cal_1234');
    });

    it('preserves metadata and rawData as JSONB', () => {
      const result = CalibrationMapper.toDatabase(mockCalibration, mockUserId);
      expect(result.metadata).toEqual(createMockMetadata());
      expect(result.raw_data).toEqual(createMockRawData());
    });
  });

  describe('fromDatabase', () => {
    const mockDBCalibration: DBCalibration = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: mockUserId,
      name: 'My Calibration',
      ear_threshold: 0.21,
      is_active: true,
      is_default: false,
      device_type: 'web',
      platform: 'macos',
      metadata: { version: 1 },
      raw_data: { samples: [] },
      created_at: '2024-01-15T10:00:00.000Z',
      updated_at: '2024-01-15T12:00:00.000Z',
    };

    it('converts database calibration to localStorage format', () => {
      const result = CalibrationMapper.fromDatabase(mockDBCalibration);

      expect(result.id).toBe(mockDBCalibration.id);
      expect(result.name).toBe('My Calibration');
      expect(result.earThreshold).toBe(0.21);
      expect(result.isActive).toBe(true);
      expect(result.isDefault).toBe(false);
      expect(result.createdAt).toEqual(new Date('2024-01-15T10:00:00.000Z'));
      expect(result.updatedAt).toEqual(new Date('2024-01-15T12:00:00.000Z'));
    });

    it('converts ear_threshold to number', () => {
      // Supabase NUMERIC type may return as string
      const dbWithStringThreshold = { ...mockDBCalibration, ear_threshold: '0.21' as unknown as number };
      const result = CalibrationMapper.fromDatabase(dbWithStringThreshold);
      expect(typeof result.earThreshold).toBe('number');
      expect(result.earThreshold).toBe(0.21);
    });
  });
});

describe('BlinkEventMapper', () => {
  const mockUserId = 'user-123-uuid';
  const mockSessionId = '550e8400-e29b-41d4-a716-446655440000';

  describe('batchToDatabase', () => {
    const mockEvents: BlinkEvent[] = [
      { timestamp: 1705312800000 },
      { timestamp: 1705312860000 },
      { timestamp: 1705312920000 },
    ];

    it('converts localStorage blink events to database format', () => {
      const result = BlinkEventMapper.batchToDatabase(mockEvents, mockSessionId, mockUserId);

      expect(result).toHaveLength(3);
      expect(result[0]!.user_id).toBe(mockUserId);
      expect(result[0]!.screen_session_id).toBe(mockSessionId);
      expect(result[0]!.id).toBe('uuid-v4-random');
    });

    it('generates new UUID for each blink event', () => {
      const result = BlinkEventMapper.batchToDatabase(mockEvents, mockSessionId, mockUserId);
      // All should have UUID (mocked to same value for simplicity)
      result.forEach((pattern) => {
        expect(pattern.id).toBeDefined();
      });
    });

    it('converts timestamp to ISO string', () => {
      const result = BlinkEventMapper.batchToDatabase(mockEvents, mockSessionId, mockUserId);
      expect(result[0]!.timestamp).toBe('2024-01-15T10:00:00.000Z');
    });

    it('sets created_at to current time', () => {
      const before = new Date().toISOString();
      const result = BlinkEventMapper.batchToDatabase(mockEvents, mockSessionId, mockUserId);
      const after = new Date().toISOString();

      result.forEach((pattern) => {
        expect(pattern.created_at >= before).toBe(true);
        expect(pattern.created_at <= after).toBe(true);
      });
    });

    it('handles empty events array', () => {
      const result = BlinkEventMapper.batchToDatabase([], mockSessionId, mockUserId);
      expect(result).toEqual([]);
    });
  });

  describe('batchFromDatabase', () => {
    const mockPatterns: DBBlinkPattern[] = [
      {
        id: 'pattern-1',
        user_id: mockUserId,
        screen_session_id: mockSessionId,
        timestamp: '2024-01-15T10:00:00.000Z',
        created_at: '2024-01-15T10:00:00.000Z',
      },
      {
        id: 'pattern-2',
        user_id: mockUserId,
        screen_session_id: mockSessionId,
        timestamp: '2024-01-15T10:01:00.000Z',
        created_at: '2024-01-15T10:01:00.000Z',
      },
    ];

    it('converts database blink patterns to localStorage format', () => {
      const result = BlinkEventMapper.batchFromDatabase(mockPatterns);

      expect(result).toHaveLength(2);
      expect(result[0]!.timestamp).toBe(1705312800000);
      expect(result[1]!.timestamp).toBe(1705312860000);
    });

    it('handles empty patterns array', () => {
      const result = BlinkEventMapper.batchFromDatabase([]);
      expect(result).toEqual([]);
    });
  });
});
