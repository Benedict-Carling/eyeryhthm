/**
 * Authentication Types
 *
 * Core TypeScript types for authentication system
 */

import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';

// Re-export Supabase types for convenience
export type { SupabaseUser, SupabaseSession };

/**
 * Simplified user type for application use
 */
export interface User {
  id: string;
  email: string;
  created_at?: string;
}

/**
 * Session type wrapping Supabase session
 */
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

/**
 * Auth result type for operations
 */
export type AuthResult<T> =
  | { success: true; data: T }
  | { success: false; error: AuthError };

/**
 * Authentication error codes
 */
export type AuthErrorCode =
  | 'NETWORK_ERROR'           // Network failure
  | 'INVALID_EMAIL'           // Email format invalid
  | 'INVALID_OTP'             // OTP code wrong
  | 'EXPIRED_OTP'             // OTP expired (> 60 sec)
  | 'RATE_LIMIT'              // Too many attempts
  | 'SESSION_EXPIRED'         // Session refresh failed
  | 'USER_NOT_FOUND'          // User doesn't exist
  | 'UNKNOWN';                // Unexpected error

/**
 * Authentication error with typed error codes
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: unknown;
}

/**
 * OTP send result
 */
export interface OTPSendResult {
  email: string;
  sentAt: Date;
}

/**
 * Development mode user for bypass
 */
export interface DevUser extends User {
  id: 'dev-user';
  email: string;
  created_at: string;
}
