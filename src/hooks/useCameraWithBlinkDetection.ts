'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { BlinkDetector } from '../lib/blink-detection/blink-detector';
import { BlinkDetectionResult } from '../lib/blink-detection/types';
import { FaceMeshVisualizer } from '../lib/blink-detection/face-mesh-visualizer';
import { useCalibration } from '../contexts/CalibrationContext';

interface CameraBlinkState {
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
  blinkCount: number;
  currentEAR: number;
  isBlinking: boolean;
  isDetectorReady: boolean;
  showDebugOverlay: boolean;
}

export function useCameraWithBlinkDetection() {
  const { activeCalibration } = useCalibration();
  
  const [state, setState] = useState<CameraBlinkState>({
    stream: null,
    isLoading: false,
    error: null,
    hasPermission: false,
    blinkCount: 0,
    currentEAR: 0,
    isBlinking: false,
    isDetectorReady: false,
    showDebugOverlay: true,
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blinkDetectorRef = useRef<BlinkDetector | null>(null);
  const visualizerRef = useRef<FaceMeshVisualizer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !blinkDetectorRef.current || isProcessingRef.current) {
      return;
    }

    try {
      isProcessingRef.current = true;
      const result: BlinkDetectionResult = await blinkDetectorRef.current.processFrame(
        videoRef.current,
        (rawResults) => {
          // Visualize face mesh if debug overlay is enabled
          if (state.showDebugOverlay && visualizerRef.current && videoRef.current) {
            visualizerRef.current.drawResults(
              rawResults,
              videoRef.current.videoWidth,
              videoRef.current.videoHeight
            );
          }
        }
      );
      
      setState(prev => ({
        ...prev,
        blinkCount: result.blinkCount,
        currentEAR: result.currentEAR,
        isBlinking: result.isBlinking,
      }));
    } catch (error) {
      console.error('Blink detection error:', error);
    } finally {
      isProcessingRef.current = false;
    }

    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [state.showDebugOverlay]);

  const startBlinkDetection = useCallback(async () => {
    if (!blinkDetectorRef.current) {
      const earThreshold = activeCalibration?.earThreshold || 0.25;
      blinkDetectorRef.current = new BlinkDetector({
        earThreshold,
        consecutiveFrames: 2,
        debounceTime: 50,
      });
    }

    if (!visualizerRef.current && canvasRef.current) {
      visualizerRef.current = new FaceMeshVisualizer();
      await visualizerRef.current.initialize(canvasRef.current);
    }

    try {
      await blinkDetectorRef.current.initialize();
      setState(prev => ({ ...prev, isDetectorReady: true }));
      
      // Start processing frames
      animationFrameRef.current = requestAnimationFrame(processFrame);
    } catch (error) {
      console.error('Failed to initialize blink detector:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to initialize face detection',
        isDetectorReady: false 
      }));
    }
  }, [processFrame, activeCalibration]);

  const stopBlinkDetection = useCallback(() => {
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
    }));
  }, []);

  const startCamera = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      setState(prev => ({
        ...prev,
        stream,
        isLoading: false,
        hasPermission: true,
      }));

      // Use requestAnimationFrame to ensure video element is rendered
      requestAnimationFrame(() => {
        if (videoRef.current) {
          const video = videoRef.current;
          
          // Set required attributes for iOS/Safari compatibility
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.autoplay = true;
          video.muted = true;
          
          // Set up event handler for when metadata is loaded
          video.onloadedmetadata = () => {
            // Small delay to ensure video is ready
            setTimeout(() => {
              video.play().catch(console.error);
              // Start blink detection once video is playing
              startBlinkDetection();
            }, 100);
          };
          
          // Set the stream
          video.srcObject = stream;
        }
      });
    } catch (err) {
      const error = err as Error;
      setState(prev => ({
        ...prev,
        error: error.name === 'NotAllowedError' 
          ? 'Camera permission denied' 
          : 'Failed to access camera',
        isLoading: false,
        hasPermission: false,
      }));
    }
  }, [startBlinkDetection]);

  const stopCamera = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
      
      // Clean up video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.onloadedmetadata = null;
      }
      
      setState(prev => ({
        ...prev,
        stream: null,
        hasPermission: false,
      }));
    }

    // Stop blink detection
    stopBlinkDetection();
  }, [state.stream, stopBlinkDetection]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBlinkDetection();
    };
  }, [stopBlinkDetection]);

  return {
    ...state,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    resetBlinkCounter,
    toggleDebugOverlay,
  };
}