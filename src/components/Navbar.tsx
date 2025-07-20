"use client";

import React, { useState } from "react";
import { Flex, Box, IconButton, Text } from "@radix-ui/themes";
import { SunIcon, MoonIcon, LaptopIcon, HamburgerMenuIcon, Cross2Icon } from "@radix-ui/react-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

type ThemeMode = "light" | "dark" | "system";

interface NavbarProps {
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export function Navbar({ currentTheme, onThemeChange }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Detection" },
    { href: "/calibration", label: "Calibration" },
    { href: "/sessions", label: "Sessions" },
    { href: "/account", label: "Account" },
  ];

  const themeIcons = {
    light: <SunIcon width="20" height="20" />,
    dark: <MoonIcon width="20" height="20" />,
    system: <LaptopIcon width="20" height="20" />,
  };

  const cycleTheme = () => {
    const themes: ThemeMode[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    onThemeChange(themes[nextIndex]);
  };

  return (
    <>
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        style={{
          backgroundColor: "var(--color-background)",
          borderBottom: "1px solid var(--gray-a5)",
          zIndex: 50,
        }}
      >
        <Flex
          align="center"
          justify="between"
          px="4"
          py="3"
          style={{ maxWidth: "1200px", margin: "0 auto" }}
        >
          <Link href="/" style={{ textDecoration: "none" }}>
            <Text size="5" weight="bold" style={{ color: "var(--gray-12)" }}>
              BlinkTrack
            </Text>
          </Link>

          {/* Desktop Navigation */}
          <Flex gap="6" align="center" display={{ initial: "none", sm: "flex" }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ textDecoration: "none" }}
              >
                <Text
                  size="3"
                  weight={pathname === item.href ? "bold" : "regular"}
                  style={{
                    color: pathname === item.href
                      ? "var(--accent-11)"
                      : "var(--gray-11)",
                    transition: "color 0.2s",
                  }}
                  className="hover-link"
                >
                  {item.label}
                </Text>
              </Link>
            ))}
          </Flex>

          <Flex gap="3" align="center">
            <IconButton
              size="2"
              variant="ghost"
              onClick={cycleTheme}
              aria-label={`Switch to ${currentTheme} theme`}
            >
              {themeIcons[currentTheme]}
            </IconButton>

            {/* Mobile menu button */}
            <Box display={{ initial: "block", sm: "none" }}>
              <IconButton
                size="2"
                variant="ghost"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <Cross2Icon /> : <HamburgerMenuIcon />}
              </IconButton>
            </Box>
          </Flex>
        </Flex>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <Box
            display={{ initial: "block", sm: "none" }}
            px="4"
            pb="4"
            style={{
              borderTop: "1px solid var(--gray-a5)",
              backgroundColor: "var(--color-background)",
            }}
          >
            <Flex direction="column" gap="3" pt="3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{ textDecoration: "none" }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Text
                    size="4"
                    weight={pathname === item.href ? "bold" : "regular"}
                    style={{
                      color: pathname === item.href
                        ? "var(--accent-11)"
                        : "var(--gray-11)",
                    }}
                  >
                    {item.label}
                  </Text>
                </Link>
              ))}
            </Flex>
          </Box>
        )}
      </Box>

      {/* Spacer to push content below fixed navbar */}
      <Box style={{ height: "52px" }} />

      <style jsx global>{`
        .hover-link:hover {
          color: var(--accent-11) !important;
        }
      `}</style>
    </>
  );
}