'use client';

import { useCallback, useRef } from 'react';
import { useAnimationFrame } from './useAnimationFrame';

interface UseFrameProcessorOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  processFrame: (video: HTMLVideoElement, canvas: HTMLCanvasElement | null) => void;
  onFrame?: (data: FrameData) => void;
  isEnabled?: boolean;
}

export interface FrameData {
  currentEAR: number;
  timestamp: number;
}

export function useFrameProcessor({
  videoRef,
  canvasRef,
  processFrame,
  onFrame,
  isEnabled = true,
}: UseFrameProcessorOptions) {
  const lastDimensionUpdate = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const handleAnimationFrame = useCallback(() => {
    if (!videoRef.current || !isEnabled) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Update canvas dimensions if video dimensions changed
    if (canvas && video.videoWidth > 0 && video.videoHeight > 0) {
      if (
        video.videoWidth !== lastDimensionUpdate.current.width ||
        video.videoHeight !== lastDimensionUpdate.current.height
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        lastDimensionUpdate.current = {
          width: video.videoWidth,
          height: video.videoHeight,
        };
      }
    }

    // Process the frame
    processFrame(video, canvas);

    // Call the optional frame callback
    if (onFrame) {
      // This is a placeholder - the actual EAR value should come from processFrame
      // We'll need to modify processFrame to return the EAR value
      onFrame({
        currentEAR: 0, // This will be provided by the actual implementation
        timestamp: Date.now(),
      });
    }
  }, [videoRef, canvasRef, processFrame, onFrame, isEnabled]);

  useAnimationFrame(handleAnimationFrame, isEnabled);
}