"use client";

import React, { useEffect, useRef, useMemo, useState } from "react";
import { Box, Card, Flex, Text, Badge } from "@radix-ui/themes";
import * as d3 from "d3";
import { SessionData, formatSessionDuration, BlinkRatePoint } from "../lib/sessions/types";
import { ClockIcon } from "@radix-ui/react-icons";
import { Bell, BellOff, Eye, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useCalibration } from "../contexts/CalibrationContext";
import { useSession } from "../contexts/SessionContext";
import Link from "next/link";
import "./SessionCard.css";

// Debounce interval for chart updates (ms) - prevents aggressive re-rendering
const CHART_UPDATE_DEBOUNCE_MS = 3000;

interface SessionCardProps {
  session: SessionData;
}

export function SessionCard({ session }: SessionCardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { calibrations } = useCalibration();
  const {
    isFaceDetected,
    faceLostCountdown,
    currentBlinkCount,
    sessionBaselineBlinkCount,
    sessionStartTime,
  } = useSession();

  // Debounced chart history - only updates every CHART_UPDATE_DEBOUNCE_MS for active sessions
  // Initialize with session data so chart shows immediately
  const [debouncedHistory, setDebouncedHistory] = useState<BlinkRatePoint[]>(session.blinkRateHistory);
  const lastChartUpdateRef = useRef<number>(Date.now()); // Set to now since we already initialized with data

  // Derive live blink count and rate from source of truth (only for active sessions)
  const liveBlinkCount = session.isActive ? currentBlinkCount - sessionBaselineBlinkCount : 0;
  const liveBlinkRate = useMemo(() => {
    if (!session.isActive || sessionStartTime === 0) return 0;
    const timeElapsedMinutes = (Date.now() - sessionStartTime) / 1000 / 60;
    return timeElapsedMinutes > 0 ? liveBlinkCount / timeElapsedMinutes : 0;
  }, [session.isActive, sessionStartTime, liveBlinkCount]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getQualityColor = (quality: "good" | "fair" | "poor") => {
    switch (quality) {
      case "good":
        return "green";
      case "fair":
        return "amber";
      case "poor":
        return "red";
    }
  };

  const getCalibrationName = (calibrationId: string | undefined) => {
    if (!calibrationId) return null;
    const calibration = calibrations.find(c => c.id === calibrationId);
    return calibration?.name || 'Unknown calibration';
  };

  // Calculate current blink rate - use live value for active sessions, history for completed
  const currentBlinkRate = useMemo(() => {
    // For active sessions, use the live blink rate from context (updates instantly)
    if (session.isActive) {
      return liveBlinkRate > 0 ? Math.round(liveBlinkRate) : null;
    }

    // For completed sessions, calculate from history using 2-minute moving window
    if (session.blinkRateHistory.length === 0) return null;

    const now = Date.now();
    const windowDuration = 120000; // 2 minutes
    const windowStart = now - windowDuration;

    const recentPoints = session.blinkRateHistory.filter(
      (point: BlinkRatePoint) => point.timestamp >= windowStart
    );

    if (recentPoints.length === 0) {
      // Use most recent point if nothing in window
      const lastPoint = session.blinkRateHistory[session.blinkRateHistory.length - 1];
      return lastPoint ? Math.round(lastPoint.rate) : null;
    }

    const sum = recentPoints.reduce((acc: number, point: BlinkRatePoint) => acc + point.rate, 0);
    return Math.round(sum / recentPoints.length);
  }, [session.isActive, session.blinkRateHistory, liveBlinkRate]);

  // Check if session is 3+ minutes old (show current rate)
  const sessionDurationMinutes = useMemo(() => {
    const endTime = session.endTime || new Date();
    return (endTime.getTime() - session.startTime.getTime()) / 1000 / 60;
  }, [session.startTime, session.endTime]);

  const showCurrentRate = session.isActive && sessionDurationMinutes >= 3 && currentBlinkRate !== null;

  // Only show quality indicator for sessions >= 1 minute
  const showQualityBadge = sessionDurationMinutes >= 1;

  // Get display blink count - use live value for active sessions
  const displayBlinkCount = session.isActive ? liveBlinkCount : session.totalBlinks;

  // Get display blink rate (session average) - use live value for active sessions
  const displayBlinkRate = session.isActive ? Math.round(liveBlinkRate) : Math.round(session.averageBlinkRate);

  // Determine trend (current vs session average)
  const rateDifference = currentBlinkRate !== null ? currentBlinkRate - session.averageBlinkRate : 0;
  const getTrendIcon = () => {
    if (Math.abs(rateDifference) < 1) return <Minus size={12} />;
    if (rateDifference > 0) return <TrendingUp size={12} />;
    return <TrendingDown size={12} />;
  };
  const getTrendColor = () => {
    if (Math.abs(rateDifference) < 1) return "gray";
    if (rateDifference > 0) return "green"; // Higher blink rate is good
    return "orange"; // Lower might indicate fatigue
  };

  // Debounce chart history updates to prevent aggressive re-rendering
  useEffect(() => {
    // For non-active sessions, always sync immediately
    if (!session.isActive) {
      setDebouncedHistory(session.blinkRateHistory);
      return;
    }

    // For active sessions, debounce updates
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
  }, [session.blinkRateHistory, session.isActive]);

  // D3 Mini Chart - uses debounced history to prevent aggressive re-rendering
  useEffect(() => {
    if (!svgRef.current || debouncedHistory.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 5, right: 5, bottom: 5, left: 5 };
    const width = 200 - margin.left - margin.right;
    const height = 60 - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, debouncedHistory.length - 1])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(debouncedHistory, (d) => d.rate) || 20])
      .range([height, 0]);

    // Line generator
    const line = d3
      .line<{ rate: number }>()
      .x((d, i) => xScale(i))
      .y((d) => yScale(d.rate))
      .curve(d3.curveMonotoneX);

    // Add gradient
    const gradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", `mini-gradient-${session.id}`)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0)
      .attr("y1", yScale(0))
      .attr("x2", 0)
      .attr("y2", yScale(20));

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "var(--indigo-9)")
      .attr("stop-opacity", 1);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "var(--indigo-7)")
      .attr("stop-opacity", 1);

    // Add area
    const area = d3
      .area<{ rate: number }>()
      .x((d, i) => xScale(i))
      .y0(height)
      .y1((d) => yScale(d.rate))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(debouncedHistory)
      .attr("fill", `url(#mini-gradient-${session.id})`)
      .attr("fill-opacity", 0.1)
      .attr("d", area);

    // Add line
    const path = g.append("path")
      .datum(debouncedHistory)
      .attr("fill", "none")
      .attr("stroke", `url(#mini-gradient-${session.id})`)
      .attr("stroke-width", 2)
      .attr("d", line);

    // Animate line drawing
    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(1000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);

  }, [debouncedHistory, session.id]);

  return (
    <Link href={`/session?id=${session.id}`} style={{ textDecoration: "none" }}>
      <Card
        className={session.isActive ? "session-card active" : "session-card"}
        style={{
          padding: "20px",
          border: session.isActive ? "2px solid #10b981" : "none",
          position: "relative",
          cursor: "pointer",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
      <Flex direction="column" gap="3">
        {/* Header */}
        <Flex justify="between" align="center">
          <Flex align="center" gap="3">
            <Text size="5" weight="medium" style={{ color: "var(--mauve-12)" }}>
              {formatTime(session.startTime)}
            </Text>
            {session.isExample && (
              <Badge color="gray" variant="soft">
                Example
              </Badge>
            )}
            {session.isActive && (
              <Badge color="green">
                Active
              </Badge>
            )}
            {/* Face detection status - only for active sessions */}
            {session.isActive && (
              isFaceDetected ? (
                <Badge color="green" variant="soft">
                  Face Detected
                </Badge>
              ) : faceLostCountdown !== null && faceLostCountdown > 0 ? (
                <Badge color="orange" variant="soft">
                  Face lost - closing in {faceLostCountdown}s
                </Badge>
              ) : (
                <Badge color="gray" variant="soft">
                  No Face Detected
                </Badge>
              )
            )}
          </Flex>

          {/* Quality badges */}
          <Flex gap="2" align="center">
            {showQualityBadge && (
              <Badge color={getQualityColor(session.quality)} variant="soft">
                {session.quality.charAt(0).toUpperCase() +
                  session.quality.slice(1)}{" "}
                quality
              </Badge>
            )}
            {session.fatigueAlertCount > 0 ? (
              <Badge color="orange" variant="soft">
                <Bell size={14} /> {session.fatigueAlertCount} fatigue alert
                {session.fatigueAlertCount > 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge color="green" variant="soft">
                <BellOff size={14} /> No fatigue alerts
              </Badge>
            )}
          </Flex>
        </Flex>

        {/* Session info */}
        <Flex gap="4" wrap="wrap" align="center">
          {/* Duration - show for both active (calculated) and completed (stored) sessions */}
          <Flex align="center" gap="1">
            <ClockIcon style={{ color: "var(--mauve-11)" }} />
            <Text size="2" style={{ color: "var(--mauve-11)" }}>
              {session.isActive
                ? formatSessionDuration(Math.floor(sessionDurationMinutes * 60))
                : session.duration
                  ? formatSessionDuration(session.duration)
                  : null}
            </Text>
          </Flex>

          {displayBlinkCount !== undefined && (
            <Flex align="center" gap="1">
              <Eye size={14} style={{ color: "var(--mauve-11)" }} />
              <Text size="2" style={{ color: "var(--mauve-11)" }}>{displayBlinkCount} total blinks</Text>
            </Flex>
          )}

          {session.calibrationId && (
            <Flex align="center" gap="2">
              <Text size="2" style={{ color: "var(--mauve-9)" }}>Using</Text>
              <Text size="2" weight="bold" style={{ color: "var(--mauve-9)" }}>{getCalibrationName(session.calibrationId)}</Text>
            </Flex>
          )}
        </Flex>

        {/* Main content area */}
        <Flex justify="between" align="center" gap="4">
          {/* Mini chart */}
          <Box style={{ width: "200px", height: "60px" }}>
            {session.blinkRateHistory.length > 0 ? (
              <svg
                ref={svgRef}
                width="200"
                height="60"
                style={{ display: "block" }}
              />
            ) : (
              <Flex align="center" justify="center" style={{ height: "100%" }}>
                <Text size="2">
                  {session.isActive ? "Collecting data..." : "No data"}
                </Text>
              </Flex>
            )}
          </Box>

          {/* Blink rates */}
          <Flex direction="column" align="end" gap="1">
            {showCurrentRate ? (
              <>
                {/* Current rate - prominent for active sessions */}
                <Flex align="center" gap="2">
                  <Text
                    size="6"
                    weight="bold"
                    color={getTrendColor()}
                    style={{ textAlign: "right" }}
                  >
                    {currentBlinkRate}/min
                  </Text>
                  <Badge color={getTrendColor()} variant="soft" size="1">
                    {getTrendIcon()}
                  </Badge>
                </Flex>
                <Text size="1" color="gray" style={{ textAlign: "right" }}>
                  current rate
                </Text>
                {/* Session average - secondary */}
                <Text
                  size="2"
                  color="gray"
                  style={{ textAlign: "right", marginTop: "4px" }}
                >
                  {displayBlinkRate}/min session avg
                </Text>
              </>
            ) : (
              <>
                {/* Default view for completed sessions or early active sessions */}
                <Text
                  size="6"
                  weight="bold"
                  style={{
                    minWidth: "120px",
                    textAlign: "right",
                    color: "var(--indigo-11)",
                  }}
                >
                  {displayBlinkCount} blinks
                </Text>
                <Text
                  size="2"
                  style={{
                    textAlign: "right",
                    color: "var(--mauve-11)",
                  }}
                >
                  {displayBlinkRate}/min avg
                </Text>
              </>
            )}
          </Flex>
        </Flex>
      </Flex>
    </Card>
    </Link>
  );
}