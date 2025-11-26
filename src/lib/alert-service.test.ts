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

  const createMockSession = (overrides?: Partial<SessionData>): SessionData => ({
    id: 'test-session',
    startTime: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
    isActive: true,
    averageBlinkRate: 7,
    blinkRateHistory: [],
    quality: 'poor',
    fatigueAlertCount: 0,
    totalBlinks: 42,
    ...overrides,
  });

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

    it('returns false when session duration is less than 5 minutes', () => {
      const session = createMockSession({ 
        startTime: new Date(Date.now() - 4 * 60 * 1000) // 4 minutes ago
      });
      const result = alertService.checkForFatigue(session);
      expect(result).toBe(false);
    });

    it('returns false when blink rate is above threshold', () => {
      const session = createMockSession({ averageBlinkRate: 10 });
      const result = alertService.checkForFatigue(session);
      expect(result).toBe(false);
    });

    it('returns true and triggers notification when blink rate is below threshold', async () => {
      const session = createMockSession({ averageBlinkRate: 6 });
      const onAlert = vi.fn();
      
      const result = alertService.checkForFatigue(session, onAlert);
      
      expect(result).toBe(true);
      expect(onAlert).toHaveBeenCalled();
      
      // Wait for async showNotification to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockNotification).toHaveBeenCalledWith(
        'Fatigue Alert',
        {
          body: 'Your blink rate has dropped to 6 blinks/min. Consider taking a break.',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'fatigue-alert',
          requireInteraction: true,
        }
      );
    });

    it('respects cooldown period between alerts', () => {
      const session = createMockSession({ averageBlinkRate: 6 });
      const onAlert = vi.fn();
      
      // First alert should trigger
      alertService.checkForFatigue(session, onAlert);
      expect(onAlert).toHaveBeenCalledTimes(1);
      
      // Second alert within cooldown should not trigger
      alertService.checkForFatigue(session, onAlert);
      expect(onAlert).toHaveBeenCalledTimes(1);
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
      const getActiveSession = vi.fn(() => createMockSession({ averageBlinkRate: 6 }));
      const onAlert = vi.fn();
      
      alertService.startMonitoring(getActiveSession, onAlert);
      
      // Should check immediately
      expect(onAlert).toHaveBeenCalledTimes(1);
      
      // Should check again after 1 minute
      vi.advanceTimersByTime(60000);
      expect(getActiveSession).toHaveBeenCalledTimes(2);
      
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