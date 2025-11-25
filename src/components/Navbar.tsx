"use client";

import React, { useEffect, useState } from "react";
import { Container, Flex, Text, IconButton, DropdownMenu } from "@radix-ui/themes";
import { SunIcon, MoonIcon, LaptopIcon } from "@radix-ui/react-icons";
import { useTheme } from "../contexts/ThemeContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

  const navLinks = [
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
        }}
      >
        <Container size="3">
          <Flex
            align="center"
            justify="between"
            py="3"
          >
            <Flex align="center" gap="6" wrap="wrap" style={{ minWidth: 0 }}>
              <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
                <Text size="5" weight="bold" style={{ color: "var(--gray-12)" }}>
                  BlinkTrack
                </Text>
              </Link>

              <Flex gap="4" style={{ flexShrink: 0 }}>
                {navLinks.map((link) => (
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

            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IconButton size="2" variant="ghost">
                  {getThemeIcon()}
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item onClick={() => setTheme("light")}>
                  <Flex align="center" gap="2">
                    <SunIcon />
                    <Text>Light</Text>
                  </Flex>
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => setTheme("dark")}>
                  <Flex align="center" gap="2">
                    <MoonIcon />
                    <Text>Dark</Text>
                  </Flex>
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => setTheme("system")}>
                  <Flex align="center" gap="2">
                    <LaptopIcon />
                    <Text>System</Text>
                  </Flex>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Flex>
        </Container>
      </div>
    </>
  );
}
