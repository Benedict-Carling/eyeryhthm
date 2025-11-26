"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { Box, Card, Flex, Text, Badge } from "@radix-ui/themes";
import * as d3 from "d3";
import { SessionData, formatSessionDuration, BlinkRatePoint } from "../lib/sessions/types";
import { ClockIcon } from "@radix-ui/react-icons";
import { Bell, BellOff, Eye, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useCalibration } from "../contexts/CalibrationContext";
import Link from "next/link";
import "./SessionCard.css";

interface SessionCardProps {
  session: SessionData;
}

export function SessionCard({ session }: SessionCardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { calibrations } = useCalibration();

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

  // Calculate current blink rate using 2-minute moving window
  const currentBlinkRate = useMemo(() => {
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
  }, [session.blinkRateHistory]);

  // Check if session is 3+ minutes old (show current rate)
  const sessionDurationMinutes = useMemo(() => {
    const endTime = session.endTime || new Date();
    return (endTime.getTime() - session.startTime.getTime()) / 1000 / 60;
  }, [session.startTime, session.endTime]);

  const showCurrentRate = session.isActive && sessionDurationMinutes >= 3 && currentBlinkRate !== null;

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

  // D3 Mini Chart
  useEffect(() => {
    if (!svgRef.current || session.blinkRateHistory.length === 0) return;

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
      .domain([0, session.blinkRateHistory.length - 1])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(session.blinkRateHistory, (d) => d.rate) || 20])
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
      .attr("stop-color", "#3B82F6")
      .attr("stop-opacity", 0.8);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#8B5CF6")
      .attr("stop-opacity", 0.8);

    // Add area
    const area = d3
      .area<{ rate: number }>()
      .x((d, i) => xScale(i))
      .y0(height)
      .y1((d) => yScale(d.rate))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(session.blinkRateHistory)
      .attr("fill", `url(#mini-gradient-${session.id})`)
      .attr("fill-opacity", 0.1)
      .attr("d", area);

    // Add line
    const path = g.append("path")
      .datum(session.blinkRateHistory)
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

  }, [session.blinkRateHistory, session.id]);

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
            <Text size="5" weight="medium">
              {formatTime(session.startTime)}
            </Text>
            {session.isActive && (
              <Badge color="green" size="2" className="pulse">
                • Active
              </Badge>
            )}
          </Flex>

          {/* Quality badges */}
          <Flex gap="2" align="center">
            <Badge color={getQualityColor(session.quality)} variant="soft">
              {session.quality.charAt(0).toUpperCase() +
                session.quality.slice(1)}{" "}
              quality
            </Badge>
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
        <Flex gap="4" wrap="wrap">
          {/* Duration - show for both active (calculated) and completed (stored) sessions */}
          <Flex align="center" gap="2">
            <ClockIcon />
            <Text size="2">
              {session.isActive
                ? formatSessionDuration(Math.floor(sessionDurationMinutes * 60))
                : session.duration
                  ? formatSessionDuration(session.duration)
                  : null}
            </Text>
          </Flex>

          {session.totalBlinks !== undefined && (
            <Flex align="center" gap="2">
              <Eye size={14} />
              <Text size="2">{session.totalBlinks} total blinks</Text>
            </Flex>
          )}

          {session.calibrationId && (
            <Flex align="center" gap="2">
              <Text size="2" color="gray">
                Calibration: {getCalibrationName(session.calibrationId)}
              </Text>
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
                  {Math.round(session.averageBlinkRate)}/min session avg
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
                  }}
                >
                  {session.totalBlinks} blinks
                </Text>
                <Text
                  size="2"
                  color="gray"
                  style={{
                    textAlign: "right",
                  }}
                >
                  {Math.round(session.averageBlinkRate)}/min avg
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