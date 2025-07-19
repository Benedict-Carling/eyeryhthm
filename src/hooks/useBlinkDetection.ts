import { useRef, useCallback, useState, useEffect } from 'react';
import { BlinkDetector } from '../lib/blink-detection/blink-detector';
import { FaceMeshVisualizer } from '../lib/blink-detection/face-mesh-visualizer';
import { BlinkDetectionResult } from '../lib/blink-detection/types';
import { useCalibration } from '../contexts/CalibrationContext';

interface BlinkDetectionState {
  blinkCount: number;
  currentEAR: number;
  isBlinking: boolean;
  isDetectorReady: boolean;
  showDebugOverlay: boolean;
  error: string | null;
}

interface BlinkDetectionOptions {
  videoElement: HTMLVideoElement | null;
  canvasElement: HTMLCanvasElement | null;
  autoStart?: boolean;
}

export function useBlinkDetection({
  videoElement,
  canvasElement,
  autoStart = false
}: BlinkDetectionOptions) {
  const { activeCalibration } = useCalibration();
  const [state, setState] = useState<BlinkDetectionState>({
    blinkCount: 0,
    currentEAR: 0,
    isBlinking: false,
    isDetectorReady: false,
    showDebugOverlay: true,
    error: null,
  });
  
  const blinkDetectorRef = useRef<BlinkDetector | null>(null);
  const visualizerRef = useRef<FaceMeshVisualizer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  const processFrame = useCallback(async () => {
    if (!videoElement || !blinkDetectorRef.current || isProcessingRef.current) {
      return;
    }

    try {
      isProcessingRef.current = true;
      const result: BlinkDetectionResult = await blinkDetectorRef.current.processFrame(
        videoElement,
        (rawResults) => {
          if (state.showDebugOverlay && visualizerRef.current && videoElement) {
            visualizerRef.current.drawResults(
              rawResults,
              videoElement.videoWidth,
              videoElement.videoHeight
            );
          }
        }
      );
      
      setState(prev => ({
        ...prev,
        blinkCount: result.blinkCount,
        currentEAR: result.currentEAR,
        isBlinking: result.isBlinking,
        error: null,
      }));
    } catch (error) {
      console.error('Blink detection error:', error);
      setState(prev => ({
        ...prev,
        error: 'Blink detection processing failed',
      }));
    } finally {
      isProcessingRef.current = false;
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [videoElement, state.showDebugOverlay]);

  const startDetection = useCallback(async () => {
    if (!videoElement) {
      setState(prev => ({ ...prev, error: 'Video element not available' }));
      return;
    }

    try {
      if (!blinkDetectorRef.current) {
        const earThreshold = activeCalibration?.earThreshold || 0.25;
        blinkDetectorRef.current = new BlinkDetector({
          earThreshold,
          consecutiveFrames: 2,
          debounceTime: 50,
        });
      }

      if (!visualizerRef.current && canvasElement) {
        visualizerRef.current = new FaceMeshVisualizer();
        await visualizerRef.current.initialize(canvasElement);
      }

      await blinkDetectorRef.current.initialize();
      setState(prev => ({ 
        ...prev, 
        isDetectorReady: true,
        error: null,
      }));
      
      animationFrameRef.current = requestAnimationFrame(processFrame);
    } catch (error) {
      console.error('Failed to initialize blink detector:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to initialize face detection',
        isDetectorReady: false 
      }));
    }
  }, [videoElement, canvasElement, processFrame, activeCalibration]);

  const stopDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (blinkDetectorRef.current) {
      blinkDetectorRef.current.dispose();
      blinkDetectorRef.current = null;
    }

    if (visualizerRef.current) {
      visualizerRef.current.dispose();
      visualizerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isDetectorReady: false,
      blinkCount: 0,
      currentEAR: 0,
      isBlinking: false,
      error: null,
    }));
  }, []);

  const resetBlinkCounter = useCallback(() => {
    if (blinkDetectorRef.current) {
      blinkDetectorRef.current.resetBlinkCounter();
      setState(prev => ({
        ...prev,
        blinkCount: 0,
      }));
    }
  }, []);

  const toggleDebugOverlay = useCallback(() => {
    setState(prev => ({
      ...prev,
      showDebugOverlay: !prev.showDebugOverlay,
    }));
  }, []);

  // Auto-start detection when video element becomes available
  useEffect(() => {
    if (autoStart && videoElement && !state.isDetectorReady) {
      startDetection();
    }
  }, [autoStart, videoElement, state.isDetectorReady, startDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    ...state,
    startDetection,
    stopDetection,
    resetBlinkCounter,
    toggleDebugOverlay,
  };
}