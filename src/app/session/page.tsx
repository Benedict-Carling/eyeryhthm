"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { Container, Flex, Box, Text, Heading, Button, Card } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useSession } from "../../contexts/SessionContext";
import { SessionData, BlinkRatePoint } from "../../lib/sessions/types";
import { BlinkRateChart } from "../../components/BlinkRateChart";

// Debounce interval for chart updates (ms) - prevents aggressive re-rendering
const CHART_UPDATE_DEBOUNCE_MS = 3000;

function SessionDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    sessions,
    currentBlinkCount,
    sessionBaselineBlinkCount,
    sessionStartTime,
  } = useSession();
  const [session, setSession] = useState<SessionData | null>(null);

  // Debounced chart history - only updates every CHART_UPDATE_DEBOUNCE_MS for active sessions
  const [debouncedHistory, setDebouncedHistory] = useState<BlinkRatePoint[]>([]);
  const lastChartUpdateRef = useRef<number>(0); // Start at 0 to ensure first update is immediate
  const initializedForSessionRef = useRef<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get("id");
    if (sessionId) {
      const foundSession = sessions.find(s => s.id === sessionId);
      setSession(foundSession || null);
    }
  }, [searchParams, sessions]);

  // Derive live blink count and rate from source of truth (only for active sessions)
  const liveBlinkCount = session?.isActive ? currentBlinkCount - sessionBaselineBlinkCount : 0;
  const liveBlinkRate = useMemo(() => {
    if (!session?.isActive || sessionStartTime === 0) return 0;
    const timeElapsedMinutes = (Date.now() - sessionStartTime) / 1000 / 60;
    return timeElapsedMinutes > 0 ? liveBlinkCount / timeElapsedMinutes : 0;
  }, [session?.isActive, sessionStartTime, liveBlinkCount]);

  // Get display values - use live values for active sessions
  const displayBlinkCount = session?.isActive ? liveBlinkCount : session?.totalBlinks;
  const displayBlinkRate = session?.isActive ? Math.round(liveBlinkRate) : Math.round(session?.averageBlinkRate ?? 0);

  // Debounce chart history updates to prevent aggressive re-rendering
  useEffect(() => {
    if (!session) return;

    // Always show chart immediately on first load for this session
    if (initializedForSessionRef.current !== session.id) {
      setDebouncedHistory(session.blinkRateHistory);
      lastChartUpdateRef.current = Date.now();
      initializedForSessionRef.current = session.id;
      return;
    }

    // For non-active sessions, always sync immediately
    if (!session.isActive) {
      setDebouncedHistory(session.blinkRateHistory);
      return;
    }

    // For active sessions, debounce subsequent updates
    const now = Date.now();
    const timeSinceLastUpdate = now - lastChartUpdateRef.current;

    if (timeSinceLastUpdate >= CHART_UPDATE_DEBOUNCE_MS) {
      // Enough time has passed, update immediately
      setDebouncedHistory(session.blinkRateHistory);
      lastChartUpdateRef.current = now;
    } else {
      // Schedule an update for when debounce period ends
      const timeUntilUpdate = CHART_UPDATE_DEBOUNCE_MS - timeSinceLastUpdate;
      const timeoutId = setTimeout(() => {
        setDebouncedHistory(session.blinkRateHistory);
        lastChartUpdateRef.current = Date.now();
      }, timeUntilUpdate);

      return () => clearTimeout(timeoutId);
    }
  }, [session]);

  if (!session) {
    return (
      <Container size="3">
        <Flex direction="column" gap="4" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
          <Button onClick={() => router.push("/")} variant="ghost">
            <ArrowLeftIcon /> Back
          </Button>
          <Text>Session not found</Text>
        </Flex>
      </Container>
    );
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "good":
        return "green";
      case "fair":
        return "amber";
      case "poor":
        return "red";
      default:
        return "gray";
    }
  };

  return (
    <Container size="3">
      <Flex direction="column" gap="6" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <Button onClick={() => router.push("/")} variant="ghost" style={{ width: "fit-content" }}>
          <ArrowLeftIcon /> Back to Sessions
        </Button>

        <Box>
          <Heading size="8" mb="2">Session Details</Heading>
          <Text size="4" color="gray">
            {formatDate(session.startTime)}
          </Text>
        </Box>

        <Flex gap="4" wrap="wrap">
          <Card>
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">Duration</Text>
              <Text size="5" weight="medium">
                {session.duration ? formatDuration(session.duration) : "In progress"}
              </Text>
            </Flex>
          </Card>

          <Card>
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">Total Blinks</Text>
              <Text size="5" weight="medium">
                {displayBlinkCount} blinks
              </Text>
            </Flex>
          </Card>

          <Card>
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">Average Blink Rate</Text>
              <Text size="5" weight="medium">
                {displayBlinkRate} blinks/min
              </Text>
            </Flex>
          </Card>

          <Card>
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">Quality</Text>
              <Text size="5" weight="medium" color={getQualityColor(session.quality)}>
                {session.quality.charAt(0).toUpperCase() + session.quality.slice(1)}
              </Text>
            </Flex>
          </Card>

          <Card>
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">Fatigue Alerts</Text>
              <Text size="5" weight="medium">
                {session.fatigueAlertCount}
              </Text>
            </Flex>
          </Card>
        </Flex>

        <Card size="3">
          <Heading size="4" mb="4">Blink Rate Over Time</Heading>
          <Box style={{ height: "400px" }}>
            <BlinkRateChart
              data={debouncedHistory}
              faceLostPeriods={session.faceLostPeriods}
              sessionEndTime={session.endTime ? new Date(session.endTime).getTime() : undefined}
            />
          </Box>
        </Card>

        {/* Debug card for face lost periods */}
        {session.faceLostPeriods && session.faceLostPeriods.length > 0 && (
          <Card size="3">
            <Heading size="4" mb="4">Face Lost Periods (Debug)</Heading>
            <Box style={{ fontFamily: "monospace", fontSize: "12px" }}>
              {session.faceLostPeriods.map((period, index) => {
                const startDate = new Date(period.start);
                const endDate = period.end
                  ? new Date(period.end)
                  : session.endTime
                    ? new Date(session.endTime)
                    : null;
                const duration = endDate
                  ? Math.round((endDate.getTime() - period.start) / 1000)
                  : null;

                return (
                  <Box key={index} mb="2" style={{ padding: "8px", background: "var(--orange-2)", borderRadius: "4px" }}>
                    <Text size="2">
                      <strong>Period {index + 1}:</strong>
                    </Text>
                    <br />
                    <Text size="1" color="gray">
                      Start: {startDate.toLocaleTimeString()} ({period.start})
                    </Text>
                    <br />
                    <Text size="1" color="gray">
                      End: {endDate ? `${endDate.toLocaleTimeString()} (${period.end ?? "session end"})` : "ongoing"}
                    </Text>
                    <br />
                    <Text size="1" color="gray">
                      Duration: {duration !== null ? `${duration}s` : "ongoing"}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          </Card>
        )}
      </Flex>
    </Container>
  );
}

export default function SessionDetailPage() {
  return (
    <Suspense fallback={
      <Container size="3">
        <Flex direction="column" gap="4" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
          <Text>Loading...</Text>
        </Flex>
      </Container>
    }>
      <SessionDetailContent />
    </Suspense>
  );
}
