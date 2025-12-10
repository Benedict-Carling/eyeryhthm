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

  // Helper to create blink events within the 3-minute rolling window
  // Rate is blinks per minute, so for a 3-minute window we need rate * 3 events
  const createBlinkEvents = (rate: number, now: number = Date.now()) => {
    const events = [];
    const windowMs = 3 * 60 * 1000; // 3 minutes
    const totalBlinks = Math.round(rate * 3); // rate per minute * 3 minutes
    const interval = windowMs / totalBlinks;

    for (let i = 0; i < totalBlinks; i++) {
      events.push({ timestamp: now - (windowMs - i * interval) });
    }
    return events;
  };

  const createMockSession = (overrides?: Partial<SessionData>): SessionData => {
    const now = Date.now();
    return {
      id: 'test-session',
      startTime: new Date(now - 6 * 60 * 1000), // 6 minutes ago (past 5-min grace period)
      isActive: true,
      averageBlinkRate: 7,
      blinkEvents: createBlinkEvents(7, now),
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
      const session = createMockSession({ blinkEvents: createBlinkEvents(10, now) });
      const result = alertService.checkForFatigue(session);
      expect(result).toBe(false);
    });

    it('returns false when blinkEvents is empty', () => {
      const session = createMockSession({ blinkEvents: [] });
      const result = alertService.checkForFatigue(session);
      expect(result).toBe(false);
    });

    it('returns true immediately when all conditions are met', () => {
      const now = Date.now();
      const session = createMockSession({ blinkEvents: createBlinkEvents(6, now) });
      const onAlert = vi.fn();

      const result = alertService.checkForFatigue(session, onAlert);

      expect(result).toBe(true);
      expect(onAlert).toHaveBeenCalled();
    });

    it('returns false when face loss in window exceeds 5 seconds', () => {
      const now = Date.now();
      const session = createMockSession({
        blinkEvents: createBlinkEvents(6, now),
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
        blinkEvents: createBlinkEvents(6, now),
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
        blinkEvents: createBlinkEvents(6, now),
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
      const session = createMockSession({ blinkEvents: createBlinkEvents(6, now) });
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

    it('uses 3-minute rolling window for blink rate calculation', () => {
      const now = Date.now();

      // Create events with some outside the 3-min window (should be ignored)
      // and some inside (should trigger alert at rate 6/min)
      const mixedEvents = [
        // These are outside the 3-min window (should be ignored)
        { timestamp: now - 240000 }, // 4 min ago
        { timestamp: now - 220000 }, // ~3.7 min ago
        // These are inside the 3-min window - 18 events = 6/min rate
        ...Array.from({ length: 18 }, (_, i) => ({
          timestamp: now - 170000 + i * 10000
        }))
      ];

      const session = createMockSession({
        averageBlinkRate: 9.6, // Session average is above threshold
        blinkEvents: mixedEvents,
      });
      const onAlert = vi.fn();

      // Should trigger alert based on rolling window, not session average
      const result = alertService.checkForFatigue(session, onAlert);
      expect(result).toBe(true);
      expect(onAlert).toHaveBeenCalled();
    });

    it('sends notification with correct content', async () => {
      const now = Date.now();
      const session = createMockSession({ blinkEvents: createBlinkEvents(6, now) });

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
      const getActiveSession = vi.fn(() => createMockSession({ blinkEvents: createBlinkEvents(6, now) }));
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
