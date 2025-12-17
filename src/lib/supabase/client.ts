import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Check if Supabase credentials are configured
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton instance for client-side usage
let clientInstance: SupabaseClient<Database> | null | undefined = undefined;

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (typeof window === "undefined") {
    // Server-side: always create a new instance
    return createClient();
  }

  // Client-side: reuse instance (undefined means not initialized)
  if (clientInstance === undefined) {
    clientInstance = createClient();
  }
  return clientInstance;
}
