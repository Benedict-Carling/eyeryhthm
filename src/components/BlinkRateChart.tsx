"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { BlinkRatePoint } from "../lib/sessions/types";

interface BlinkRateChartProps {
  data: BlinkRatePoint[];
}

export function BlinkRateChart({ data }: BlinkRateChartProps) {
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

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.rate) || 20])
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
      .attr("stop-color", "#3B82F6")
      .attr("stop-opacity", 0.8);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#8B5CF6")
      .attr("stop-opacity", 0.8);

    // Add area under the line
    const area = d3
      .area<BlinkRatePoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y0(innerHeight)
      .y1((d) => yScale(d.rate))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", "url(#line-gradient)")
      .attr("fill-opacity", 0.1)
      .attr("d", area);

    // Add the line
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "url(#line-gradient)")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add dots
    g.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => xScale(new Date(d.timestamp)))
      .attr("cy", (d) => yScale(d.rate))
      .attr("r", 4)
      .attr("fill", "#8B5CF6");

    // Add the X Axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickFormat((d) => d3.timeFormat("%H:%M")(d as Date))
      )
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", 35)
      .attr("fill", "currentColor")
      .style("text-anchor", "middle")
      .text("Time");

    // Add the Y Axis
    g.append("g")
      .call(d3.axisLeft(yScale))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -35)
      .attr("x", -innerHeight / 2)
      .attr("fill", "currentColor")
      .style("text-anchor", "middle")
      .text("Blink Rate (blinks/min)");

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickSize(-innerHeight)
          .tickFormat(() => "")
      )
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);

    g.append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => "")
      )
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);

    // Add threshold line at 8 blinks/min
    const thresholdValue = parseInt(localStorage.getItem("fatigueThreshold") || "8", 10);
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", yScale(thresholdValue))
      .attr("y2", yScale(thresholdValue))
      .attr("stroke", "#EF4444")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    g.append("text")
      .attr("x", innerWidth - 5)
      .attr("y", yScale(thresholdValue) - 5)
      .attr("text-anchor", "end")
      .attr("fill", "#EF4444")
      .style("font-size", "12px")
      .text("Fatigue Threshold");

  }, [data]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      style={{ display: "block" }}
    />
  );
}