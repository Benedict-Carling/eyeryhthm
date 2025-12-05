"use client";

import { Theme, Box } from "@radix-ui/themes";
import { useTheme } from "../contexts/ThemeContext";
import { Navbar } from "../components/Navbar";
import { usePathname } from "next/navigation";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  return (
    <Theme appearance={resolvedTheme} accentColor="indigo" grayColor="mauve">
      <Navbar />
      <Box key={pathname} className="page-transition-wrapper">
        {children}
      </Box>
    </Theme>
  );
}