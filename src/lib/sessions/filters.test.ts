import { describe, it, expect } from 'vitest';
import {
  filterSessions,
  SessionFilters,
  DEFAULT_FILTERS,
  getActiveFilterCount,
  formatDurationFilter,
} from './filters';
import { SessionData } from './types';

const createMockSession = (overrides: Partial<SessionData> = {}): SessionData => ({
  id: Math.random().toString(),
  startTime: new Date('2024-01-15T10:00:00'),
  endTime: new Date('2024-01-15T11:00:00'),
  isActive: false,
  averageBlinkRate: 15,
  blinkEvents: [{ timestamp: Date.now() }],
  quality: 'good',
  fatigueAlertCount: 0,
  duration: 3600, // 1 hour
  totalBlinks: 900,
  faceLostPeriods: [],
  calibrationId: 'default-calibration',
  ...overrides,
});

describe('filterSessions', () => {
  it('filters out active sessions', () => {
    const sessions: SessionData[] = [
      createMockSession({ isActive: true }),
      createMockSession({ isActive: false }),
    ];

    const result = filterSessions(sessions, DEFAULT_FILTERS);
    expect(result).toHaveLength(1);
    expect(result[0]?.isActive).toBe(false);
  });

  it('filters by minimum duration', () => {
    const sessions: SessionData[] = [
      createMockSession({ duration: 60 }), // 1 min
      createMockSession({ duration: 120 }), // 2 min
      createMockSession({ duration: 300 }), // 5 min
    ];

    const filters: SessionFilters = {
      ...DEFAULT_FILTERS,
      minDuration: 180, // 3 min
    };

    const result = filterSessions(sessions, filters);
    expect(result).toHaveLength(1);
    expect(result[0]?.duration).toBe(300);
  });

  it('includes all durations when minDuration is null', () => {
    const sessions: SessionData[] = [
      createMockSession({ duration: 60 }),
      createMockSession({ duration: 120 }),
    ];

    const filters: SessionFilters = {
      ...DEFAULT_FILTERS,
      minDuration: null,
    };

    const result = filterSessions(sessions, filters);
    expect(result).toHaveLength(2);
  });

  it('filters by date range start', () => {
    const sessions: SessionData[] = [
      createMockSession({ startTime: new Date('2024-01-10T10:00:00') }),
      createMockSession({ startTime: new Date('2024-01-15T10:00:00') }),
      createMockSession({ startTime: new Date('2024-01-20T10:00:00') }),
    ];

    const filters: SessionFilters = {
      ...DEFAULT_FILTERS,
      minDuration: null,
      dateRange: {
        start: new Date('2024-01-14'),
        end: null,
      },
    };

    const result = filterSessions(sessions, filters);
    expect(result).toHaveLength(2);
  });

  it('filters by date range end', () => {
    const sessions: SessionData[] = [
      createMockSession({ startTime: new Date('2024-01-10T10:00:00') }),
      createMockSession({ startTime: new Date('2024-01-15T10:00:00') }),
      createMockSession({ startTime: new Date('2024-01-20T10:00:00') }),
    ];

    const filters: SessionFilters = {
      ...DEFAULT_FILTERS,
      minDuration: null,
      dateRange: {
        start: null,
        end: new Date('2024-01-15'),
      },
    };

    const result = filterSessions(sessions, filters);
    expect(result).toHaveLength(2);
  });

  it('filters by minimum fatigue alerts', () => {
    const sessions: SessionData[] = [
      createMockSession({ fatigueAlertCount: 0 }),
      createMockSession({ fatigueAlertCount: 2 }),
      createMockSession({ fatigueAlertCount: 5 }),
    ];

    const filters: SessionFilters = {
      ...DEFAULT_FILTERS,
      minDuration: null,
      minFatigueAlerts: 3,
    };

    const result = filterSessions(sessions, filters);
    expect(result).toHaveLength(1);
    expect(result[0]?.fatigueAlertCount).toBe(5);
  });

  it('filters for no alerts when minFatigueAlerts is 0', () => {
    const sessions: SessionData[] = [
      createMockSession({ fatigueAlertCount: 0 }),
      createMockSession({ fatigueAlertCount: 2 }),
    ];

    const filters: SessionFilters = {
      ...DEFAULT_FILTERS,
      minDuration: null,
      minFatigueAlerts: 0,
    };

    const result = filterSessions(sessions, filters);
    expect(result).toHaveLength(1);
    expect(result[0]?.fatigueAlertCount).toBe(0);
  });

  it('filters by face lost (had interruptions)', () => {
    const sessions: SessionData[] = [
      createMockSession({ faceLostPeriods: [] }),
      createMockSession({ faceLostPeriods: [{ start: 1000, end: 2000 }] }),
    ];

    const filters: SessionFilters = {
      ...DEFAULT_FILTERS,
      minDuration: null,
      hadFaceLost: true,
    };

    const result = filterSessions(sessions, filters);
    expect(result).toHaveLength(1);
    expect(result[0]?.faceLostPeriods?.length).toBe(1);
  });

  it('filters by face lost (no interruptions)', () => {
    const sessions: SessionData[] = [
      createMockSession({ faceLostPeriods: [] }),
      createMockSession({ faceLostPeriods: [{ start: 1000, end: 2000 }] }),
    ];

    const filters: SessionFilters = {
      ...DEFAULT_FILTERS,
      minDuration: null,
      hadFaceLost: false,
    };

    const result = filterSessions(sessions, filters);
    expect(result).toHaveLength(1);
    expect(result[0]?.faceLostPeriods?.length).toBe(0);
  });

  it('applies multiple filters together', () => {
    const sessions: SessionData[] = [
      createMockSession({ duration: 300, fatigueAlertCount: 2 }),
      createMockSession({ duration: 600, fatigueAlertCount: 0 }),
      createMockSession({ duration: 600, fatigueAlertCount: 3 }),
      createMockSession({ duration: 100, fatigueAlertCount: 5 }),
    ];

    const filters: SessionFilters = {
      ...DEFAULT_FILTERS,
      minDuration: 500,
      minFatigueAlerts: 1,
      dateRange: { start: null, end: null },
      hadFaceLost: null,
    };

    const result = filterSessions(sessions, filters);
    expect(result).toHaveLength(1);
    expect(result[0]?.duration).toBe(600);
    expect(result[0]?.fatigueAlertCount).toBe(3);
  });

  it('filters by calibration ID', () => {
    const sessions: SessionData[] = [
      createMockSession({ calibrationId: 'cal-1' }),
      createMockSession({ calibrationId: 'cal-2' }),
      createMockSession({ calibrationId: 'cal-1' }),
    ];

    const filters: SessionFilters = {
      ...DEFAULT_FILTERS,
      minDuration: null,
      calibrationId: 'cal-1',
    };

    const result = filterSessions(sessions, filters);
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.calibrationId === 'cal-1')).toBe(true);
  });

  it('includes all calibrations when calibrationId is null', () => {
    const sessions: SessionData[] = [
      createMockSession({ calibrationId: 'cal-1' }),
      createMockSession({ calibrationId: 'cal-2' }),
    ];

    const filters: SessionFilters = {
      ...DEFAULT_FILTERS,
      minDuration: null,
      calibrationId: null,
    };

    const result = filterSessions(sessions, filters);
    expect(result).toHaveLength(2);
  });
});

describe('getActiveFilterCount', () => {
  it('returns 0 for default filters', () => {
    expect(getActiveFilterCount(DEFAULT_FILTERS)).toBe(0);
  });

  it('counts date range as one filter', () => {
    const filters: SessionFilters = {
      ...DEFAULT_FILTERS,
      dateRange: {
        start: new Date(),
        end: new Date(),
      },
    };
    expect(getActiveFilterCount(filters)).toBe(1);
  });

  it('counts multiple active filters', () => {
    const filters: SessionFilters = {
      ...DEFAULT_FILTERS,
      minDuration: 600, // Different from default (120)
      minFatigueAlerts: 3,
      hadFaceLost: true,
    };
    expect(getActiveFilterCount(filters)).toBe(3);
  });
});

describe('formatDurationFilter', () => {
  it('formats null as "Any duration"', () => {
    expect(formatDurationFilter(null)).toBe('Any duration');
  });

  it('formats seconds', () => {
    expect(formatDurationFilter(30)).toBe('30+ sec');
  });

  it('formats minutes', () => {
    expect(formatDurationFilter(120)).toBe('2+ min');
    expect(formatDurationFilter(300)).toBe('5+ min');
  });

  it('formats hours', () => {
    expect(formatDurationFilter(3600)).toBe('1+ hour');
    expect(formatDurationFilter(7200)).toBe('2+ hour');
  });
});
