/**
 * Authentication Service
 *
 * Core authentication operations with Supabase
 * Follows CalibrationService pattern with static methods
 */

import type { User, Session, AuthResult, OTPSendResult, DevUser } from './auth-types';
import { getSupabaseClient } from './supabase-client';
import { mapSupabaseError, createAuthError } from './auth-errors';
import { AuthStorageService } from './auth-storage-service';

/**
 * Authentication Service
 *
 * Static methods for all auth operations
 */
export class AuthService {
  /**
   * Check if development bypass is enabled
   */
  static isDevelopmentBypass(): boolean {
    if (typeof window === 'undefined') return false;
    return process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === 'true';
  }

  /**
   * Get development user for bypass mode
   */
  static getDevelopmentUser(): DevUser {
    const email = process.env.NEXT_PUBLIC_DEV_AUTH_EMAIL || 'dev@eyerhythm.local';
    return {
      id: 'dev-user',
      email,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Send OTP code to email
   */
  static async sendOTP(email: string): Promise<AuthResult<OTPSendResult>> {
    // Validate email format
    if (!email || !email.trim()) {
      return {
        success: false,
        error: createAuthError('INVALID_EMAIL', 'Email is required'),
      };
    }

    // Basic email validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      return {
        success: false,
        error: createAuthError('INVALID_EMAIL', 'Invalid email format'),
      };
    }

    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: true, // Create user if doesn't exist
        },
      });

      if (error) {
        return {
          success: false,
          error: mapSupabaseError(error),
        };
      }

      return {
        success: true,
        data: {
          email,
          sentAt: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: mapSupabaseError(error),
      };
    }
  }

  /**
   * Verify OTP code and create session
   */
  static async verifyOTP(email: string, token: string): Promise<AuthResult<Session>> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        return {
          success: false,
          error: mapSupabaseError(error),
        };
      }

      if (!data.session || !data.user) {
        return {
          success: false,
          error: createAuthError('UNKNOWN', 'No session returned from verification'),
        };
      }

      // Create our session format
      const session: Session = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || 0,
        user: {
          id: data.user.id,
          email: data.user.email || email,
          created_at: data.user.created_at,
        },
      };

      // Persist session
      await AuthStorageService.saveSession(session);

      return {
        success: true,
        data: session,
      };
    } catch (error) {
      return {
        success: false,
        error: mapSupabaseError(error),
      };
    }
  }

  /**
   * Get current session from Supabase
   */
  static async getSession(): Promise<AuthResult<Session | null>> {
    try {
      // Check development bypass first
      if (this.isDevelopmentBypass()) {
        const devUser = this.getDevelopmentUser();
        return {
          success: true,
          data: {
            access_token: 'dev-token',
            refresh_token: 'dev-refresh-token',
            expires_at: Date.now() + 1000 * 60 * 60 * 24, // 24 hours
            user: devUser,
          },
        };
      }

      // Try to restore from storage first
      const storedSession = await AuthStorageService.getSession();
      if (!storedSession) {
        return { success: true, data: null };
      }

      const supabase = getSupabaseClient();

      // Set the session in Supabase client
      const { data, error } = await supabase.auth.setSession({
        access_token: storedSession.access_token,
        refresh_token: storedSession.refresh_token,
      });

      if (error) {
        // Session is invalid, clear storage
        await AuthStorageService.clearSession();
        return {
          success: false,
          error: mapSupabaseError(error),
        };
      }

      if (!data.session) {
        // No session, clear storage
        await AuthStorageService.clearSession();
        return { success: true, data: null };
      }

      // Update session with potentially refreshed token
      const session: Session = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || 0,
        user: {
          id: data.session.user.id,
          email: data.session.user.email || '',
          created_at: data.session.user.created_at,
        },
      };

      // Save refreshed session
      await AuthStorageService.saveSession(session);

      return {
        success: true,
        data: session,
      };
    } catch (error) {
      return {
        success: false,
        error: mapSupabaseError(error),
      };
    }
  }

  /**
   * Refresh current session
   */
  static async refreshSession(): Promise<AuthResult<Session>> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        return {
          success: false,
          error: mapSupabaseError(error),
        };
      }

      if (!data.session) {
        return {
          success: false,
          error: createAuthError('SESSION_EXPIRED', 'Session refresh failed'),
        };
      }

      const session: Session = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || 0,
        user: {
          id: data.session.user.id,
          email: data.session.user.email || '',
          created_at: data.session.user.created_at,
        },
      };

      // Save refreshed session
      await AuthStorageService.saveSession(session);

      return {
        success: true,
        data: session,
      };
    } catch (error) {
      return {
        success: false,
        error: mapSupabaseError(error),
      };
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      // Check development bypass
      if (this.isDevelopmentBypass()) {
        return this.getDevelopmentUser();
      }

      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        return null;
      }

      return {
        id: data.user.id,
        email: data.user.email || '',
        created_at: data.user.created_at,
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Sign out user
   */
  static async signOut(): Promise<AuthResult<void>> {
    try {
      // Clear storage first
      await AuthStorageService.clearSession();

      // Skip Supabase signout in dev mode
      if (this.isDevelopmentBypass()) {
        return { success: true, data: undefined };
      }

      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: mapSupabaseError(error),
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: mapSupabaseError(error),
      };
    }
  }

  /**
   * Subscribe to auth state changes
   */
  static onAuthStateChange(
    callback: (session: Session | null) => void
  ): () => void {
    const supabase = getSupabaseClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      if (event === 'SIGNED_OUT') {
        await AuthStorageService.clearSession();
        callback(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (supabaseSession) {
          const session: Session = {
            access_token: supabaseSession.access_token,
            refresh_token: supabaseSession.refresh_token,
            expires_at: supabaseSession.expires_at || 0,
            user: {
              id: supabaseSession.user.id,
              email: supabaseSession.user.email || '',
              created_at: supabaseSession.user.created_at,
            },
          };
          await AuthStorageService.saveSession(session);
          callback(session);
        }
      }
    });

    // Return cleanup function
    return () => {
      subscription.unsubscribe();
    };
  }
}
