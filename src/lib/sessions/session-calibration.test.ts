import { describe, it, expect } from 'vitest';
import { SessionData } from './types';

describe('Session-Calibration Link', () => {
  it('should include calibrationId in SessionData type', () => {
    const session: SessionData = {
      id: 'test-session',
      startTime: new Date(),
      isActive: true,
      averageBlinkRate: 10,
      blinkRateHistory: [],
      quality: 'good',
      fatigueAlertCount: 0,
      calibrationId: 'test-calibration-id',
    };

    expect(session.calibrationId).toBe('test-calibration-id');
  });

  it('should allow SessionData without calibrationId', () => {
    const session: SessionData = {
      id: 'test-session',
      startTime: new Date(),
      isActive: true,
      averageBlinkRate: 10,
      blinkRateHistory: [],
      quality: 'good',
      fatigueAlertCount: 0,
    };

    expect(session.calibrationId).toBeUndefined();
  });
});