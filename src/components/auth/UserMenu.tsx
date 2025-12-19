"use client";

/**
 * User Menu Component
 *
 * Avatar with dropdown menu for user actions (logout)
 */

import React, { useState } from "react";
import { Avatar, DropdownMenu, Text, Separator } from "@radix-ui/themes";
import { ExitIcon, PersonIcon } from "@radix-ui/react-icons";
import { useAuth } from "../../contexts/AuthContext";

export function UserMenu() {
  const { user, signOut, isAuthenticated } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!isAuthenticated || !user) {
    return null;
  }

  // Generate avatar initials from email
  const getInitials = (email: string): string => {
    // Get first 2 characters of email
    return email.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const initials = getInitials(user.email);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <Avatar
            size="2"
            fallback={initials}
            color="indigo"
            style={{ cursor: "pointer" }}
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        <DropdownMenu.Label>
          <Text size="1" color="gray">
            Signed in as
          </Text>
        </DropdownMenu.Label>
        <DropdownMenu.Label>
          <Text size="2" weight="medium">
            {user.email}
          </Text>
        </DropdownMenu.Label>

        <Separator size="4" style={{ margin: "var(--space-2) 0" }} />

        <DropdownMenu.Item
          onClick={handleSignOut}
          disabled={isSigningOut}
          color="red"
        >
          <ExitIcon />
          {isSigningOut ? "Signing out..." : "Sign out"}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
