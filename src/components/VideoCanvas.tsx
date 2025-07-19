'use client';

import React, { forwardRef } from 'react';
import { Box } from '@radix-ui/themes';

interface VideoCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  showCanvas?: boolean;
  maxWidth?: string | number;
}

export const VideoCanvas = forwardRef<HTMLDivElement, VideoCanvasProps>(
  ({ videoRef, canvasRef, showCanvas = true, maxWidth = '640px' }, ref) => {
    return (
      <Box ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            maxWidth,
            height: 'auto',
            borderRadius: '8px',
            backgroundColor: '#000',
            filter: 'grayscale(100%)',
            display: 'block',
          }}
        />
        {showCanvas && canvasRef && (
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: '8px',
              pointerEvents: 'none',
            }}
          />
        )}
      </Box>
    );
  }
);

VideoCanvas.displayName = 'VideoCanvas';