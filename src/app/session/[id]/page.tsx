"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Container, Flex, Box, Text, Heading, Card, Badge, Separator } from "@radix-ui/themes";
import { ClockIcon, ArrowLeftIcon } from "@radix-ui/react-icons";
import { Bell, BellOff, Eye, Activity } from "lucide-react";
import Link from "next/link";
import * as d3 from "d3";
import { SessionData, formatSessionDuration } from "../../../lib/sessions/types";
import { useSession } from "../../../contexts/SessionContext";

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { sessions } = useSession();
  const [session, setSession] = useState<SessionData | null>(null);
  const [fatigueThreshold, setFatigueThreshold] = useState(8);
  const chartRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const savedThreshold = localStorage.getItem("fatigueThreshold");
    if (savedThreshold) {
      setFatigueThreshold(parseInt(savedThreshold, 10));
    }
  }, []);

  useEffect(() => {
    const foundSession = sessions.find(s => s.id === sessionId);
    if (foundSession) {
      setSession(foundSession);
    }
  }, [sessionId, sessions]);

  useEffect(() => {
    if (!session || !chartRef.current || session.blinkRateHistory.length === 0) return;

    // Clear previous chart
    d3.select(chartRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(chartRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Prepare data
    const data = session.blinkRateHistory.map(point => ({
      time: new Date(point.timestamp),
      rate: point.rate
    }));

    // Add blink events as vertical lines
    const blinkEvents = session.blinkRateHistory
      .filter((_, index) => index % 5 === 0) // Sample every 5th point for visual clarity
      .map(point => ({
        time: new Date(point.timestamp),
        rate: point.rate
      }));

    // Set up scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.time) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, Math.max(20, d3.max(data, d => d.rate) || 20)])
      .range([height, 0]);

    // Create line generator for smoothed average
    const line = d3.line<{ time: Date; rate: number }>()
      .x(d => xScale(d.time))
      .y(d => yScale(d.rate))
      .curve(d3.curveMonotoneX);

    // Add gradient for line fill
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "line-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", yScale(0))
      .attr("x2", 0).attr("y2", yScale(20));

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "var(--accent-9)")
      .attr("stop-opacity", 0.1);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "var(--accent-9)")
      .attr("stop-opacity", 0.3);

    // Add area under the line
    const area = d3.area<{ time: Date; rate: number }>()
      .x(d => xScale(d.time))
      .y0(height)
      .y1(d => yScale(d.rate))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", "url(#line-gradient)")
      .attr("d", area);

    // Add fatigue threshold line
    g.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScale(fatigueThreshold))
      .attr("y2", yScale(fatigueThreshold))
      .attr("stroke", "var(--orange-9)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("opacity", 0.7);

    // Add threshold label
    g.append("text")
      .attr("x", width - 5)
      .attr("y", yScale(fatigueThreshold) - 5)
      .attr("text-anchor", "end")
      .attr("fill", "var(--orange-9)")
      .attr("font-size", "12px")
      .text(`Fatigue threshold: ${fatigueThreshold} blinks/min`);

    // Add blink event markers
    g.selectAll(".blink-marker")
      .data(blinkEvents)
      .enter().append("circle")
      .attr("class", "blink-marker")
      .attr("cx", d => xScale(d.time))
      .attr("cy", d => yScale(d.rate))
      .attr("r", 3)
      .attr("fill", "var(--accent-9)")
      .attr("opacity", 0.6);

    // Add the smoothed line
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "var(--accent-9)")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d => d3.timeFormat("%H:%M")(d as Date)));

    // Add Y axis
    g.append("g")
      .call(d3.axisLeft(yScale));

    // Add axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", "var(--gray-11)")
      .style("font-size", "12px")
      .text("Blink Rate (blinks/min)");

    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom})`)
      .style("text-anchor", "middle")
      .style("fill", "var(--gray-11)")
      .style("font-size", "12px")
      .text("Time");

  }, [session, fatigueThreshold]);

  if (!session) {
    return (
      <Container size="4">
        <Flex direction="column" align="center" justify="center" style={{ minHeight: "100vh" }}>
          <Text>Session not found</Text>
        </Flex>
      </Container>
    );
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
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

  return (
    <Container size="4">
      <Flex
        direction="column"
        gap="6"
        style={{ minHeight: "100vh", padding: "40px 0" }}
      >
        {/* Header */}
        <Box>
          <Link href="/sessions" style={{ textDecoration: "none" }}>
            <Flex align="center" gap="2" mb="4">
              <ArrowLeftIcon />
              <Text size="2">Back to Sessions</Text>
            </Flex>
          </Link>
          
          <Heading size="8" mb="2">
            Session Details
          </Heading>
          <Text size="4" color="gray">
            {formatDate(session.startTime)}
          </Text>
        </Box>

        {/* Session Info Cards */}
        <Flex gap="4" wrap="wrap">
          <Card size="2" style={{ flex: "1 1 200px" }}>
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <ClockIcon />
                <Text size="2" weight="medium">Duration</Text>
              </Flex>
              <Text size="5" weight="bold">
                {session.duration ? formatSessionDuration(session.duration) : "Ongoing"}
              </Text>
              <Text size="2" color="gray">
                {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : "Now"}
              </Text>
            </Flex>
          </Card>

          <Card size="2" style={{ flex: "1 1 200px" }}>
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <Eye />
                <Text size="2" weight="medium">Average Blink Rate</Text>
              </Flex>
              <Text size="5" weight="bold">
                {Math.round(session.averageBlinkRate)} blinks/min
              </Text>
              <Badge color={getQualityColor(session.quality)} variant="soft">
                {session.quality.charAt(0).toUpperCase() + session.quality.slice(1)} quality
              </Badge>
            </Flex>
          </Card>

          <Card size="2" style={{ flex: "1 1 200px" }}>
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <Activity />
                <Text size="2" weight="medium">Total Blinks</Text>
              </Flex>
              <Text size="5" weight="bold">
                {session.blinkRateHistory.length > 0 
                  ? Math.round(session.averageBlinkRate * (session.duration || 0) / 60)
                  : 0}
              </Text>
              <Text size="2" color="gray">
                During session
              </Text>
            </Flex>
          </Card>

          <Card size="2" style={{ flex: "1 1 200px" }}>
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                {session.fatigueAlertCount > 0 ? <Bell /> : <BellOff />}
                <Text size="2" weight="medium">Fatigue Alerts</Text>
              </Flex>
              <Text size="5" weight="bold">
                {session.fatigueAlertCount}
              </Text>
              <Badge 
                color={session.fatigueAlertCount > 0 ? "orange" : "green"} 
                variant="soft"
              >
                {session.fatigueAlertCount > 0 ? "Fatigue detected" : "No fatigue"}
              </Badge>
            </Flex>
          </Card>
        </Flex>

        {/* Blink Rate Chart */}
        <Card size="3">
          <Heading size="4" mb="4">Blink Rate Over Time</Heading>
          {session.blinkRateHistory.length > 0 ? (
            <Box style={{ overflowX: "auto" }}>
              <svg ref={chartRef}></svg>
            </Box>
          ) : (
            <Flex align="center" justify="center" style={{ height: "400px" }}>
              <Text color="gray">No blink data available for this session</Text>
            </Flex>
          )}
        </Card>

        {/* Metadata */}
        <Card size="3">
          <Heading size="4" mb="4">Session Metadata</Heading>
          <Flex direction="column" gap="3">
            <Flex justify="between">
              <Text weight="medium">Session ID</Text>
              <Text size="2" style={{ fontFamily: "monospace" }}>{session.id}</Text>
            </Flex>
            <Separator size="4" />
            <Flex justify="between">
              <Text weight="medium">Status</Text>
              <Badge color={session.isActive ? "green" : "gray"}>
                {session.isActive ? "Active" : "Completed"}
              </Badge>
            </Flex>
            <Separator size="4" />
            <Flex justify="between">
              <Text weight="medium">Calibration</Text>
              <Text size="2" color="gray">Not linked (coming soon)</Text>
            </Flex>
          </Flex>
        </Card>
      </Flex>
    </Container>
  );
}