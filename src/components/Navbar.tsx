"use client";

import React, { useEffect, useState } from "react";
import { Container, Flex, Text, IconButton, Badge } from "@radix-ui/themes";
import { SunIcon, MoonIcon, LaptopIcon } from "@radix-ui/react-icons";
import { useTheme } from "../contexts/ThemeContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import packageJson from "../../package.json";

// Check if running in Electron on macOS
function useIsElectronMac() {
  const [isElectronMac, setIsElectronMac] = useState(false);

  useEffect(() => {
    const isElectron = typeof window !== "undefined" &&
      window.navigator.userAgent.includes("Electron");
    const isMac = typeof window !== "undefined" &&
      navigator.userAgent.includes("Mac");
    setIsElectronMac(isElectron && isMac);
  }, []);

  return isElectronMac;
}

// Draggable title bar for Electron macOS traffic lights
function TitleBar() {
  return (
    <div
      style={{
        height: 30,
        backgroundColor: "var(--color-background)",
        borderBottom: "1px solid var(--gray-a5)",
        WebkitAppRegion: "drag",
      } as React.CSSProperties}
    />
  );
}

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const isElectronMac = useIsElectronMac();

  const getThemeIcon = () => {
    if (theme === "system") return <LaptopIcon />;
    if (theme === "dark") return <MoonIcon />;
    return <SunIcon />;
  };

  const handleThemeCycle = () => {
    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const navigationLinks = [
    { href: "/", label: "Sessions" },
    { href: "/calibration", label: "Calibration" },
    { href: "/account", label: "Account" },
  ];

  return (
    <>
      {/* Separate title bar for Electron macOS traffic lights */}
      {isElectronMac && <TitleBar />}

      {/* Main navbar */}
      <div
        style={{
          borderBottom: "1px solid var(--gray-a5)",
          backgroundColor: "var(--color-background)",
          WebkitAppRegion: "no-drag",
        } as React.CSSProperties}
      >
        <Container size="3">
          <Flex
            align="center"
            justify="between"
            py="3"
          >
            <Flex align="center" gap="6" wrap="wrap" style={{ minWidth: 0 }}>
              <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
                <Flex align="center" gap="2">
                  <Text size="5" weight="bold" style={{ color: "var(--gray-12)" }}>
                    BlinkTrack
                  </Text>
                  <Badge size="1" color="gray" variant="soft">
                    v{packageJson.version}
                  </Badge>
                </Flex>
              </Link>

              <Flex gap="4" style={{ flexShrink: 0 }}>
                {navigationLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      textDecoration: "none",
                      color:
                        pathname === link.href
                          ? "var(--accent-11)"
                          : "var(--gray-11)",
                    }}
                  >
                    <Text size="3">{link.label}</Text>
                  </Link>
                ))}
              </Flex>
            </Flex>

            <IconButton
              size="2"
              variant="ghost"
              onClick={handleThemeCycle}
              title={`Theme: ${theme} (click to cycle)`}
            >
              {getThemeIcon()}
            </IconButton>
          </Flex>
        </Container>
      </div>
    </>
  );
}
