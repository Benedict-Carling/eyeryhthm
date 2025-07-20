import { useState, useCallback, useMemo, useRef } from 'react';
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

  const config = useMemo(() => ({
    earThreshold: options.earThreshold ?? activeCalibration?.earThreshold ?? 0.25,
    consecutiveFrames: options.consecutiveFrames ?? 2,
    debounceTime: options.debounceTime ?? 50,
    showDebugOverlay: options.showDebugOverlay ?? true,
  }), [options, activeCalibration?.earThreshold]);

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
    video: HTMLVideoElement,
    canvas?: HTMLCanvasElement | null
  ) => {
    if (!video || video.readyState < 2) {
      return;
    }

    try {
      const timestamp = performance.now();
      const results = await detectForVideo(video, timestamp);
      
      if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
        // Log only occasionally to avoid spam
        if (Math.random() < 0.01) {
          console.log('No face landmarks detected', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            videoReady: video.readyState,
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

      // Draw visualization if enabled
      if (config.showDebugOverlay && canvas && visualizerRef.current) {
        visualizerRef.current.drawResults(
          { faceLandmarks: results.faceLandmarks },
          video.videoWidth,
          video.videoHeight
        );
      }

      // Extract eye landmarks and calculate EAR
      const eyeLandmarks = extractBothEyeLandmarks(
        { faceLandmarks: results.faceLandmarks },
        video.videoWidth,
        video.videoHeight
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