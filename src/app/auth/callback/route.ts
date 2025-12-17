import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Allow static export for Electron builds (this route is only used in web mode)
export const dynamic = "force-static";

export async function GET(request: Request) {
  // In static export mode (Electron), this route generates a static placeholder
  // The actual OAuth flow in Electron uses deep links instead
  const isStaticExport = process.env.ELECTRON_BUILD === "true";
  if (isStaticExport) {
    return new Response("OAuth callback - use deep links in Electron", {
      status: 200,
    });
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Validate the next parameter to prevent open redirect attacks
  // Only allow relative paths that start with / and don't contain protocol indicators
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.includes("://")
      ? next
      : "/";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}
