"use client";

import React from "react";
import { Flex, Text, IconButton, DropdownMenu } from "@radix-ui/themes";
import { SunIcon, MoonIcon, LaptopIcon } from "@radix-ui/react-icons";
import { useTheme } from "../contexts/ThemeContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

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
    <Flex
      align="center"
      justify="between"
      px="6"
      py="3"
      style={{ 
        borderBottom: "1px solid var(--gray-a5)",
        backgroundColor: "var(--color-background)",
      }}
    >
      <Flex align="center" gap="6">
        <Link href="/" style={{ textDecoration: "none" }}>
          <Text size="5" weight="bold" style={{ color: "var(--gray-12)" }}>
            BlinkTrack
          </Text>
        </Link>
        
        <Flex gap="4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                textDecoration: "none",
                color: pathname === link.href ? "var(--accent-11)" : "var(--gray-11)",
                fontWeight: pathname === link.href ? "500" : "400",
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
  );
}