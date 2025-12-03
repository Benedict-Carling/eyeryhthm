"use client";

import React from "react";
import {
  Box,
  Text,
  Flex,
  Callout,
} from "@radix-ui/themes";
import { useSession } from "../contexts/SessionContext";
import { SessionCard } from "./SessionCard";
import { EyeOff, UserX } from "lucide-react";

export function SessionsView() {
  const {
    sessions,
    activeSession,
    isTracking,
    isFaceDetected,
  } = useSession();

  return (
    <Box>
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

      {/* Face not detected callout - only show when no active session */}
      {isTracking && !isFaceDetected && !activeSession && (
        <Box mb="6">
          <Callout.Root color="yellow">
            <Callout.Icon>
              <UserX size={16} />
            </Callout.Icon>
            <Callout.Text>
              No face detected. Position yourself in front of the camera to start a session.
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

    </Box>
  );
}
