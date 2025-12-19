/**
 * Auth Storage Service
 *
 * Handles session persistence to localStorage (web) or Electron secure storage
 * Follows the pattern from SessionStorageService
 */

import type { Session, User } from './auth-types';
import { isElectron, getElectronAPI } from '../electron';

const SESSION_STORAGE_KEY = 'eyerhythm_auth_session';
const USER_STORAGE_KEY = 'eyerhythm_auth_user';

/**
 * Stored session format for serialization
 */
interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

/**
 * Auth Storage Service
 *
 * Static methods for session persistence
 */
export class AuthStorageService {
  /**
   * Save session to storage
   */
  static async saveSession(session: Session): Promise<void> {
    if (typeof window === 'undefined') return;

    const storedSession: StoredSession = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: session.user,
    };

    const sessionData = JSON.stringify(storedSession);

    // Check if running in Electron and use secure storage if available
    if (isElectron()) {
      const electronAPI = getElectronAPI();
      if (electronAPI?.secureStorage) {
        try {
          await electronAPI.secureStorage.set(SESSION_STORAGE_KEY, sessionData);
          return;
        } catch (error) {
          console.error('Electron secure storage failed, falling back to localStorage:', error);
          // Fall through to localStorage
        }
      }
    }

    // Web or Electron fallback: use localStorage
    localStorage.setItem(SESSION_STORAGE_KEY, sessionData);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
  }

  /**
   * Get session from storage
   */
  static async getSession(): Promise<Session | null> {
    if (typeof window === 'undefined') return null;

    try {
      let sessionData: string | null = null;

      // Try Electron secure storage first
      if (isElectron()) {
        const electronAPI = getElectronAPI();
        if (electronAPI?.secureStorage) {
          try {
            sessionData = await electronAPI.secureStorage.get(SESSION_STORAGE_KEY);
          } catch (error) {
            console.error('Electron secure storage read failed:', error);
          }
        }
      }

      // Fallback to localStorage
      if (!sessionData) {
        sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
      }

      if (!sessionData) return null;

      const parsed: StoredSession = JSON.parse(sessionData);

      // Validate session structure
      if (!parsed.access_token || !parsed.refresh_token || !parsed.user) {
        console.warn('Invalid session data found, clearing storage');
        await this.clearSession();
        return null;
      }

      return {
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
        expires_at: parsed.expires_at,
        user: parsed.user,
      };
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  }

  /**
   * Get user from storage (faster than full session)
   */
  static async getUser(): Promise<User | null> {
    if (typeof window === 'undefined') return null;

    try {
      const userData = localStorage.getItem(USER_STORAGE_KEY);
      if (!userData) return null;

      return JSON.parse(userData);
    } catch (error) {
      console.error('Error loading user:', error);
      return null;
    }
  }

  /**
   * Clear session from storage
   */
  static async clearSession(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Clear from Electron secure storage
    if (isElectron()) {
      const electronAPI = getElectronAPI();
      if (electronAPI?.secureStorage) {
        try {
          await electronAPI.secureStorage.delete(SESSION_STORAGE_KEY);
        } catch (error) {
          console.error('Electron secure storage delete failed:', error);
        }
      }
    }

    // Clear from localStorage
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  /**
   * Check if session exists in storage
   */
  static async hasSession(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Check Electron secure storage first
    if (isElectron()) {
      const electronAPI = getElectronAPI();
      if (electronAPI?.secureStorage) {
        try {
          const sessionData = await electronAPI.secureStorage.get(SESSION_STORAGE_KEY);
          if (sessionData) return true;
        } catch (error) {
          // Continue to localStorage check
        }
      }
    }

    // Check localStorage
    return localStorage.getItem(SESSION_STORAGE_KEY) !== null;
  }
}
