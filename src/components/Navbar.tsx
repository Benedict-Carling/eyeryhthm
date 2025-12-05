"use client";

import React, { useState } from "react";
import { Container, Flex, Text, IconButton, Badge, Switch, Tooltip } from "@radix-ui/themes";
import { SunIcon, MoonIcon, LaptopIcon } from "@radix-ui/react-icons";
import { Eye, EyeOff } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useSession } from "../contexts/SessionContext";
import { useCalibration } from "../contexts/CalibrationContext";
import { useUpdateStatus } from "../hooks/useUpdateStatus";
import { useCameraPermission } from "../hooks/useCameraPermission";
import Link from "next/link";
import { usePathname } from "next/navigation";
import packageJson from "../../package.json";
import styles from "./Navbar.module.css";

// Check if running in Electron on macOS
function getIsElectronMac(): boolean {
  if (typeof window === "undefined") return false;
  const isElectron = window.navigator.userAgent.includes("Electron");
  const isMac = navigator.userAgent.includes("Mac");
  return isElectron && isMac;
}

function useIsElectronMac() {
  const [isElectronMac] = useState(getIsElectronMac);
  return isElectronMac;
}

// Draggable title bar for Electron macOS traffic lights
function TitleBar() {
  return <div className={styles.titleBar} />;
}

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { isTracking, toggleTracking } = useSession();
  const { hasOnlyFactoryDefault } = useCalibration();
  const { hasUpdate } = useUpdateStatus();
  const { needsAttention: cameraPermissionNeedsAttention } = useCameraPermission();
  const pathname = usePathname();
  const isElectronMac = useIsElectronMac();
  const showCalibrationNotification = hasOnlyFactoryDefault();
  const showSettingsNotification = hasUpdate || cameraPermissionNeedsAttention;

  const getThemeIcon = () => {
    if (theme === "system") return <LaptopIcon />;
    if (theme === "dark") return <MoonIcon />;
    return <SunIcon />;
  };

  const handleThemeCycle = () => {
    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    if (nextTheme) {
      setTheme(nextTheme);
    }
  };

  const navigationLinks = [
    { href: "/", label: "Sessions" },
    { href: "/calibration", label: "Calibration" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <>
      {/* Separate title bar for Electron macOS traffic lights */}
      {isElectronMac && <TitleBar />}

      {/* Main navbar */}
      <div className={isElectronMac ? `${styles.navbar} ${styles.navbarWithTitleBar}` : styles.navbar}>
        <Container size="3">
          <Flex
            align="center"
            justify="between"
            py="3"
          >
            <Flex align="center" gap="6" wrap="wrap" style={{ minWidth: 0 }}>
              <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
                <Flex align="center" gap="2">
                  <Text size="5" weight="bold" style={{ color: "var(--mauve-12)" }}>
                    EyeRhythm
                  </Text>
                  <Badge size="1" color="gray" variant="soft">
                    v{packageJson.version}
                  </Badge>
                  <Badge size="1" color="indigo" variant="solid">
                    Beta
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
                          : "var(--mauve-11)",
                    }}
                  >
                    <span style={{ position: "relative" }}>
                      <Text size="3">{link.label}</Text>
                      {link.href === "/calibration" && showCalibrationNotification && (
                        <span className={styles.notificationDot} />
                      )}
                      {link.href === "/settings" && showSettingsNotification && (
                        <span className={styles.notificationDot} />
                      )}
                    </span>
                  </Link>
                ))}
              </Flex>
            </Flex>

            <Flex align="center" gap="3">
              {/* Tracking toggle */}
              <Tooltip content={isTracking ? "Click to pause session tracking" : "Click to enable session tracking"}>
                <Badge
                  size="2"
                  color={isTracking ? "green" : "gray"}
                  variant="soft"
                  style={{ cursor: "pointer", padding: "4px 10px" }}
                  onClick={toggleTracking}
                >
                  {isTracking ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span style={{ minWidth: "58px", display: "inline-block", textAlign: "center" }}>
                    {isTracking ? "Tracking" : "Paused"}
                  </span>
                  <Switch
                    size="1"
                    checked={isTracking}
                    onCheckedChange={toggleTracking}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Badge>
              </Tooltip>

              <IconButton
                size="2"
                variant="ghost"
                onClick={handleThemeCycle}
                title={`Theme: ${theme} (click to cycle)`}
              >
                {getThemeIcon()}
              </IconButton>
            </Flex>
          </Flex>
        </Container>
      </div>
    </>
  );
}
