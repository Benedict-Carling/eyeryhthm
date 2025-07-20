"use client";

import { Theme } from "@radix-ui/themes";
import { useTheme } from "../contexts/ThemeContext";
import { Navbar } from "../components/Navbar";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <Theme appearance={resolvedTheme} accentColor="indigo" grayColor="mauve">
      <Navbar />
      {children}
    </Theme>
  );
}