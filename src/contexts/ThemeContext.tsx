"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as ThemeMode | null;
    if (savedTheme) {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateResolvedTheme = (e?: MediaQueryListEvent) => {
      let newResolvedTheme: "light" | "dark";
      if (theme === "system") {
        const matches = e ? e.matches : mediaQuery.matches;
        newResolvedTheme = matches ? "dark" : "light";
      } else {
        newResolvedTheme = theme as "light" | "dark";
      }
      setResolvedTheme(newResolvedTheme);

      // Update the document class for Radix Themes
      // Radix Themes uses class names on the root element for theming
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(newResolvedTheme);

      // Also update the radix-themes element if it exists
      const radixTheme = document.querySelector(".radix-themes");
      if (radixTheme) {
        radixTheme.classList.remove("light", "dark");
        radixTheme.classList.add(newResolvedTheme);
      }

      // Update body background color to match theme (prevents dark edges in Electron)
      document.body.style.backgroundColor =
        newResolvedTheme === "dark" ? "#111113" : "#ffffff";
    };

    updateResolvedTheme();

    if (theme === "system") {
      mediaQuery.addEventListener("change", updateResolvedTheme);
      return () => mediaQuery.removeEventListener("change", updateResolvedTheme);
    }
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}