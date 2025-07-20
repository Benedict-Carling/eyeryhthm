"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { BlinkRatePoint } from "../lib/sessions/types";

interface MiniBlinkChartProps {
  data: BlinkRatePoint[];
  width?: number;
  height?: number;
}

export function MiniBlinkChart({ 
  data, 
  width = 200, 
  height = 60 
}: MiniBlinkChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 5, right: 5, bottom: 5, left: 5 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, data.length - 1])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.rate) || 20])
      .range([innerHeight, 0]);

    // Line generator
    const line = d3
      .line<BlinkRatePoint>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d.rate))
      .curve(d3.curveMonotoneX);

    // Add the line
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2)
      .attr("d", line);

  }, [data, width, height]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ display: "block" }}
    />
  );
}