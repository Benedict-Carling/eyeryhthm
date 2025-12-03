export interface FaceLostPeriod {
  start: number; // timestamp in ms
  end?: number;  // timestamp in ms, undefined if face is currently lost
}

export interface SessionData {
  id: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  averageBlinkRate: number;
  blinkRateHistory: BlinkRatePoint[];
  quality: 'good' | 'fair' | 'poor';
  fatigueAlertCount: number;
  duration?: number; // in seconds
  calibrationId?: string;
  totalBlinks: number;
  faceLostPeriods?: FaceLostPeriod[]; // Periods when face was not detected
  isExample?: boolean; // Indicates this is a demo/example session
}

export interface BlinkRatePoint {
  timestamp: number;
  rate: number;
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