"use client";

import { Theme, Box } from "@radix-ui/themes";
import { useTheme } from "../contexts/ThemeContext";
import { Navbar } from "../components/Navbar";
import { FeedbackButton } from "../components/FeedbackButton";
import { usePathname } from "next/navigation";

const AUTH_PAGES = ["/login", "/signup", "/auth"];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));

  return (
    <Theme appearance={resolvedTheme} accentColor="indigo" grayColor="mauve">
      {!isAuthPage && <Navbar />}
      <Box key={pathname} className="page-transition-wrapper">
        {children}
      </Box>
      {!isAuthPage && <FeedbackButton />}
    </Theme>
  );
}