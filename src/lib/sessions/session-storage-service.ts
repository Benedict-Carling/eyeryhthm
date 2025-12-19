import { SessionData, BlinkEvent } from './types';

const SESSIONS_STORAGE_KEY = 'eyerhythm_sessions';
const MAX_SESSIONS = 100;
const MIN_SESSION_DURATION_SECONDS = 60;

interface StoredSession {
  id: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
  averageBlinkRate: number;
  blinkEvents?: BlinkEvent[];
  quality: 'good' | 'fair' | 'poor';
  fatigueAlertCount: number;
  duration?: number;
  calibrationId?: string;
  totalBlinks: number;
  faceLostPeriods?: { start: number; end?: number }[];
  isExample?: boolean;
}

export class SessionStorageService {
  static getAllSessions(): SessionData[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (!stored) return [];

      const parsed: StoredSession[] = JSON.parse(stored);

      // Filter out legacy sessions without blinkEvents
      const validSessions = parsed.filter(
        (s) => s.blinkEvents && s.blinkEvents.length > 0
      );

      // Delete legacy sessions from storage if any were filtered out
      if (validSessions.length < parsed.length) {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(validSessions));
      }

      return validSessions.map((session) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : undefined,
        blinkEvents: session.blinkEvents ?? [],
      }));
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  }

  static saveSession(session: SessionData): boolean {
    if (typeof window === 'undefined') return false;

    // Don't save active sessions
    if (session.isActive) {
      console.warn('Cannot save active session');
      return false;
    }

    // Don't save sessions shorter than minimum duration
    const duration = session.duration ?? 0;
    if (duration < MIN_SESSION_DURATION_SECONDS) {
      console.log(`Session too short (${duration}s < ${MIN_SESSION_DURATION_SECONDS}s), not saving`);
      return false;
    }

    // Don't save example sessions
    if (session.isExample) {
      console.log('Not saving example session');
      return false;
    }

    try {
      const sessions = this.getAllSessions();

      // Check if session already exists (update case)
      const existingIndex = sessions.findIndex((s) => s.id === session.id);
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        // Add new session at the beginning (most recent first)
        sessions.unshift(session);
      }

      // Enforce max sessions limit - remove oldest sessions
      const trimmedSessions = this.enforceMaxSessions(sessions);

      this.persistSessions(trimmedSessions);
      return true;
    } catch (error) {
      console.error('Error saving session:', error);
      return false;
    }
  }

  static deleteSession(id: string): void {
    if (typeof window === 'undefined') return;

    try {
      const sessions = this.getAllSessions();
      const filtered = sessions.filter((s) => s.id !== id);
      this.persistSessions(filtered);
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  static clearAllSessions(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SESSIONS_STORAGE_KEY);
  }

  static hasPersistedSessions(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (!stored) return false;

      const parsed: StoredSession[] = JSON.parse(stored);
      // Only count non-example sessions with blinkEvents
      return parsed.some(
        (s) => !s.isExample && s.blinkEvents && s.blinkEvents.length > 0
      );
    } catch {
      return false;
    }
  }

  private static enforceMaxSessions(sessions: SessionData[]): SessionData[] {
    if (sessions.length <= MAX_SESSIONS) {
      return sessions;
    }

    // Sort by startTime descending (most recent first)
    const sorted = [...sessions].sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );

    // Keep only the most recent MAX_SESSIONS
    const trimmed = sorted.slice(0, MAX_SESSIONS);
    console.log(`Trimmed sessions from ${sessions.length} to ${trimmed.length}`);

    return trimmed;
  }

  private static persistSessions(sessions: SessionData[]): void {
    // Convert Date objects to ISO strings for storage
    const toStore: StoredSession[] = sessions.map((session) => ({
      ...session,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString(),
      blinkEvents: session.blinkEvents,
    }));

    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(toStore));
  }
}
