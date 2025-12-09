"use client";

import React, { useEffect, useRef, useState } from "react";
import { Box, Card, Flex, Text, Badge } from "@radix-ui/themes";
import * as d3 from "d3";
import {
  SessionData,
  formatSessionDuration,
  BlinkRatePoint,
  MAX_BLINK_RATE,
  BLINK_RATE_WINDOW_MS,
  getChartDataFromSession,
} from "../lib/sessions/types";
import { ClockIcon } from "@radix-ui/react-icons";
import { Bell, BellOff, Eye, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useCalibration } from "../contexts/CalibrationContext";
import { useSession } from "../contexts/SessionContext";
import { useInterval } from "../hooks/useInterval";
import Link from "next/link";
import "./SessionCard.css";

// Debounce interval for chart updates (ms) - prevents aggressive re-rendering
const CHART_UPDATE_DEBOUNCE_MS = 3000;

interface SessionCardProps {
  session: SessionData;
  index?: number;
}

export function SessionCard({ session, index = 0 }: SessionCardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { calibrations } = useCalibration();
  const {
    isFaceDetected,
    faceLostCountdown,
    currentBlinkCount,
    sessionBaselineBlinkCount,
    sessionStartTime,
  } = useSession();

  // For active sessions: debounced chart history - only updates every CHART_UPDATE_DEBOUNCE_MS
  // For non-active sessions: use session data directly (no debouncing needed)
  const [activeSessionHistory, setActiveSessionHistory] = useState<BlinkRatePoint[]>(() => {
    // Derive initial chart data from blinkEvents or fall back to legacy blinkRateHistory
    return getChartDataFromSession(session);
  });
  // Track last chart update time in state (not ref with Date.now()) to be React Compiler pure
  const [lastChartUpdateTime, setLastChartUpdateTime] = useState<number>(() => {
    // Lazy initializer runs once on mount, not during render
    return Date.now();
  });

  // Animation state tracking using refs to avoid setState in effects
  const prevFaceDetectedRef = useRef(isFaceDetected);
  const prevBlinkCountRef = useRef(currentBlinkCount);
  const [faceAnimationClass, setFaceAnimationClass] = useState("");
  const [blinkAnimKey, setBlinkAnimKey] = useState(0);

  // Track face detection changes for animation
  useEffect(() => {
    const prevFaceDetected = prevFaceDetectedRef.current;
    if (isFaceDetected !== prevFaceDetected) {
      // Use setTimeout to avoid synchronous setState in effect body
      const animTimer = setTimeout(() => {
        setFaceAnimationClass(isFaceDetected ? "face-found" : "face-lost");
      }, 0);
      prevFaceDetectedRef.current = isFaceDetected;
      // Clear animation class after animation completes
      const clearTimer = setTimeout(() => setFaceAnimationClass(""), 400);
      return () => {
        clearTimeout(animTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [isFaceDetected]);

  // Track blink count changes for animation - increment key to force re-render
  useEffect(() => {
    const prevBlinkCount = prevBlinkCountRef.current;
    if (session.isActive && currentBlinkCount > prevBlinkCount) {
      // Use setTimeout to avoid synchronous setState in effect body
      const timer = setTimeout(() => {
        setBlinkAnimKey(k => k + 1);
      }, 0);
      prevBlinkCountRef.current = currentBlinkCount;
      return () => clearTimeout(timer);
    }
    if (currentBlinkCount !== prevBlinkCount) {
      prevBlinkCountRef.current = currentBlinkCount;
    }
  }, [currentBlinkCount, session.isActive]);

  // Use session data directly for non-active sessions, debounced data for active
  const debouncedHistory = session.isActive ? activeSessionHistory : getChartDataFromSession(session);

  // Timer tick for active session duration updates (updates every 30 seconds)
  // Also used to trigger blink rate recalculation
  const [durationTick, setDurationTick] = useState(0);
  // Current timestamp updated by interval - avoids Date.now() during render
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());

  // Use compiler-compatible interval hook - updates both tick and time
  useInterval(
    () => {
      setDurationTick(tick => tick + 1);
      setCurrentTime(Date.now());
    },
    session.isActive ? 1000 : null // Update every second for active sessions
  );

  // Derive live blink count and rate from source of truth (only for active sessions)
  // React Compiler auto-memoizes these derived values
  const liveBlinkCount = session.isActive ? currentBlinkCount - sessionBaselineBlinkCount : 0;
  const liveBlinkRate = (() => {
    if (!session.isActive || sessionStartTime === 0) return 0;
    const timeElapsedMinutes = (currentTime - sessionStartTime) / 1000 / 60;
    return timeElapsedMinutes > 0 ? liveBlinkCount / timeElapsedMinutes : 0;
  })();

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
  // React Compiler auto-memoizes this derived value
  const currentBlinkRate = (() => {
    // For active sessions, use the live blink rate from context (updates instantly)
    if (session.isActive) {
      return liveBlinkRate > 0 ? Math.round(liveBlinkRate) : null;
    }

    // Get chart data for completed sessions
    const chartData = getChartDataFromSession(session);

    // For completed sessions, calculate from chart data using 2-minute moving window
    if (chartData.length === 0) return null;

    // For completed sessions, use end time as reference point
    const referenceTime = session.endTime?.getTime() || session.startTime.getTime();
    const windowDuration = 120000; // 2 minutes
    const windowStart = referenceTime - windowDuration;

    const recentPoints = chartData.filter(
      (point: BlinkRatePoint) => point.timestamp >= windowStart
    );

    if (recentPoints.length === 0) {
      // Use most recent point if nothing in window
      const lastPoint = chartData[chartData.length - 1];
      return lastPoint ? Math.round(lastPoint.rate) : null;
    }

    const sum = recentPoints.reduce((acc: number, point: BlinkRatePoint) => acc + point.rate, 0);
    return Math.round(sum / recentPoints.length);
  })();

  // Check if session is 3+ minutes old (show current rate)
  // durationTick triggers re-render for active sessions to update this value
  // React Compiler auto-memoizes this calculation
  const sessionDurationMinutes = (() => {
    // Reference durationTick to ensure recalculation on interval
    void durationTick;
    const endTime = session.endTime || new Date();
    return (endTime.getTime() - session.startTime.getTime()) / 1000 / 60;
  })();

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

  // Debounce chart history updates for active sessions only
  // Non-active sessions use getChartDataFromSession directly via derived value above
  useEffect(() => {
    // Only debounce for active sessions
    if (!session.isActive) {
      return;
    }

    // Calculate time until next allowed update
    const now = Date.now();
    const timeSinceLastUpdate = now - lastChartUpdateTime;
    const timeUntilUpdate = Math.max(0, CHART_UPDATE_DEBOUNCE_MS - timeSinceLastUpdate);

    // Always schedule update via setTimeout to avoid synchronous setState in effect body
    const timeoutId = setTimeout(() => {
      setActiveSessionHistory(getChartDataFromSession(session));
      setLastChartUpdateTime(Date.now());
    }, timeUntilUpdate);

    return () => clearTimeout(timeoutId);
  }, [session.blinkEvents, session.isActive, lastChartUpdateTime, session.startTime, session.endTime]);

  // Track if chart has been initialized
  const [chartInitialized, setChartInitialized] = useState(false);

  // D3 Mini Chart - uses debounced history with smooth transitions
  useEffect(() => {
    if (!svgRef.current || debouncedHistory.length === 0) return;

    const svg = d3.select(svgRef.current);

    // Guard against test environment where D3 may be mocked
    if (!svg || typeof svg.select !== "function") return;
    const margin = { top: 5, right: 5, bottom: 5, left: 5 };
    const width = 200 - margin.left - margin.right;
    const height = 60 - margin.top - margin.bottom;

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, debouncedHistory.length - 1])
      .range([0, width]);

    // Use a sensible Y-axis range: minimum 20, but expand if data exceeds it
    // Cap at MAX_BLINK_RATE (calculated from debounce time) to prevent outliers from distorting the chart
    const maxDataRate = d3.max(debouncedHistory, (d) => d.rate) || 0;
    const yMax = Math.min(Math.max(maxDataRate, 20), MAX_BLINK_RATE);

    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .range([height, 0]);

    // Line generator
    const line = d3
      .line<{ rate: number }>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d.rate))
      .curve(d3.curveMonotoneX);

    // Area generator
    const area = d3
      .area<{ rate: number }>()
      .x((_, i) => xScale(i))
      .y0(height)
      .y1((d) => yScale(d.rate))
      .curve(d3.curveMonotoneX);

    // Initialize chart structure on first render
    if (!chartInitialized) {
      svg.selectAll("*").remove();

      // Add gradient (only once)
      const defs = svg.append("defs");
      const gradient = defs
        .append("linearGradient")
        .attr("id", `mini-gradient-${session.id}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0)
        .attr("y1", height)
        .attr("x2", 0)
        .attr("y2", 0);

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

      // Create group for chart elements
      const g = svg
        .append("g")
        .attr("class", "chart-group")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Add area path
      g.append("path")
        .attr("class", "area-path")
        .datum(debouncedHistory)
        .attr("fill", `url(#mini-gradient-${session.id})`)
        .attr("fill-opacity", 0.1)
        .attr("d", area);

      // Add line path
      g.append("path")
        .attr("class", "line-path")
        .datum(debouncedHistory)
        .attr("fill", "none")
        .attr("stroke", `url(#mini-gradient-${session.id})`)
        .attr("stroke-width", 2)
        .attr("d", line);

      // Add a subtle glow dot at the end for active sessions
      if (session.isActive) {
        g.append("circle")
          .attr("class", "live-dot")
          .attr("cx", xScale(debouncedHistory.length - 1))
          .attr("cy", yScale(debouncedHistory[debouncedHistory.length - 1]?.rate || 0))
          .attr("r", 3)
          .attr("fill", "var(--indigo-9)");
      }

      setChartInitialized(true);
    } else {
      // Smooth transition for subsequent updates
      const g = svg.select(".chart-group");

      // Transition area
      g.select(".area-path")
        .datum(debouncedHistory)
        .transition()
        .duration(800)
        .ease(d3.easeCubicInOut)
        .attr("d", area);

      // Transition line
      g.select(".line-path")
        .datum(debouncedHistory)
        .transition()
        .duration(800)
        .ease(d3.easeCubicInOut)
        .attr("d", line);

      // Transition live dot for active sessions
      if (session.isActive && debouncedHistory.length > 0) {
        const lastPoint = debouncedHistory[debouncedHistory.length - 1];
        const existingDot = g.select<SVGCircleElement>(".live-dot");

        if (existingDot.empty()) {
          g.append("circle")
            .attr("class", "live-dot")
            .attr("r", 3)
            .attr("fill", "var(--indigo-9)")
            .attr("cx", xScale(debouncedHistory.length - 1))
            .attr("cy", yScale(lastPoint?.rate || 0));
        } else {
          existingDot
            .transition()
            .duration(800)
            .ease(d3.easeCubicInOut)
            .attr("cx", xScale(debouncedHistory.length - 1))
            .attr("cy", yScale(lastPoint?.rate || 0));
        }
      }
    }

  }, [debouncedHistory, session.id, session.isActive, chartInitialized]);

  return (
    <Link href={`/session?id=${session.id}`} style={{ textDecoration: "none" }}>
      <Card
        className={session.isActive ? "session-card active" : "session-card"}
        data-index={index}
        style={{
          padding: "20px",
          border: session.isActive ? "2px solid #10b981" : "none",
          position: "relative",
          cursor: "pointer",
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
              <Badge color="green" className="live-indicator">
                <span className="live-dot" />
                Active
              </Badge>
            )}
            {/* Face detection status - only for active sessions */}
            {session.isActive && (
              isFaceDetected ? (
                <Badge color="green" variant="soft" className={`face-status-badge ${faceAnimationClass}`}>
                  Face Detected
                </Badge>
              ) : faceLostCountdown !== null && faceLostCountdown > 0 ? (
                <Badge color="orange" variant="soft" className={`face-status-badge ${faceAnimationClass}`}>
                  Face lost - closing in {faceLostCountdown}s
                </Badge>
              ) : (
                <Badge color="gray" variant="soft" className={`face-status-badge ${faceAnimationClass}`}>
                  No Face Detected
                </Badge>
              )
            )}
          </Flex>

          {/* Quality badges */}
          <Flex gap="2" align="center">
            {showQualityBadge && (
              <Badge color={getQualityColor(session.quality)} variant="soft" className="quality-badge">
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
          <Box style={{ width: "200px", height: "60px" }} className="mini-chart">
            {debouncedHistory.length > 0 ? (
              <svg
                ref={svgRef}
                width="200"
                height="60"
                style={{ display: "block" }}
              />
            ) : (
              <Flex align="center" justify="center" style={{ height: "100%" }}>
                <Text size="2" color="gray">
                  {session.isActive ? (() => {
                    const elapsedMs = currentTime - sessionStartTime;
                    const remainingMs = BLINK_RATE_WINDOW_MS - elapsedMs;
                    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
                    return `First reading in ${remainingSeconds}s`;
                  })() : "No data"}
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
                  <Badge color={getTrendColor()} variant="soft" size="1" className="trend-badge">
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
                  className="metric-value"
                  style={{
                    minWidth: "120px",
                    textAlign: "right",
                    color: "var(--indigo-11)",
                  }}
                >
                  <span key={blinkAnimKey} className="blink-count-number blink-bump">{displayBlinkCount}</span> blinks
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