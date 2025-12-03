"use client";

import React from "react";
import {
  Box,
  Heading,
  Text,
  Flex,
  Callout,
} from "@radix-ui/themes";
import { useSession } from "../contexts/SessionContext";
import { SessionCard } from "./SessionCard";
import { Eye, EyeOff } from "lucide-react";

export function SessionsView() {
  const {
    sessions,
    activeSession,
    isTracking,
  } = useSession();

  return (
    <Box>
      {/* Header */}
      <Flex justify="between" align="center" mb="6">
        <Box>
          <Heading size="6" mb="2">
            Screen Session Tracking
          </Heading>
          <Text size="3">
            Monitor your screen time and eye fatigue patterns
          </Text>
        </Box>
      </Flex>

      {/* Tracking disabled callout */}
      {!isTracking && (
        <Box mb="6">
          <Callout.Root color="orange">
            <Callout.Icon>
              <EyeOff size={16} />
            </Callout.Icon>
            <Callout.Text>
              Tracking is disabled. Enable tracking in the navigation bar to record sessions.
            </Callout.Text>
          </Callout.Root>
        </Box>
      )}

      {/* Active Session */}
      {activeSession && (
        <Box mb="6">
          <Text size="3" weight="medium" mb="3">
            Current Session
          </Text>
          <SessionCard session={activeSession} />
        </Box>
      )}

      {/* Recent Sessions */}
      <Box mt="6">
        <Text size="3" weight="medium" mb="4">
          Recent Screen Sessions
        </Text>
        <Flex direction="column" gap="4">
          {sessions
            .filter((session) => !session.isActive)
            .map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
        </Flex>
      </Box>

      {/* Info callout */}
      <Box mt="6">
        <Callout.Root>
          <Callout.Icon>
            <Eye size={16} />
          </Callout.Icon>
          <Callout.Text>
            <strong>Session Requirements:</strong>
            <br />
            <br />
            • Minimum session length: 2 minutes
            <br />
            • Sessions continue through interruptions up to 10 seconds
            <br />
            • Blink rate targets: Good (12+), Fair (8-11), Poor (&lt;8)
            <br />
            • No camera footage is displayed or stored
          </Callout.Text>
        </Callout.Root>
      </Box>
    </Box>
  );
}
