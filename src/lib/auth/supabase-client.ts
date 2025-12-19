/**
 * Supabase Client
 *
 * Singleton Supabase client for authentication operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 *
 * Uses singleton pattern to ensure only one client exists
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  // Validate URL format
  if (!url.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must start with https://');
  }

  if (!url.includes('.supabase.co')) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase project URL (e.g., https://your-project.supabase.co)'
    );
  }

  // Validate anon key isn't the placeholder
  if (anonKey === 'your-anon-key-here' || anonKey.length < 20) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be invalid. Please use your actual Supabase anon key from the project settings.'
    );
  }

  supabaseClient = createClient(url, anonKey, {
    auth: {
      // We handle session persistence manually via AuthStorageService
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: false, // No OAuth redirects needed for OTP
      // Storage will be handled by our custom storage service
      storage: undefined,
    },
  });

  return supabaseClient;
}

/**
 * Reset client instance (useful for testing)
 */
export function resetSupabaseClient(): void {
  supabaseClient = null;
}
