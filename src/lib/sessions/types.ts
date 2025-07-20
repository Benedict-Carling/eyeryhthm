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
  return `${minutes}m`;
};