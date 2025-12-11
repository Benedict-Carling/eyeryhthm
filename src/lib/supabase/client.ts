import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton instance for client-side usage
let clientInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (typeof window === "undefined") {
    // Server-side: always create a new instance
    return createClient();
  }

  // Client-side: reuse instance
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}
