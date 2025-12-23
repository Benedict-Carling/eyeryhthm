"use client";

/**
 * Authentication Context
 *
 * Manages authentication state and provides auth operations
 * Follows SessionContext pattern with state management and persistence
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { User, Session, AuthError } from "../lib/auth/auth-types";
import { AuthService } from "../lib/auth/auth-service";
import { getUserErrorMessage } from "../lib/auth/auth-errors";
import { SupabaseSyncService } from "../lib/sync";
import { SessionStorageService } from "../lib/sessions/session-storage-service";
import { CalibrationService } from "../lib/calibration/calibration-service";

/**
 * Auth state type
 */
type AuthState = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Auth context interface
 */
interface AuthContextType {
  // Auth state
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authState: AuthState;
  error: AuthError | null;

  // Auth operations
  sendOTP: (email: string) => Promise<{ success: boolean; error?: AuthError }>;
  verifyOTP: (email: string, token: string) => Promise<{ success: boolean; error?: AuthError }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;

  // Dev mode
  isDevelopmentMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [error, setError] = useState<AuthError | null>(null);

  // Refs for stable references
  const userRef = useRef<User | null>(null);
  const sessionRef = useRef<Session | null>(null);

  // Update refs when state changes
  useEffect(() => {
    userRef.current = user;
    sessionRef.current = session;
  }, [user, session]);

  // Check if dev bypass is enabled
  const isDevelopmentMode = AuthService.isDevelopmentBypass();

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      setAuthState('loading');

      try {
        // Check for existing session
        const result = await AuthService.getSession();

        if (result.success && result.data) {
          setSession(result.data);
          setUser(result.data.user);
          setAuthState('authenticated');

          // Trigger initial data migration on first auth load
          const hasMigrated = localStorage.getItem('eyerhythm_data_migrated');
          if (!hasMigrated) {
            console.log('[AuthContext] Starting initial data migration to Supabase...');
            const localSessions = SessionStorageService.getAllSessions();
            const localCalibrations = CalibrationService.getAllCalibrations();

            const migrationResult = await SupabaseSyncService.migrateLocalData(
              result.data.user.id,
              localSessions,
              localCalibrations
            ).catch(err => {
              console.error('[AuthContext] Migration failed:', err);
              return { success: false, error: err };
            });

            // Only set migration flag if successful
            if (migrationResult.success) {
              localStorage.setItem('eyerhythm_data_migrated', 'true');
              console.log('[AuthContext] Migration complete');
            }
          }
        } else {
          setSession(null);
          setUser(null);
          setAuthState('unauthenticated');

          // Log error if session check failed
          if (!result.success) {
            console.error('Session initialization error:', result.error);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setSession(null);
        setUser(null);
        setAuthState('unauthenticated');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Subscribe to auth state changes
   */
  useEffect(() => {
    // Skip subscription in dev mode
    if (isDevelopmentMode) return;

    let isMounted = true;

    const unsubscribe = AuthService.onAuthStateChange((newSession) => {
      if (!isMounted) return;

      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        setAuthState('authenticated');
      } else {
        setSession(null);
        setUser(null);
        setAuthState('unauthenticated');
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isDevelopmentMode]);

  /**
   * Background queue processor
   * Retries failed sync operations every minute
   */
  useEffect(() => {
    // Only run when authenticated
    if (!user?.id) return;

    // Process queue immediately on mount
    SupabaseSyncService.processRetryQueue().catch(err => {
      console.error('[AuthContext] Queue processing error:', err);
    });

    // Then process every minute
    const interval = setInterval(() => {
      SupabaseSyncService.processRetryQueue().catch(err => {
        console.error('[AuthContext] Queue processing error:', err);
      });
    }, 60000); // Every 60 seconds

    return () => clearInterval(interval);
  }, [user]);

  /**
   * Send OTP to email
   */
  const sendOTP = useCallback(async (email: string) => {
    setError(null);

    try {
      const result = await AuthService.sendOTP(email);

      if (!result.success) {
        setError(result.error);
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (err) {
      const authError: AuthError = {
        code: 'UNKNOWN',
        message: 'Failed to send verification code',
        details: err,
      };
      setError(authError);
      return { success: false, error: authError };
    }
  }, []);

  /**
   * Verify OTP code
   */
  const verifyOTP = useCallback(async (email: string, token: string) => {
    setError(null);
    setAuthState('loading');

    try {
      const result = await AuthService.verifyOTP(email, token);

      if (!result.success) {
        setError(result.error);
        setAuthState('unauthenticated');
        return { success: false, error: result.error };
      }

      // Set session and user
      setSession(result.data);
      setUser(result.data.user);
      setAuthState('authenticated');

      return { success: true };
    } catch (err) {
      const authError: AuthError = {
        code: 'UNKNOWN',
        message: 'Failed to verify code',
        details: err,
      };
      setError(authError);
      setAuthState('unauthenticated');
      return { success: false, error: authError };
    }
  }, []);

  /**
   * Sign out user
   */
  const signOut = useCallback(async () => {
    setError(null);
    setAuthState('loading');

    try {
      await AuthService.signOut();

      // Clear state
      setSession(null);
      setUser(null);
      setAuthState('unauthenticated');
    } catch (err) {
      console.error('Sign out error:', err);
      // Still clear local state even if API call fails
      setSession(null);
      setUser(null);
      setAuthState('unauthenticated');
    }
  }, []);

  /**
   * Refresh session
   */
  const refreshSession = useCallback(async () => {
    try {
      const result = await AuthService.refreshSession();

      if (result.success) {
        setSession(result.data);
        setUser(result.data.user);
        setAuthState('authenticated');
      } else {
        console.error('Session refresh failed:', result.error);
        // Clear session on refresh failure
        setSession(null);
        setUser(null);
        setAuthState('unauthenticated');
      }
    } catch (err) {
      console.error('Session refresh error:', err);
      setSession(null);
      setUser(null);
      setAuthState('unauthenticated');
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const isAuthenticated = authState === 'authenticated' && user !== null;

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated,
    authState,
    error,
    sendOTP,
    verifyOTP,
    signOut,
    refreshSession,
    clearError,
    isDevelopmentMode,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
