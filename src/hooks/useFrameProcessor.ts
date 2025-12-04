'use client';

import { useCallback, useRef } from 'react';
import { useAnimationFrame } from './useAnimationFrame';

interface UseFrameProcessorOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>; // Optional - only needed for visualization
  processFrame: (video: HTMLVideoElement, canvas: HTMLCanvasElement | null | undefined) => void;
  onFrame?: (data: FrameData) => void;
  isEnabled?: boolean;
}

export interface FrameData {
  currentEAR: number;
  timestamp: number;
}

/**
 * Helper function to update canvas dimensions if needed.
 * Extracted to avoid React Compiler flagging canvas property assignment as prop mutation.
 */
function updateCanvasDimensions(
  canvas: HTMLCanvasElement,
  videoWidth: number,
  videoHeight: number,
  lastDimensions: { width: number; height: number }
): { width: number; height: number } {
  if (videoWidth !== lastDimensions.width || videoHeight !== lastDimensions.height) {
    // Direct DOM property assignment - this is valid and not a React prop mutation
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    return { width: videoWidth, height: videoHeight };
  }
  return lastDimensions;
}

/**
 * A React Compiler-compatible frame processor hook.
 *
 * Processes video frames at the browser's refresh rate using requestAnimationFrame.
 * Automatically handles canvas dimension synchronization with video dimensions.
 */
export function useFrameProcessor({
  videoRef,
  canvasRef,
  processFrame,
  onFrame,
  isEnabled = true,
}: UseFrameProcessorOptions) {
  const lastDimensionUpdate = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const handleAnimationFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isEnabled) return;

    const canvas = canvasRef?.current ?? null;

    // Update canvas dimensions if video dimensions changed (only if canvas exists)
    if (canvas && video.videoWidth > 0 && video.videoHeight > 0) {
      lastDimensionUpdate.current = updateCanvasDimensions(
        canvas,
        video.videoWidth,
        video.videoHeight,
        lastDimensionUpdate.current
      );
    }

    // Process the frame - canvas is optional
    processFrame(video, canvas ?? undefined);

    // Call the optional frame callback
    if (onFrame) {
      onFrame({
        currentEAR: 0, // Placeholder - actual value comes from processFrame
        timestamp: Date.now(),
      });
    }
  }, [videoRef, canvasRef, processFrame, onFrame, isEnabled]);

  useAnimationFrame(handleAnimationFrame, isEnabled);
}
