import { useState, useCallback, useRef, useMemo } from 'react';
import { useFaceLandmarker } from './useFaceLandmarker';
import { FaceMeshVisualizer } from '../lib/blink-detection/face-mesh-visualizer';
import { extractBothEyeLandmarks } from '../lib/blink-detection/landmark-extractor';
import { calculateAverageEAR } from '../lib/blink-detection/ear-calculator';
import { useCalibration } from '../contexts/CalibrationContext';

interface BlinkDetectionState {
  blinkCount: number;
  currentEAR: number;
  isBlinking: boolean;
  error: string | null;
}

interface UseBlinkDetectionOptions {
  earThreshold?: number;
  consecutiveFrames?: number;
  debounceTime?: number;
  showDebugOverlay?: boolean;
}

export function useBlinkDetection(options: UseBlinkDetectionOptions = {}) {
  const { activeCalibration } = useCalibration();
  const [state, setState] = useState<BlinkDetectionState>({
    blinkCount: 0,
    currentEAR: 0,
    isBlinking: false,
    error: null,
  });

  const visualizerRef = useRef<FaceMeshVisualizer | null>(null);
  const detectionStateRef = useRef({
    consecutiveFramesBelow: 0,
    lastBlinkTime: 0,
    isCurrentlyBlinking: false,
  });

  // Memoize config to prevent useCallback dependency changes on every render
  const config = useMemo(() => ({
    earThreshold: options.earThreshold ?? activeCalibration?.earThreshold ?? 0.25,
    consecutiveFrames: options.consecutiveFrames ?? 2,
    debounceTime: options.debounceTime ?? 50,
    showDebugOverlay: options.showDebugOverlay ?? true,
  }), [options.earThreshold, options.consecutiveFrames, options.debounceTime, options.showDebugOverlay, activeCalibration?.earThreshold]);

  const { isInitialized, initialize, detectForVideo, dispose } = useFaceLandmarker();

  const initializeVisualizer = useCallback(async (canvas: HTMLCanvasElement) => {
    if (!visualizerRef.current) {
      visualizerRef.current = new FaceMeshVisualizer();
      await visualizerRef.current.initialize(canvas);
    }
  }, []);

  const detectBlink = useCallback((currentEAR: number, timestamp: number): boolean => {
    const state = detectionStateRef.current;
    
    if (currentEAR < config.earThreshold) {
      state.consecutiveFramesBelow++;
      
      if (state.consecutiveFramesBelow >= config.consecutiveFrames && 
          !state.isCurrentlyBlinking &&
          timestamp - state.lastBlinkTime > config.debounceTime) {
        
        state.isCurrentlyBlinking = true;
        state.lastBlinkTime = timestamp;
        return true;
      }
    } else {
      state.consecutiveFramesBelow = 0;
      state.isCurrentlyBlinking = false;
    }

    return state.isCurrentlyBlinking;
  }, [config]);

  const processFrame = useCallback(async (
    source: TexImageSource,
    canvas?: HTMLCanvasElement | null
  ) => {
    // For HTMLVideoElement, check readyState
    if (source instanceof HTMLVideoElement && source.readyState < 2) {
      return;
    }

    try {
      const timestamp = performance.now();
      const results = await detectForVideo(source, timestamp);

      if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
        // Log only occasionally to avoid spam
        if (Math.random() < 0.01) {
          let width: number, height: number;
          if (source instanceof HTMLVideoElement) {
            width = source.videoWidth;
            height = source.videoHeight;
          } else if ('displayWidth' in source) {
            // VideoFrame
            width = source.displayWidth;
            height = source.displayHeight;
          } else {
            // ImageBitmap
            width = (source as ImageBitmap).width;
            height = (source as ImageBitmap).height;
          }
          console.log('No face landmarks detected', {
            videoWidth: width,
            videoHeight: height,
            sourceType: source instanceof HTMLVideoElement ? 'HTMLVideoElement' : ('displayWidth' in source ? 'VideoFrame' : 'ImageBitmap'),
            videoReady: source instanceof HTMLVideoElement ? source.readyState : 'N/A',
            results: results ? 'empty' : 'null'
          });
        }
        setState(prev => ({
          ...prev,
          currentEAR: 0,
          isBlinking: false,
          error: null,
        }));
        return;
      }

      // Get dimensions from HTMLVideoElement, VideoFrame, or ImageBitmap
      let width: number, height: number;
      if (source instanceof HTMLVideoElement) {
        width = source.videoWidth;
        height = source.videoHeight;
      } else if ('displayWidth' in source) {
        // VideoFrame
        width = source.displayWidth;
        height = source.displayHeight;
      } else {
        // ImageBitmap
        width = (source as ImageBitmap).width;
        height = (source as ImageBitmap).height;
      }

      // Draw visualization if enabled
      if (config.showDebugOverlay && canvas && visualizerRef.current) {
        visualizerRef.current.drawResults(
          { faceLandmarks: results.faceLandmarks },
          width,
          height
        );
      }

      // Extract eye landmarks and calculate EAR
      const eyeLandmarks = extractBothEyeLandmarks(
        { faceLandmarks: results.faceLandmarks },
        width,
        height
      );

      if (!eyeLandmarks) {
        setState(prev => ({
          ...prev,
          currentEAR: 0,
          isBlinking: false,
          error: 'No eye landmarks detected',
        }));
        return;
      }

      const currentEAR = calculateAverageEAR(eyeLandmarks.leftEye, eyeLandmarks.rightEye);
      const isBlinking = detectBlink(currentEAR, Date.now());

      setState(prev => ({
        ...prev,
        currentEAR,
        isBlinking,
        blinkCount: isBlinking && !prev.isBlinking ? prev.blinkCount + 1 : prev.blinkCount,
        error: null,
      }));
    } catch {
      setState(prev => ({
        ...prev,
        error: 'Failed to process frame',
      }));
    }
  }, [detectForVideo, config.showDebugOverlay, detectBlink]);

  const start = useCallback(async (canvas?: HTMLCanvasElement) => {
    try {
      await initialize();
      
      if (canvas) {
        await initializeVisualizer(canvas);
      }
      
      setState(prev => ({ ...prev, error: null }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to initialize blink detection' 
      }));
      throw error;
    }
  }, [initialize, initializeVisualizer]);

  const stop = useCallback(() => {
    dispose();
    
    if (visualizerRef.current) {
      visualizerRef.current.dispose();
      visualizerRef.current = null;
    }

    setState({
      blinkCount: 0,
      currentEAR: 0,
      isBlinking: false,
      error: null,
    });

    detectionStateRef.current = {
      consecutiveFramesBelow: 0,
      lastBlinkTime: 0,
      isCurrentlyBlinking: false,
    };
  }, [dispose]);

  const resetBlinkCounter = useCallback(() => {
    setState(prev => ({ ...prev, blinkCount: 0 }));
  }, []);

  return {
    ...state,
    isReady: isInitialized,
    start,
    stop,
    processFrame,
    resetBlinkCounter,
  };
}