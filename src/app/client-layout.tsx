"use client";

import { Theme, Box } from "@radix-ui/themes";
import { useTheme } from "../contexts/ThemeContext";
import { Navbar } from "../components/Navbar";
import { FeedbackButton } from "../components/FeedbackButton";
import { AuthGuard } from "../components/AuthGuard";
import { usePathname } from "next/navigation";

const AUTH_PAGES = ["/login", "/signup", "/auth"];
const HIDE_FEEDBACK_PAGES = ["/login", "/signup", "/auth", "/settings"];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));
  const hideFeedback = HIDE_FEEDBACK_PAGES.some((page) => pathname.startsWith(page));

  return (
    <Theme appearance={resolvedTheme} accentColor="indigo" grayColor="mauve">
      <AuthGuard>
        {!isAuthPage && <Navbar />}
        <Box key={pathname} className="page-transition-wrapper">
          {children}
        </Box>
        {!hideFeedback && <FeedbackButton />}
      </AuthGuard>
    </Theme>
  );
}