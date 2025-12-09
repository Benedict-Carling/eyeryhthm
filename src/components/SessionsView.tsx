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
import { SessionFilterBar } from "./SessionFilterBar";
import { useSessionFilters } from "@/hooks/useSessionFilters";
import { EyeOff, UserX, Loader2 } from "lucide-react";

export function SessionsView() {
  const {
    sessions,
    activeSession,
    isTracking,
    isInitializing,
    isFaceDetected,
  } = useSession();

  const {
    filters,
    setFilters,
    filteredSessions,
    totalCount,
    filteredCount,
  } = useSessionFilters(sessions);

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

      {/* Initializing tracking callout */}
      {isTracking && isInitializing && (
        <Box mb="6">
          <Callout.Root color="blue">
            <Callout.Icon>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            </Callout.Icon>
            <Callout.Text>
              Initializing camera...
            </Callout.Text>
          </Callout.Root>
        </Box>
      )}

      {/* Face not detected callout - only show when initialized and no active session */}
      {isTracking && !isInitializing && !isFaceDetected && !activeSession && (
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
        <Text size="3" weight="medium" mb="2">
          Recent Screen Sessions
        </Text>

        {/* Filter Bar */}
        <SessionFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={totalCount}
          filteredCount={filteredCount}
        />

        <Flex direction="column" gap="4">
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session, index) => (
              <SessionCard key={session.id} session={session} index={index} />
            ))
          ) : (
            <Box py="6">
              <Text size="2" color="gray" align="center">
                {totalCount === 0
                  ? "No sessions recorded yet. Start tracking to record your first session."
                  : "No sessions match the current filters."}
              </Text>
            </Box>
          )}
        </Flex>
      </Box>

    </Box>
  );
}
