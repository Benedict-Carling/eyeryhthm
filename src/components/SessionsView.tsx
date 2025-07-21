"use client";

import React from "react";
import {
  Box,
  Heading,
  Text,
  Flex,
  Switch,
  Badge,
  Callout,
} from "@radix-ui/themes";
import { useSession } from "../contexts/SessionContext";
import { SessionCard } from "./SessionCard";
import { VideoCanvas } from "./VideoCanvas";
import { FaceIcon } from "@radix-ui/react-icons";
import { Eye, EyeOff } from "lucide-react";

export function SessionsView() {
  const {
    sessions,
    activeSession,
    isTracking,
    isFaceDetected,
    toggleTracking,
    videoRef,
    canvasRef,
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

        {/* Controls */}
        <Flex gap="3" align="center">
          {/* Face detection status */}
          <Badge
            // size="2"
            color={isFaceDetected ? "green" : "gray"}
            variant="soft"
          >
            <FaceIcon />
            {isFaceDetected ? "Face Detected" : "No Face Detected"}
          </Badge>

          {/* Tracking toggle */}
          <Flex align="center" gap="2">
            <Switch checked={isTracking} onCheckedChange={toggleTracking} />
            {isTracking ? <Eye size={16} /> : <EyeOff size={16} />}
            <Text size="2" weight="medium">
              {isTracking ? "Tracking Enabled" : "Tracking Disabled"}
            </Text>
          </Flex>
        </Flex>
      </Flex>

      {/* Video Display - Shows camera feed when tracking is enabled */}
      {isTracking && (
        <Box mb="6" style={{ display: "flex", justifyContent: "center" }}>
          <VideoCanvas
            videoRef={videoRef}
            canvasRef={canvasRef}
            showCanvas={false} // No canvas overlay needed for sessions
            maxWidth="480px"
          />
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
            <Flex direction="column" gap="3">
              <Text weight="bold">Session Requirements:</Text>
              <Box>
                <Flex direction="column" gap="2">
                  <Flex gap="2" align="center">
                    <Text size="2">•</Text>
                    <Text size="2">Minimum session length: 2 minutes</Text>
                  </Flex>
                  <Flex gap="2" align="center">
                    <Text size="2">•</Text>
                    <Text size="2">
                      Sessions continue through interruptions up to 10 seconds
                    </Text>
                  </Flex>
                  <Flex gap="2" align="center">
                    <Text size="2">•</Text>
                    <Text size="2">
                      Blink rate targets: Good (12+), Fair (8-11), Poor (&lt;8)
                    </Text>
                  </Flex>
                  <Flex gap="2" align="center">
                    <Text size="2">•</Text>
                    <Text size="2">
                      No camera footage is displayed or stored
                    </Text>
                  </Flex>
                </Flex>
              </Box>
            </Flex>
          </Callout.Text>
        </Callout.Root>
      </Box>
    </Box>
  );
}
