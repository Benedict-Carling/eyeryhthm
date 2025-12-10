// Blink rate constraints based on detection algorithm
// The debounce time prevents detecting the same blink multiple times
// The minimum cycle time accounts for the physical time needed for a blink (close + reopen)
export const BLINK_DEBOUNCE_MS = 50; // Must match useBlinkDetection debounceTime default
export const MIN_BLINK_CYCLE_MS = 100; // Minimum time for eye to close and reopen
export const MAX_BLINK_RATE = Math.round((60 * 1000) / (BLINK_DEBOUNCE_MS + MIN_BLINK_CYCLE_MS)); // ~400 blinks/min

// Time window for calculating blink rate - also used as minimum time before first chart reading
export const BLINK_RATE_WINDOW_MS = 30000; // 30 seconds

// Interval between chart data points when aggregating blink events
export const CHART_BUCKET_INTERVAL_MS = 5000; // 5 seconds

// Smoothing window options for chart display (in seconds)
export const SMOOTHING_OPTIONS = [
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
] as const;

export type SmoothingWindow = typeof SMOOTHING_OPTIONS[number]['value'];

export const DEFAULT_SMOOTHING_WINDOW: SmoothingWindow = 30;

export interface FaceLostPeriod {
  start: number; // timestamp in ms
  end?: number;  // timestamp in ms, undefined if face is currently lost
}

// Individual blink event - stores each blink with timestamp
// This replaces the pre-aggregated BlinkRatePoint for more flexible analysis
export interface BlinkEvent {
  timestamp: number; // When the blink occurred (ms since epoch)
  duration?: number; // Blink duration in ms (optional, for future use)
}

export interface SessionData {
  id: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  averageBlinkRate: number;
  // Individual blink events - aggregated on-the-fly for charts
  blinkEvents: BlinkEvent[];
  quality: 'good' | 'fair' | 'poor';
  fatigueAlertCount: number;
  duration?: number; // in seconds
  calibrationId?: string;
  totalBlinks: number;
  faceLostPeriods?: FaceLostPeriod[]; // Periods when face was not detected
  isExample?: boolean; // Indicates this is a demo/example session
}

// Used for chart display after aggregating BlinkEvents
export interface BlinkRatePoint {
  timestamp: number;
  rate: number;
}

// Aggregate blink events into rate points for chart display
export function aggregateBlinkEvents(
  blinkEvents: BlinkEvent[],
  windowSeconds: SmoothingWindow,
  sessionStartTime: number,
  sessionEndTime?: number
): BlinkRatePoint[] {
  if (blinkEvents.length === 0) return [];

  const windowMs = windowSeconds * 1000;
  const endTime = sessionEndTime ?? Date.now();
  const points: BlinkRatePoint[] = [];

  // Start from the first full window after session start
  let currentTime = sessionStartTime + windowMs;

  while (currentTime <= endTime) {
    const windowStart = currentTime - windowMs;

    // Count blinks within this window
    const blinksInWindow = blinkEvents.filter(
      (event) => event.timestamp >= windowStart && event.timestamp < currentTime
    ).length;

    // Calculate rate (blinks per minute)
    const windowMinutes = windowSeconds / 60;
    const rate = blinksInWindow / windowMinutes;

    points.push({
      timestamp: currentTime,
      rate: Math.min(rate, MAX_BLINK_RATE), // Cap to prevent outliers
    });

    currentTime += CHART_BUCKET_INTERVAL_MS;
  }

  return points;
}

/**
 * Get chart data from a session by aggregating blinkEvents.
 */
export function getChartDataFromSession(
  session: SessionData,
  smoothingWindow: SmoothingWindow = DEFAULT_SMOOTHING_WINDOW
): BlinkRatePoint[] {
  if (session.blinkEvents.length === 0) {
    return [];
  }

  return aggregateBlinkEvents(
    session.blinkEvents,
    smoothingWindow,
    session.startTime.getTime(),
    session.endTime ? session.endTime.getTime() : undefined
  );
}

export interface SessionStats {
  totalSessions: number;
  averageSessionDuration: number;
  averageBlinkRate: number;
  totalFatigueAlerts: number;
}

export const getSessionQuality = (blinkRate: number): 'good' | 'fair' | 'poor' => {
  if (blinkRate >= 12) return 'good';
  if (blinkRate >= 8) return 'fair';
  return 'poor';
};

export const formatSessionDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes < 1) {
    return "< 1 min";
  }
  return `${minutes}m`;
};

/**
 * Calculate total idle time from face lost periods
 * @param faceLostPeriods Array of face lost periods
 * @param sessionEndTime Optional session end time to use for periods without end timestamp
 */
export const calculateTotalIdleTime = (
  faceLostPeriods?: FaceLostPeriod[],
  sessionEndTime?: number
): number => {
  if (!faceLostPeriods || faceLostPeriods.length === 0) return 0;

  return faceLostPeriods.reduce((total, period) => {
    const end = period.end ?? sessionEndTime ?? Date.now();
    return total + (end - period.start);
  }, 0);
};

/**
 * Calculate active time (total duration minus idle time)
 * @param session SessionData
 * @returns Active time in seconds
 */
export const calculateActiveTime = (session: SessionData): number => {
  const totalDuration = session.duration || 0;
  const idleTimeMs = calculateTotalIdleTime(session.faceLostPeriods);
  const idleTimeSeconds = idleTimeMs / 1000;

  return Math.max(0, totalDuration - idleTimeSeconds);
};

/**
 * Calculate blink rate based on active time only
 */
export const calculateActiveBlinkRate = (session: SessionData): number => {
  const activeTimeSeconds = calculateActiveTime(session);
  const activeMinutes = activeTimeSeconds / 60;

  return activeMinutes > 0 ? session.totalBlinks / activeMinutes : 0;
};