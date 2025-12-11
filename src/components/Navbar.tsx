"use client";

import React, { useState } from "react";
import { Container, Flex, Text, IconButton, Badge, Switch, Tooltip, DropdownMenu, Avatar, Button } from "@radix-ui/themes";
import { SunIcon, MoonIcon, LaptopIcon, PersonIcon, ExitIcon } from "@radix-ui/react-icons";
import { Eye, EyeOff } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useSession } from "../contexts/SessionContext";
import { useCalibration } from "../contexts/CalibrationContext";
import { useAuth } from "../contexts/AuthContext";
import { useUpdateStatus } from "../hooks/useUpdateStatus";
import { useCameraPermission } from "../hooks/useCameraPermission";
import { usePlatform } from "../hooks/usePlatform";
import Link from "next/link";
import { usePathname } from "next/navigation";
import packageJson from "../../package.json";

import styles from "./Navbar.module.css";

// Draggable title bar for Electron with traffic lights (macOS)
function TitleBar() {
  return <div className={styles.titleBar} />;
}

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { isTracking, toggleTracking } = useSession();
  const { hasOnlyFactoryDefault } = useCalibration();
  const { user, profile, signOut } = useAuth();
  const { hasUpdate } = useUpdateStatus();
  const { needsAttention: cameraPermissionNeedsAttention } = useCameraPermission();
  const { isElectron, capabilities } = usePlatform();
  const pathname = usePathname();

  // Animation key triggers - derived from state changes
  // Using the actual state value as key ensures animation replays on change
  const [themeAnimKey, setThemeAnimKey] = useState(0);

  // Show title bar with traffic light accommodation on macOS Electron
  const showTitleBar = isElectron && capabilities.hasTrafficLights;
  const showCalibrationNotification = hasOnlyFactoryDefault();
  const showSettingsNotification = hasUpdate || cameraPermissionNeedsAttention;

  const getThemeIcon = () => {
    if (theme === "system") return <LaptopIcon className={styles.themeIcon} />;
    if (theme === "dark") return <MoonIcon className={styles.themeIcon} />;
    return <SunIcon className={styles.themeIcon} />;
  };

  const handleThemeCycle = () => {
    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    if (nextTheme) {
      setThemeAnimKey(k => k + 1);
      setTheme(nextTheme);
    }
  };

  const navigationLinks = [
    { href: "/", label: "Sessions" },
    { href: "/calibration", label: "Calibration" },
    { href: "/settings", label: "Settings" },
  ];

  // Build tracking badge class names
  const trackingBadgeClasses = [
    styles.trackingBadge,
    isTracking ? styles.trackingBadgeActive : "",
  ].filter(Boolean).join(" ");

  return (
    <>
      {/* Separate title bar for Electron with traffic lights (macOS) */}
      {showTitleBar && <TitleBar />}

      {/* Main navbar */}
      <div className={showTitleBar ? `${styles.navbar} ${styles.navbarWithTitleBar}` : styles.navbar}>
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
                    <span
                      className={`${styles.navLink} ${pathname === link.href ? styles.navLinkActive : ""}`}
                      style={{ position: "relative", display: "inline-block" }}
                    >
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
                  className={trackingBadgeClasses}
                  onClick={toggleTracking}
                >
                  <span key={String(isTracking)} className={styles.trackingIconEnter}>
                    {isTracking ? <Eye size={14} /> : <EyeOff size={14} />}
                  </span>
                  <span className={styles.trackingText}>
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
                className={styles.themeToggle}
              >
                <span key={themeAnimKey} className={styles.themeIconRotate}>
                  {getThemeIcon()}
                </span>
              </IconButton>

              {/* User menu */}
              {user && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    <Button variant="ghost" size="2">
                      <Avatar
                        size="1"
                        fallback={profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                        radius="full"
                      />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Label>
                      <Flex direction="column" gap="1">
                        {profile?.full_name && (
                          <Text size="2" weight="medium">{profile.full_name}</Text>
                        )}
                        <Text size="1" color="gray">{user.email}</Text>
                      </Flex>
                    </DropdownMenu.Label>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item color="red" onClick={signOut}>
                      <ExitIcon />
                      Sign out
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              )}
            </Flex>
          </Flex>
        </Container>
      </div>
    </>
  );
}
