"use client";

import React, { useEffect, useRef } from "react";
import { Box, Card, Flex, Text, Badge } from "@radix-ui/themes";
import * as d3 from "d3";
import { SessionData, formatSessionDuration } from "../lib/sessions/types";
import { ClockIcon } from "@radix-ui/react-icons";
import { Bell, BellOff } from "lucide-react";
import { useCalibration } from "../contexts/CalibrationContext";
import "./SessionCard.css";

interface SessionCardProps {
  session: SessionData;
}

export function SessionCard({ session }: SessionCardProps) {
  const chartRef = useRef<SVGSVGElement>(null);
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  const { calibrations } = useCalibration();

  // Update time every second for active sessions
  useEffect(() => {
    if (!session.isActive) return;

    const interval = setInterval(() => {
      forceUpdate();
    }, 1000);

    return () => clearInterval(interval);
  }, [session.isActive]);

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

  const formatDynamicDuration = (startTime: Date) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getCalibrationName = (calibrationId: string | undefined) => {
    if (!calibrationId) return null;
    const calibration = calibrations.find((c) => c.id === calibrationId);
    return calibration?.name || "Unknown calibration";
  };

  useEffect(() => {
    if (!chartRef.current || session.blinkRateHistory.length === 0) return;

    // Clear previous chart
    d3.select(chartRef.current).selectAll("*").remove();

    const margin = { top: 5, right: 5, bottom: 5, left: 5 };
    const width = 200 - margin.left - margin.right;
    const height = 60 - margin.top - margin.bottom;

    const svg = d3
      .select(chartRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Prepare data
    const data = session.blinkRateHistory.map((point, index) => ({
      x: index,
      y: point.rate,
    }));

    // Set up scales
    const xScale = d3
      .scaleLinear()
      .domain([0, data.length - 1])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, Math.max(20, d3.max(data, (d) => d.y) || 20)])
      .range([height, 0]);

    // Create gradient
    const gradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", `gradient-${session.id}`)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0)
      .attr("y1", height)
      .attr("x2", 0)
      .attr("y2", 0);

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "var(--accent-9)")
      .attr("stop-opacity", 0.05);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "var(--accent-9)")
      .attr("stop-opacity", 0.2);

    // Create area
    const area = d3
      .area<{ x: number; y: number }>()
      .x((d) => xScale(d.x))
      .y0(height)
      .y1((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);

    // Create line
    const line = d3
      .line<{ x: number; y: number }>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);

    // Add area
    g.append("path")
      .datum(data)
      .attr("fill", `url(#gradient-${session.id})`)
      .attr("d", area);

    // Add line
    const path = g
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "var(--accent-9)")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Animate the line drawing
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
    <Card
      style={{
        padding: "20px",
        border: session.isActive ? "2px solid #10b981" : "none",
        position: "relative",
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
              <Badge color="green" size="2" style={{ position: "relative" }}>
                <span className="pulse-dot">•</span> Active
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

        {/* Duration and Blinks */}
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <ClockIcon />
            <Text size="2">
              {session.isActive
                ? formatDynamicDuration(session.startTime)
                : session.duration
                ? formatSessionDuration(session.duration)
                : "0m"}
            </Text>
            {session.calibrationId && (
              <Text size="2" color="gray">
                • {getCalibrationName(session.calibrationId)}
              </Text>
            )}
          </Flex>
          {session.totalBlinks !== undefined && (
            <Text size="2" color="gray">
              {session.totalBlinks} total blinks
            </Text>
          )}
        </Flex>

        {/* Main content area */}
        <Flex justify="between" align="center" gap="4">
          {/* Mini chart */}
          <Box style={{ width: "200px", height: "60px" }}>
            {session.blinkRateHistory.length > 0 ? (
              <svg ref={chartRef}></svg>
            ) : (
              <Flex align="center" justify="center" style={{ height: "100%" }}>
                <Text size="2">
                  {session.isActive ? "Collecting data..." : "No data"}
                </Text>
              </Flex>
            )}
          </Box>

          {/* Average blink rate */}
          <Text
            size="6"
            weight="bold"
            style={{
              minWidth: "120px",
              textAlign: "right",
            }}
          >
            {Math.round(session.averageBlinkRate)} blinks/min
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}
