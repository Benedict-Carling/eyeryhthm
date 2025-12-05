import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionStorageService } from './session-storage-service';
import { SessionData } from './types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const createMockSession = (overrides: Partial<SessionData> = {}): SessionData => ({
  id: `session-${Date.now()}-${Math.random()}`,
  startTime: new Date(),
  endTime: new Date(),
  isActive: false,
  averageBlinkRate: 12,
  blinkRateHistory: [],
  quality: 'good',
  fatigueAlertCount: 0,
  duration: 120, // 2 minutes - above minimum
  totalBlinks: 24,
  ...overrides,
});

describe('SessionStorageService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('saveSession', () => {
    it('saves a completed session to localStorage', () => {
      const session = createMockSession();
      const result = SessionStorageService.saveSession(session);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('does not save active sessions', () => {
      const session = createMockSession({ isActive: true });
      const result = SessionStorageService.saveSession(session);

      expect(result).toBe(false);
    });

    it('does not save sessions shorter than 60 seconds', () => {
      const session = createMockSession({ duration: 30 });
      const result = SessionStorageService.saveSession(session);

      expect(result).toBe(false);
    });

    it('does not save example sessions', () => {
      const session = createMockSession({ isExample: true });
      const result = SessionStorageService.saveSession(session);

      expect(result).toBe(false);
    });

    it('enforces max 100 sessions limit', () => {
      // Save 101 sessions
      for (let i = 0; i < 101; i++) {
        const session = createMockSession({
          id: `session-${i}`,
          startTime: new Date(Date.now() - i * 1000), // Older sessions have earlier times
        });
        SessionStorageService.saveSession(session);
      }

      const sessions = SessionStorageService.getAllSessions();
      expect(sessions.length).toBe(100);
    });

    it('keeps most recent sessions when enforcing limit', () => {
      // Save 101 sessions with distinct times
      for (let i = 100; i >= 0; i--) {
        const session = createMockSession({
          id: `session-${i}`,
          startTime: new Date(Date.now() - i * 60000), // session-0 is most recent
        });
        SessionStorageService.saveSession(session);
      }

      const sessions = SessionStorageService.getAllSessions();
      // session-0 should be present (most recent)
      expect(sessions.some(s => s.id === 'session-0')).toBe(true);
      // session-100 should be removed (oldest)
      expect(sessions.some(s => s.id === 'session-100')).toBe(false);
    });
  });

  describe('getAllSessions', () => {
    it('returns empty array when no sessions exist', () => {
      const sessions = SessionStorageService.getAllSessions();
      expect(sessions).toEqual([]);
    });

    it('parses dates correctly from stored sessions', () => {
      const now = new Date();
      const session = createMockSession({
        startTime: now,
        endTime: now,
      });
      SessionStorageService.saveSession(session);

      const sessions = SessionStorageService.getAllSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.startTime).toBeInstanceOf(Date);
      expect(sessions[0]?.endTime).toBeInstanceOf(Date);
    });
  });

  describe('deleteSession', () => {
    it('removes a session by id', () => {
      const session1 = createMockSession({ id: 'session-1' });
      const session2 = createMockSession({ id: 'session-2' });

      SessionStorageService.saveSession(session1);
      SessionStorageService.saveSession(session2);

      SessionStorageService.deleteSession('session-1');

      const sessions = SessionStorageService.getAllSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.id).toBe('session-2');
    });
  });

  describe('hasPersistedSessions', () => {
    it('returns false when no sessions exist', () => {
      expect(SessionStorageService.hasPersistedSessions()).toBe(false);
    });

    it('returns true when non-example sessions exist', () => {
      const session = createMockSession();
      SessionStorageService.saveSession(session);

      expect(SessionStorageService.hasPersistedSessions()).toBe(true);
    });

    it('returns false when only example sessions exist', () => {
      // Manually set example session in storage (since saveSession blocks it)
      const exampleSession = createMockSession({ isExample: true });
      localStorageMock.setItem(
        'eyerhythm_sessions',
        JSON.stringify([{
          ...exampleSession,
          startTime: exampleSession.startTime.toISOString(),
          endTime: exampleSession.endTime?.toISOString(),
        }])
      );

      expect(SessionStorageService.hasPersistedSessions()).toBe(false);
    });
  });

  describe('clearAllSessions', () => {
    it('removes all sessions from localStorage', () => {
      const session = createMockSession();
      SessionStorageService.saveSession(session);

      SessionStorageService.clearAllSessions();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('eyerhythm_sessions');
      expect(SessionStorageService.getAllSessions()).toEqual([]);
    });
  });
});
