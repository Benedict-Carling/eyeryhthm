import { SessionData, calculateTotalIdleTime } from './types';

export interface SessionFilters {
  minDuration: number | null; // in seconds, null means no filter
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  minFatigueAlerts: number | null;
  hadFaceLost: boolean | null; // true = only with face lost, false = only without, null = all
}

export const DEFAULT_FILTERS: SessionFilters = {
  minDuration: 120, // 2 minutes default
  dateRange: {
    start: null,
    end: null,
  },
  minFatigueAlerts: null,
  hadFaceLost: null,
};

export const DURATION_OPTIONS = [
  { value: null, label: 'Any duration' },
  { value: 60, label: '1+ min' },
  { value: 120, label: '2+ min' },
  { value: 300, label: '5+ min' },
  { value: 600, label: '10+ min' },
  { value: 1800, label: '30+ min' },
  { value: 3600, label: '1+ hour' },
];

export const FATIGUE_ALERT_OPTIONS = [
  { value: null, label: 'Any alerts' },
  { value: 0, label: 'No alerts' },
  { value: 1, label: '1+ alert' },
  { value: 3, label: '3+ alerts' },
  { value: 5, label: '5+ alerts' },
];

export const FACE_LOST_OPTIONS = [
  { value: null, label: 'Any' },
  { value: true, label: 'Had interruptions' },
  { value: false, label: 'No interruptions' },
];

export function filterSessions(
  sessions: SessionData[],
  filters: SessionFilters
): SessionData[] {
  return sessions.filter((session) => {
    // Skip active sessions - they're shown separately
    if (session.isActive) return false;

    // Duration filter
    if (filters.minDuration !== null) {
      const duration = session.duration ?? 0;
      if (duration < filters.minDuration) return false;
    }

    // Date range filter
    if (filters.dateRange.start !== null) {
      if (session.startTime < filters.dateRange.start) return false;
    }
    if (filters.dateRange.end !== null) {
      // Include sessions that started before end of day
      const endOfDay = new Date(filters.dateRange.end);
      endOfDay.setHours(23, 59, 59, 999);
      if (session.startTime > endOfDay) return false;
    }

    // Fatigue alerts filter
    if (filters.minFatigueAlerts !== null) {
      if (filters.minFatigueAlerts === 0) {
        // Special case: "No alerts" means exactly 0
        if (session.fatigueAlertCount !== 0) return false;
      } else {
        if (session.fatigueAlertCount < filters.minFatigueAlerts) return false;
      }
    }

    // Face lost filter
    if (filters.hadFaceLost !== null) {
      const totalIdleTime = calculateTotalIdleTime(session.faceLostPeriods);
      const hadFaceLost = totalIdleTime > 0;
      if (filters.hadFaceLost !== hadFaceLost) return false;
    }

    return true;
  });
}

export function getActiveFilterCount(filters: SessionFilters): number {
  let count = 0;

  if (filters.minDuration !== null && filters.minDuration !== DEFAULT_FILTERS.minDuration) {
    count++;
  }
  if (filters.dateRange.start !== null || filters.dateRange.end !== null) {
    count++;
  }
  if (filters.minFatigueAlerts !== null) {
    count++;
  }
  if (filters.hadFaceLost !== null) {
    count++;
  }

  return count;
}

export function formatDurationFilter(seconds: number | null): string {
  if (seconds === null) return 'Any duration';
  if (seconds < 60) return `${seconds}+ sec`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}+ min`;
  return `${Math.floor(seconds / 3600)}+ hour`;
}
