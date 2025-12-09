import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AlertService } from './alert-service';
import { SessionData } from './sessions/types';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock Notification API
const mockNotification = Object.assign(
  vi.fn().mockImplementation(() => ({
    close: vi.fn(),
    onclick: null,
  })),
  {
    requestPermission: vi.fn(),
    permission: 'granted' as NotificationPermission,
  }
);
Object.defineProperty(window, 'Notification', {
  value: mockNotification,
  writable: true,
});

// Mock AudioContext
const mockAudioContext = {
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 0 },
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 0 },
  })),
  destination: {},
  currentTime: 0,
};
Object.defineProperty(window, 'AudioContext', {
  value: vi.fn(() => mockAudioContext),
  writable: true,
});

describe('AlertService', () => {
  let alertService: AlertService;

  beforeEach(() => {
    alertService = new AlertService();
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'fatigueThreshold') return '8';
      if (key === 'notificationsEnabled') return 'true';
      if (key === 'soundEnabled') return 'false';
      return null;
    });
  });

  afterEach(() => {
    alertService.stopMonitoring();
  });

  // Helper to create blink rate history within the 3-minute rolling window
  const createBlinkRateHistory = (rate: number, now: number = Date.now()) => {
    // Create points spanning the last 3 minutes (rolling window duration)
    return [
      { timestamp: now - 150000, rate }, // 2.5 min ago
      { timestamp: now - 120000, rate }, // 2 min ago
      { timestamp: now - 60000, rate },  // 1 min ago
      { timestamp: now - 30000, rate },  // 30 sec ago
      { timestamp: now - 5000, rate },   // 5 sec ago
    ];
  };

  const createMockSession = (overrides?: Partial<SessionData>): SessionData => {
    const now = Date.now();
    return {
      id: 'test-session',
      startTime: new Date(now - 6 * 60 * 1000), // 6 minutes ago (past 5-min grace period)
      isActive: true,
      averageBlinkRate: 7,
      blinkEvents: [], // Individual blink events
      blinkRateHistory: createBlinkRateHistory(7, now),
      quality: 'poor',
      fatigueAlertCount: 0,
      totalBlinks: 42,
      faceLostPeriods: [], // No face loss by default
      ...overrides,
    };
  };

  describe('checkForFatigue', () => {
    it('returns false when no session is provided', () => {
      const result = alertService.checkForFatigue(null);
      expect(result).toBe(false);
    });

    it('returns false when session is not active', () => {
      const session = createMockSession({ isActive: false });
      const result = alertService.checkForFatigue(session);
      expect(result).toBe(false);
    });

    it('returns false when session duration is less than 5 minutes (grace period)', () => {
      const session = createMockSession({
        startTime: new Date(Date.now() - 4 * 60 * 1000) // 4 minutes ago
      });
      const result = alertService.checkForFatigue(session);
      expect(result).toBe(false);
    });

    it('returns false when blink rate is above threshold', () => {
      const now = Date.now();
      const session = createMockSession({ blinkRateHistory: createBlinkRateHistory(10, now) });
      const result = alertService.checkForFatigue(session);
      expect(result).toBe(false);
    });

    it('returns false when blinkRateHistory is empty', () => {
      const session = createMockSession({ blinkRateHistory: [] });
      const result = alertService.checkForFatigue(session);
      expect(result).toBe(false);
    });

    it('returns true immediately when all conditions are met', () => {
      const now = Date.now();
      const session = createMockSession({ blinkRateHistory: createBlinkRateHistory(6, now) });
      const onAlert = vi.fn();

      const result = alertService.checkForFatigue(session, onAlert);

      expect(result).toBe(true);
      expect(onAlert).toHaveBeenCalled();
    });

    it('returns false when face loss in window exceeds 5 seconds', () => {
      const now = Date.now();
      const session = createMockSession({
        blinkRateHistory: createBlinkRateHistory(6, now),
        faceLostPeriods: [
          { start: now - 60000, end: now - 50000 } // 10 seconds of face loss
        ]
      });
      const onAlert = vi.fn();

      const result = alertService.checkForFatigue(session, onAlert);

      expect(result).toBe(false);
      expect(onAlert).not.toHaveBeenCalled();
    });

    it('returns true when face loss in window is under 5 seconds', () => {
      const now = Date.now();
      const session = createMockSession({
        blinkRateHistory: createBlinkRateHistory(6, now),
        faceLostPeriods: [
          { start: now - 60000, end: now - 57000 } // 3 seconds of face loss
        ]
      });
      const onAlert = vi.fn();

      const result = alertService.checkForFatigue(session, onAlert);

      expect(result).toBe(true);
      expect(onAlert).toHaveBeenCalled();
    });

    it('ignores face loss periods outside the rolling window', () => {
      const now = Date.now();
      const session = createMockSession({
        blinkRateHistory: createBlinkRateHistory(6, now),
        faceLostPeriods: [
          { start: now - 300000, end: now - 290000 } // 10 seconds, but 5 mins ago (outside window)
        ]
      });
      const onAlert = vi.fn();

      const result = alertService.checkForFatigue(session, onAlert);

      expect(result).toBe(true);
      expect(onAlert).toHaveBeenCalled();
    });

    it('respects 3-minute cooldown period between alerts', () => {
      vi.useFakeTimers();
      const now = Date.now();
      const session = createMockSession({ blinkRateHistory: createBlinkRateHistory(6, now) });
      const onAlert = vi.fn();

      // First alert should trigger
      alertService.checkForFatigue(session, onAlert);
      expect(onAlert).toHaveBeenCalledTimes(1);

      // Second alert within cooldown (3 min) should not trigger
      vi.advanceTimersByTime(60000); // 1 minute later
      alertService.checkForFatigue(session, onAlert);
      expect(onAlert).toHaveBeenCalledTimes(1);

      // After 3 minutes, should trigger again
      vi.advanceTimersByTime(120000); // 2 more minutes (total 3 min)
      alertService.checkForFatigue(session, onAlert);
      expect(onAlert).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('uses 3-minute rolling window average for blink rate', () => {
      const now = Date.now();

      // Create a session with high early rates but low recent rates
      // Points outside the 3-min window should be ignored
      const mixedHistory = [
        { timestamp: now - 240000, rate: 15 }, // 4 min ago (outside window)
        { timestamp: now - 200000, rate: 15 }, // ~3.3 min ago (outside window)
        { timestamp: now - 150000, rate: 6 },  // 2.5 min ago (inside window)
        { timestamp: now - 90000, rate: 6 },   // 1.5 min ago (inside window)
        { timestamp: now - 30000, rate: 6 },   // 30 sec ago (inside window)
      ];

      const session = createMockSession({
        averageBlinkRate: 9.6, // Session average is above threshold
        blinkRateHistory: mixedHistory,
      });
      const onAlert = vi.fn();

      // Should trigger alert based on rolling window (avg 6), not session average
      const result = alertService.checkForFatigue(session, onAlert);
      expect(result).toBe(true);
      expect(onAlert).toHaveBeenCalled();
    });

    it('sends notification with correct content', async () => {
      const now = Date.now();
      const session = createMockSession({ blinkRateHistory: createBlinkRateHistory(6, now) });

      alertService.checkForFatigue(session);

      // Wait for async showNotification to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockNotification).toHaveBeenCalledWith(
        'Time for a break?',
        expect.objectContaining({
          body: expect.stringContaining('Your blink rate (6/min) suggests your eyes could use a rest'),
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'fatigue-alert',
          requireInteraction: true,
        })
      );
    });
  });

  describe('requestNotificationPermission', () => {
    it('returns true when permission is already granted', async () => {
      mockNotification.permission = 'granted';
      const result = await alertService.requestNotificationPermission();
      expect(result).toBe(true);
    });

    it('requests permission when not yet granted', async () => {
      mockNotification.permission = 'default';
      mockNotification.requestPermission.mockResolvedValue('granted');

      const result = await alertService.requestNotificationPermission();

      expect(mockNotification.requestPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('returns false when permission is denied', async () => {
      mockNotification.permission = 'denied';
      const result = await alertService.requestNotificationPermission();
      expect(result).toBe(false);
    });
  });

  describe('startMonitoring', () => {
    it('starts checking for fatigue periodically', () => {
      vi.useFakeTimers();
      const now = Date.now();
      const getActiveSession = vi.fn(() => createMockSession({ blinkRateHistory: createBlinkRateHistory(6, now) }));
      const onAlert = vi.fn();

      alertService.startMonitoring(getActiveSession, onAlert);

      // Should check immediately and alert (conditions met)
      expect(getActiveSession).toHaveBeenCalledTimes(1);
      expect(onAlert).toHaveBeenCalledTimes(1);

      // Should check again after 1 minute but cooldown prevents alert
      vi.advanceTimersByTime(60000);
      expect(getActiveSession).toHaveBeenCalledTimes(2);
      expect(onAlert).toHaveBeenCalledTimes(1); // Still 1 due to cooldown

      // After 3 minutes total (past cooldown), should alert again
      vi.advanceTimersByTime(120000);
      expect(getActiveSession).toHaveBeenCalledTimes(4); // 3 more checks
      expect(onAlert).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('stopMonitoring', () => {
    it('stops the monitoring interval', () => {
      vi.useFakeTimers();
      const getActiveSession = vi.fn(() => createMockSession());

      alertService.startMonitoring(getActiveSession);
      alertService.stopMonitoring();

      // Advance time and verify no more checks
      vi.advanceTimersByTime(120000);
      expect(getActiveSession).toHaveBeenCalledTimes(1); // Only initial check

      vi.useRealTimers();
    });
  });
});
