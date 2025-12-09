"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { BlinkRatePoint, FaceLostPeriod, MAX_BLINK_RATE } from "../lib/sessions/types";

interface BlinkRateChartProps {
  data: BlinkRatePoint[];
  faceLostPeriods?: FaceLostPeriod[];
  sessionEndTime?: number; // Used as fallback for periods without end timestamp
}

export function BlinkRateChart({ data, faceLostPeriods, sessionEndTime }: BlinkRateChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = svg.node()?.getBoundingClientRect().width || 800;
    const height = svg.node()?.getBoundingClientRect().height || 400;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => new Date(d.timestamp)) as [Date, Date])
      .range([0, innerWidth]);

    // Use a sensible Y-axis range: minimum 20, but expand if data exceeds it
    // Cap at MAX_BLINK_RATE (calculated from debounce time) to prevent outliers from distorting the chart
    const maxDataRate = d3.max(data, (d) => d.rate) || 0;
    const yMax = Math.min(Math.max(maxDataRate, 20), MAX_BLINK_RATE);

    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([innerHeight, 0]);

    // Line generator
    const line = d3
      .line<BlinkRatePoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(d.rate))
      .curve(d3.curveMonotoneX);

    // Add gradient
    const gradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "line-gradient")
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

    // Add green "good" zone above 12 blinks/min
    const goodThreshold = 12;
    const yAxisMax = yScale.domain()[1] || 20;
    if (yAxisMax > goodThreshold) {
      g.append("rect")
        .attr("x", 0)
        .attr("y", yScale(yAxisMax))
        .attr("width", innerWidth)
        .attr("height", yScale(goodThreshold) - yScale(yAxisMax))
        .attr("fill", "var(--green-3)")
        .attr("opacity", 0.5);
    }

    // Add orange bars for face lost periods (behind the chart)
    if (faceLostPeriods && faceLostPeriods.length > 0) {
      const xDomain = xScale.domain();
      const domainStart = xDomain[0];
      const domainEnd = xDomain[1];
      if (!domainStart || !domainEnd) return;
      const chartStartTime = domainStart.getTime();
      const chartEndTime = domainEnd.getTime();

      faceLostPeriods.forEach((period) => {
        // Use sessionEndTime as fallback for periods without end
        const periodEnd = period.end ?? sessionEndTime ?? Date.now();
        const periodStart = period.start;

        // Only draw if period overlaps with chart time range
        if (periodEnd >= chartStartTime && periodStart <= chartEndTime) {
          const clampedStart = Math.max(periodStart, chartStartTime);
          const clampedEnd = Math.min(periodEnd, chartEndTime);

          const x1 = xScale(new Date(clampedStart));
          const x2 = xScale(new Date(clampedEnd));

          g.append("rect")
            .attr("x", x1)
            .attr("y", 0)
            .attr("width", Math.max(0, x2 - x1))
            .attr("height", innerHeight)
            .attr("fill", "var(--orange-4)")
            .attr("opacity", 0.5);
        }
      });
    }

    // Add area under the line
    const area = d3
      .area<BlinkRatePoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y0(innerHeight)
      .y1((d) => yScale(d.rate))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", "var(--indigo-3)")
      .attr("fill-opacity", 0.4)
      .attr("d", area);

    // Add the line
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "url(#line-gradient)")
      .attr("stroke-width", 2)
      .attr("d", line);


    // Add the X Axis - limit ticks for cleaner display
    const timeExtent = xScale.domain();
    const startTime = timeExtent[0];
    const endTime = timeExtent[1];
    const timeDiffMs = startTime && endTime ? endTime.getTime() - startTime.getTime() : 60000;
    const xTickCount = Math.min(Math.max(Math.floor(timeDiffMs / 120000), 2), 6); // 1 tick per 2 minutes, min 2, max 6

    const xAxis = g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(xTickCount)
          .tickFormat((d) => d3.timeFormat("%H:%M")(d as Date))
      );

    // Style x-axis to match Radix theme
    xAxis.selectAll("text")
      .style("font-family", "var(--default-font-family)")
      .style("font-size", "12px")
      .style("fill", "var(--mauve-11)");
    xAxis.selectAll("line, path")
      .style("stroke", "var(--mauve-6)");

    // Add the Y Axis with fewer ticks
    const yAxis = g.append("g")
      .call(d3.axisLeft(yScale).ticks(5));

    // Style y-axis to match Radix theme
    yAxis.selectAll("text")
      .style("font-family", "var(--default-font-family)")
      .style("font-size", "12px")
      .style("fill", "var(--mauve-11)");
    yAxis.selectAll("line, path")
      .style("stroke", "var(--mauve-6)");

    // Add threshold line at 8 blinks/min
    const thresholdValue = parseInt(localStorage.getItem("fatigueThreshold") || "8", 10);
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", yScale(thresholdValue))
      .attr("y2", yScale(thresholdValue))
      .attr("stroke", "var(--red-9)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    g.append("text")
      .attr("x", innerWidth - 5)
      .attr("y", yScale(thresholdValue) - 5)
      .attr("text-anchor", "end")
      .attr("fill", "var(--red-9)")
      .style("font-family", "var(--default-font-family)")
      .style("font-size", "11px")
      .text("Fatigue Threshold");

    // Add legend
    const legend = svg
      .append("g")
      .attr("transform", `translate(${margin.left + 10}, ${margin.top})`);

    // Good zone legend
    legend.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", "var(--green-3)")
      .attr("opacity", 0.7)
      .attr("rx", 2);
    legend.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .attr("fill", "var(--mauve-11)")
      .style("font-family", "var(--default-font-family)")
      .style("font-size", "11px")
      .text("Good (12+/min)");

    // Face lost legend (only show if there are periods)
    if (faceLostPeriods && faceLostPeriods.length > 0) {
      legend.append("rect")
        .attr("x", 110)
        .attr("y", 0)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", "var(--orange-4)")
        .attr("opacity", 0.7)
        .attr("rx", 2);
      legend.append("text")
        .attr("x", 128)
        .attr("y", 10)
        .attr("fill", "var(--mauve-11)")
        .style("font-family", "var(--default-font-family)")
        .style("font-size", "11px")
        .text("Face not detected");
    }

  }, [data, faceLostPeriods, sessionEndTime]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      style={{ display: "block" }}
    />
  );
}