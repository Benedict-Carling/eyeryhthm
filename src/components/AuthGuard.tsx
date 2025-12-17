"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Box, Flex, Spinner, Text } from "@radix-ui/themes";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase/client";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Client-side authentication guard for protected routes.
 *
 * This component is necessary for Electron builds where Next.js middleware
 * doesn't run (static export). It redirects unauthenticated users to /login.
 *
 * For the web version, middleware handles this server-side, but this guard
 * provides a consistent experience and acts as a fallback.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Pages that don't require authentication
  const isPublicPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/pricing");

  useEffect(() => {
    // Skip if Supabase is not configured (dev/test environment without auth)
    if (!isSupabaseConfigured()) {
      return;
    }

    // Skip if still loading or on a public page
    if (loading || isPublicPage) {
      return;
    }

    // Redirect to login if not authenticated
    if (!user) {
      // Use window.location for Electron to ensure clean navigation
      window.location.href = "/login";
    }
  }, [user, loading, isPublicPage, router]);

  // If Supabase is not configured, render children without auth check
  if (!isSupabaseConfigured()) {
    return <>{children}</>;
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Flex direction="column" align="center" gap="3">
          <Spinner size="3" />
          <Text color="gray" size="2">
            Loading...
          </Text>
        </Flex>
      </Box>
    );
  }

  // On protected pages, don't render until we confirm authentication
  if (!isPublicPage && !user) {
    // Return loading state while redirect happens
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Flex direction="column" align="center" gap="3">
          <Spinner size="3" />
          <Text color="gray" size="2">
            Redirecting to login...
          </Text>
        </Flex>
      </Box>
    );
  }

  return <>{children}</>;
}
