'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { Box } from '@radix-ui/themes';

interface DataPoint {
  time: number;
  ear: number;
}

interface EARTimeSeriesGraphProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  minEAR?: number;
  maxEAR?: number;
}

export function EARTimeSeriesGraph({ 
  data, 
  width = 480, 
  height = 150,
  minEAR = 0,
  maxEAR = 0.5
}: EARTimeSeriesGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Memoize the drawing logic
  const draw = useMemo(() => {
    return (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set up styles
      ctx.strokeStyle = '#646cff';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#646cff';
      ctx.font = '10px system-ui';

      // Draw axes
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Y-axis
      ctx.moveTo(30, 10);
      ctx.lineTo(30, height - 20);
      // X-axis
      ctx.moveTo(30, height - 20);
      ctx.lineTo(width - 10, height - 20);
      ctx.stroke();

      // Draw Y-axis labels
      ctx.fillStyle = '#999';
      ctx.textAlign = 'right';
      ctx.fillText(maxEAR.toFixed(2), 25, 15);
      ctx.fillText(((maxEAR + minEAR) / 2).toFixed(2), 25, height / 2);
      ctx.fillText(minEAR.toFixed(2), 25, height - 15);

      // Draw threshold lines
      ctx.strokeStyle = '#ff6666';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      // 0.3 threshold line
      const y03 = height - 20 - ((0.3 - minEAR) / (maxEAR - minEAR)) * (height - 30);
      ctx.beginPath();
      ctx.moveTo(30, y03);
      ctx.lineTo(width - 10, y03);
      ctx.stroke();
      ctx.fillStyle = '#ff6666';
      ctx.textAlign = 'left';
      ctx.fillText('0.3', width - 35, y03 - 2);

      // 0.2 threshold line
      const y02 = height - 20 - ((0.2 - minEAR) / (maxEAR - minEAR)) * (height - 30);
      ctx.beginPath();
      ctx.moveTo(30, y02);
      ctx.lineTo(width - 10, y02);
      ctx.stroke();
      ctx.fillText('0.2', width - 35, y02 - 2);

      ctx.setLineDash([]);

      if (data.length === 0) return;

      // Calculate time range
      const minTime = data[0]?.time || 0;
      const maxTime = data[data.length - 1]?.time || 1;
      const timeRange = maxTime - minTime || 1;

      // Draw data line
      ctx.strokeStyle = '#646cff';
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((point, index) => {
        const x = 30 + ((point.time - minTime) / timeRange) * (width - 40);
        const y = height - 20 - ((point.ear - minEAR) / (maxEAR - minEAR)) * (height - 30);

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        // Highlight potential blinks (EAR < 0.25)
        if (point.ear < 0.25) {
          ctx.fillStyle = '#ff6666';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      ctx.stroke();

      // Draw time label
      ctx.fillStyle = '#999';
      ctx.textAlign = 'center';
      const duration = (maxTime - minTime) / 1000; // Convert to seconds
      ctx.fillText(`Time: ${duration.toFixed(1)}s`, width / 2, height - 5);
    };
  }, [data, width, height, minEAR, maxEAR]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    draw(ctx, canvas);
  }, [draw, width, height]);

  return (
    <Box>
      <canvas
        ref={canvasRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: '8px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
        }}
      />
    </Box>
  );
}