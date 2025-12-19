/**
 * Authentication Error Handling
 *
 * Comprehensive error handling with user-friendly messages
 */

import type { AuthError, AuthErrorCode } from './auth-types';
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js';

/**
 * Create an AuthError from a Supabase error
 */
export function createAuthError(
  code: AuthErrorCode,
  message: string,
  details?: unknown
): AuthError {
  return { code, message, details };
}

/**
 * Map Supabase error to our AuthError type
 */
export function mapSupabaseError(error: unknown): AuthError {
  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createAuthError(
      'NETWORK_ERROR',
      'Network error. Please check your connection.',
      error
    );
  }

  // Handle Supabase AuthError
  if (error && typeof error === 'object' && 'message' in error) {
    const supabaseError = error as SupabaseAuthError;
    const message = supabaseError.message || 'An unexpected error occurred';

    // Map specific Supabase error messages to our error codes
    if (message.includes('Invalid login credentials')) {
      return createAuthError('INVALID_OTP', 'Invalid verification code. Please try again.');
    }

    if (message.includes('Token has expired') || message.includes('expired')) {
      return createAuthError(
        'EXPIRED_OTP',
        'Verification code expired. Please request a new one.'
      );
    }

    if (message.includes('Email rate limit exceeded') || message.includes('rate limit')) {
      return createAuthError(
        'RATE_LIMIT',
        'Too many attempts. Please wait a few minutes and try again.'
      );
    }

    if (message.includes('Invalid email')) {
      return createAuthError('INVALID_EMAIL', 'Invalid email address.');
    }

    if (message.includes('User not found')) {
      return createAuthError('USER_NOT_FOUND', 'User not found.');
    }

    if (message.includes('session_expired') || message.includes('Session expired')) {
      return createAuthError(
        'SESSION_EXPIRED',
        'Your session has expired. Please sign in again.'
      );
    }

    // Generic Supabase error
    return createAuthError('UNKNOWN', message, error);
  }

  // Unknown error
  return createAuthError(
    'UNKNOWN',
    'An unexpected error occurred. Please try again.',
    error
  );
}

/**
 * Get user-friendly error message for display
 */
export function getUserErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Network error. Please check your connection and try again.';
    case 'INVALID_EMAIL':
      return 'Please enter a valid email address.';
    case 'INVALID_OTP':
      return 'Invalid verification code. Please check your email and try again.';
    case 'EXPIRED_OTP':
      return 'Verification code expired. Please request a new one.';
    case 'RATE_LIMIT':
      return 'Too many attempts. Please wait a few minutes before trying again.';
    case 'SESSION_EXPIRED':
      return 'Your session has expired. Please sign in again.';
    case 'USER_NOT_FOUND':
      return 'No account found with this email address.';
    case 'UNKNOWN':
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: AuthError): boolean {
  return error.code === 'NETWORK_ERROR';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: AuthError): boolean {
  return error.code === 'NETWORK_ERROR' || error.code === 'UNKNOWN';
}
