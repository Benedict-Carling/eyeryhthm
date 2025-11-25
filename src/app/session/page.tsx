"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Container, Flex, Box, Text, Heading, Button, Card } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useSession } from "../../contexts/SessionContext";
import { SessionData } from "../../lib/sessions/types";
import { BlinkRateChart } from "../../components/BlinkRateChart";

function SessionDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { sessions } = useSession();
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get("id");
    if (sessionId) {
      const foundSession = sessions.find(s => s.id === sessionId);
      setSession(foundSession || null);
    }
  }, [searchParams, sessions]);

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
                {session.totalBlinks} blinks
              </Text>
            </Flex>
          </Card>

          <Card>
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">Average Blink Rate</Text>
              <Text size="5" weight="medium">
                {Math.round(session.averageBlinkRate)} blinks/min
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
            <BlinkRateChart data={session.blinkRateHistory} />
          </Box>
        </Card>
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
