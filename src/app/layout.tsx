"use client";

import { useState, useEffect } from "react";
import { Theme } from "@radix-ui/themes";
import { CalibrationProvider } from "../contexts/CalibrationContext";
import { SessionProvider } from "../contexts/SessionContext";
import { Navbar } from "../components/Navbar";
import "@radix-ui/themes/styles.css";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as ThemeMode | null;
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      setThemeMode(savedTheme);
    }
  }, []);

  useEffect(() => {
    const updateResolvedTheme = () => {
      if (themeMode === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
        setResolvedTheme(systemTheme);
      } else {
        setResolvedTheme(themeMode as ResolvedTheme);
      }
    };

    updateResolvedTheme();

    if (themeMode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => updateResolvedTheme();
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [themeMode]);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setThemeMode(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <html lang="en">
      <head>
        <title>BlinkTrack</title>
        <meta name="description" content="Eye movement tracking with camera" />
      </head>
      <body>
        <Theme appearance={resolvedTheme} accentColor="indigo" grayColor="mauve">
          <CalibrationProvider>
            <SessionProvider>
              <Navbar currentTheme={themeMode} onThemeChange={handleThemeChange} />
              {children}
            </SessionProvider>
          </CalibrationProvider>
        </Theme>
      </body>
    </html>
  );
}
