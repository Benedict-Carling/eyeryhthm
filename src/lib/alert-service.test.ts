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

  // Helper to create blink rate history with recent points
  const createBlinkRateHistory = (rate: number, now: number = Date.now()) => {
    // Create points spanning the last 2 minutes (moving window duration)
    return [
      { timestamp: now - 90000, rate }, // 1.5 min ago
      { timestamp: now - 60000, rate }, // 1 min ago
      { timestamp: now - 30000, rate }, // 30 sec ago
      { timestamp: now - 5000, rate },  // 5 sec ago
    ];
  };

  const createMockSession = (overrides?: Partial<SessionData>): SessionData => {
    const now = Date.now();
    return {
      id: 'test-session',
      startTime: new Date(now - 6 * 60 * 1000), // 6 minutes ago
      isActive: true,
      averageBlinkRate: 7,
      blinkRateHistory: createBlinkRateHistory(7, now),
      quality: 'poor',
      fatigueAlertCount: 0,
      totalBlinks: 42,
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

    it('returns false when session duration is less than 3 minutes', () => {
      const session = createMockSession({
        startTime: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
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

    it('returns false on first check when blink rate is below threshold (needs sustained period)', () => {
      const now = Date.now();
      const session = createMockSession({ blinkRateHistory: createBlinkRateHistory(6, now) });
      const onAlert = vi.fn();

      // First check should return false (sustained threshold not met yet)
      const result = alertService.checkForFatigue(session, onAlert);

      expect(result).toBe(false);
      expect(onAlert).not.toHaveBeenCalled();
    });

    it('returns true and triggers notification after sustained period below threshold', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      const session = createMockSession({ blinkRateHistory: createBlinkRateHistory(6, now) });
      const onAlert = vi.fn();

      // First check starts the sustained threshold timer
      alertService.checkForFatigue(session, onAlert);
      expect(onAlert).not.toHaveBeenCalled();

      // Advance time by 30 seconds (sustained threshold duration)
      vi.advanceTimersByTime(30000);

      // Second check after sustained period should trigger
      const result = alertService.checkForFatigue(session, onAlert);

      expect(result).toBe(true);
      expect(onAlert).toHaveBeenCalled();

      // Wait for async showNotification to complete
      vi.useRealTimers();
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

    it('resets sustained threshold timer when blink rate recovers', () => {
      vi.useFakeTimers();
      const now = Date.now();
      const sessionLowRate = createMockSession({ blinkRateHistory: createBlinkRateHistory(6, now) });
      const sessionHighRate = createMockSession({ blinkRateHistory: createBlinkRateHistory(10, now) });
      const onAlert = vi.fn();

      // First check with low blink rate starts timer
      alertService.checkForFatigue(sessionLowRate, onAlert);

      // Advance time by 15 seconds
      vi.advanceTimersByTime(15000);

      // Blink rate recovers - should reset the timer
      alertService.checkForFatigue(sessionHighRate, onAlert);

      // Advance time by another 20 seconds
      vi.advanceTimersByTime(20000);

      // Check with low rate again - should not trigger (timer was reset)
      const result = alertService.checkForFatigue(sessionLowRate, onAlert);

      expect(result).toBe(false);
      expect(onAlert).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('respects cooldown period between alerts', () => {
      vi.useFakeTimers();
      const now = Date.now();
      const session = createMockSession({ blinkRateHistory: createBlinkRateHistory(6, now) });
      const onAlert = vi.fn();

      // First check starts sustained threshold timer
      alertService.checkForFatigue(session, onAlert);

      // Advance past sustained threshold (30 seconds)
      vi.advanceTimersByTime(30000);

      // First alert should trigger
      alertService.checkForFatigue(session, onAlert);
      expect(onAlert).toHaveBeenCalledTimes(1);

      // Second alert within cooldown (5 min) should not trigger
      vi.advanceTimersByTime(60000); // 1 minute later
      alertService.checkForFatigue(session, onAlert);
      expect(onAlert).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('uses moving window average instead of session average', () => {
      vi.useFakeTimers();
      const now = Date.now();

      // Create a session with high early rates but low recent rates
      // The session average would be (12+12+12+6+6+6)/6 = 9 (above threshold of 8)
      // But the moving window (last 2 min) average should be 6 (below threshold)
      const mixedHistory = [
        { timestamp: now - 180000, rate: 12 }, // 3 min ago (outside window)
        { timestamp: now - 150000, rate: 12 }, // 2.5 min ago (outside window)
        { timestamp: now - 130000, rate: 12 }, // ~2.2 min ago (outside window)
        { timestamp: now - 90000, rate: 6 },   // 1.5 min ago (inside window)
        { timestamp: now - 60000, rate: 6 },   // 1 min ago (inside window)
        { timestamp: now - 30000, rate: 6 },   // 30 sec ago (inside window)
      ];

      const session = createMockSession({
        averageBlinkRate: 9, // Session average is above threshold
        blinkRateHistory: mixedHistory,
      });
      const onAlert = vi.fn();

      // First check should start sustained timer (moving window shows fatigue)
      alertService.checkForFatigue(session, onAlert);

      // Advance past sustained threshold
      vi.advanceTimersByTime(30000);

      // Should trigger alert based on moving window, not session average
      const result = alertService.checkForFatigue(session, onAlert);
      expect(result).toBe(true);
      expect(onAlert).toHaveBeenCalled();

      vi.useRealTimers();
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

      // Should check immediately (but won't alert - sustained threshold not met)
      expect(getActiveSession).toHaveBeenCalledTimes(1);
      expect(onAlert).not.toHaveBeenCalled();

      // Should check again after 1 minute
      vi.advanceTimersByTime(60000);
      expect(getActiveSession).toHaveBeenCalledTimes(2);

      // After 1 minute (60 seconds > 30 second sustained threshold), alert should trigger
      expect(onAlert).toHaveBeenCalledTimes(1);

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