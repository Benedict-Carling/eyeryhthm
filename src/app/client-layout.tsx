"use client";

import { Theme, Box } from "@radix-ui/themes";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { Navbar } from "../components/Navbar";
import { FeedbackButton } from "../components/FeedbackButton";
import { LoginView } from "../components/auth/LoginView";
import { AuthLoading } from "../components/auth/AuthLoading";
import { usePathname } from "next/navigation";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const { isAuthenticated, isLoading, isDevelopmentMode } = useAuth();
  const pathname = usePathname();

  return (
    <Theme appearance={resolvedTheme} accentColor="indigo" grayColor="mauve">
      {/* Show loading only if we're checking auth AND not already authenticated */}
      {isLoading && !isAuthenticated && !isDevelopmentMode && (
        <Box style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AuthLoading message="Checking authentication..." />
        </Box>
      )}

      {/* Show login screen if auth check completed and user not authenticated */}
      {!isLoading && !isAuthenticated && !isDevelopmentMode && (
        <LoginView />
      )}

      {/* Show app if authenticated or dev mode */}
      {(isAuthenticated || isDevelopmentMode) && (
        <>
          <Navbar />
          <Box key={pathname} className="page-transition-wrapper">
            {children}
          </Box>
          <FeedbackButton />
        </>
      )}
    </Theme>
  );
}