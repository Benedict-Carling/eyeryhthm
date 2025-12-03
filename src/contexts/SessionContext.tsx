"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import {
  SessionData,
  BlinkRatePoint,
  getSessionQuality,
} from "../lib/sessions/types";
import { useCamera } from "../hooks/useCamera";
import { useBlinkDetection } from "../hooks/useBlinkDetection";
import { useMediaPipePreloader } from "../hooks/useMediaPipePreloader";
import { useCalibration } from "./CalibrationContext";
import { AlertService } from "../lib/alert-service";
import { getElectronAPI } from "../lib/electron";

interface SessionContextType {
  sessions: SessionData[];
  activeSession: SessionData | null;
  isTracking: boolean;
  isFaceDetected: boolean;
  faceLostCountdown: number | null; // seconds remaining before session closes, null if face is detected
  toggleTracking: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  // Source of truth for live blink data (derived values computed by consumers)
  currentBlinkCount: number; // Raw blink count from detection (source of truth)
  sessionBaselineBlinkCount: number; // Blink count when active session started
  sessionStartTime: number; // Timestamp when active session started
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

// Constants for session tracking
const FPS_LOG_INTERVAL_MS = 5000; // Log FPS every 5 seconds
const FACE_DETECTION_LOST_TIMEOUT_MS = 20000; // Stop session if face lost for 20 seconds
const CAMERA_STABILIZATION_DELAY_MS = 200; // Wait for stable camera feed before processing
const BLINK_RATE_UPDATE_INTERVAL_MS = 5000; // Update blink rate every 5 seconds

// Mock data generator for demo purposes
const generateMockSessions = (): SessionData[] => {
  const now = new Date();

  return [
    {
      id: "session-1",
      startTime: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      endTime: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      isActive: false,
      averageBlinkRate: 7,
      blinkRateHistory: generateMockBlinkHistory(90, 7),
      quality: "poor",
      fatigueAlertCount: 2,
      duration: 5400, // 1h 30m
      totalBlinks: 630, // ~90 minutes * 7 blinks/min
    },
    {
      id: "session-2",
      startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      endTime: new Date(now.getTime() - 0.5 * 60 * 60 * 1000),
      isActive: false,
      averageBlinkRate: 11,
      blinkRateHistory: generateMockBlinkHistory(90, 11),
      quality: "fair",
      fatigueAlertCount: 0,
      duration: 5400, // 1h 30m
      totalBlinks: 990, // ~90 minutes * 11 blinks/min
    },
  ];
};

function generateMockBlinkHistory(
  minutes: number,
  avgRate: number
): BlinkRatePoint[] {
  const points: BlinkRatePoint[] = [];
  const now = Date.now();

  for (let i = 0; i < minutes; i += 5) {
    const variation = (Math.random() - 0.5) * 4;
    points.push({
      timestamp: now - (minutes - i) * 60 * 1000,
      rate: Math.max(5, Math.min(20, avgRate + variation)),
    });
  }

  return points;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [activeSession, setActiveSession] = useState<SessionData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [faceLostCountdown, setFaceLostCountdown] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionBaselineBlinkCount, setSessionBaselineBlinkCount] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Preload MediaPipe in background if camera permission was previously granted
  // This reduces perceived latency when user starts tracking
  useMediaPipePreloader();
  const lastBlinkUpdateRef = useRef<number>(Date.now());
  const blinkCountRef = useRef<number>(0); // Baseline blink count when session started
  const blinkCountStateRef = useRef<number>(0); // Current blink count (prevents stale closures)
  const sessionStartTimeRef = useRef<number>(Date.now());
  const faceDetectionLostTimeRef = useRef<number | null>(null);
  const currentFaceLostPeriodStartRef = useRef<number | null>(null); // Track start of current idle period
  const alertServiceRef = useRef<AlertService>(new AlertService());

  const { activeCalibration } = useCalibration();

  // Camera and blink detection hooks
  const { stream, videoRef, startCamera, stopCamera } =
    useCamera();

  const {
    blinkCount,
    currentEAR,
    start: startDetection,
    stop: stopDetection,
    processFrame,
  } = useBlinkDetection({
    earThreshold: activeCalibration?.earThreshold || 0.25,
    showDebugOverlay: false, // No visualization needed for background tracking
  });

  // Keep blinkCount ref in sync with state to prevent stale closures
  useEffect(() => {
    blinkCountStateRef.current = blinkCount;
  }, [blinkCount]);

  // Load mock sessions on mount and cleanup on unmount
  useEffect(() => {
    setSessions(generateMockSessions());
    const alertService = alertServiceRef.current;

    // Cleanup on unmount
    return () => {
      alertService.stopMonitoring();
    };
  }, []);

  /**
   * MediaStreamTrackProcessor for reliable frame capture
   *
   * CHROMIUM-SPECIFIC IMPLEMENTATION:
   * - Runs in main thread (W3C spec recommends worker-only usage)
   * - Required due to MediaStreamTrack transfer limitations to workers
   * - MediaStreamTrack objects cannot be cloned or transferred via postMessage
   *
   * ELECTRON ANTI-THROTTLING STRATEGY:
   * - Command-line flags: disable-renderer-backgrounding, disable-background-timer-throttling
   * - powerSaveBlocker.start('prevent-app-suspension') prevents macOS App Nap
   * - backgroundThrottling: false in webPreferences
   * - Combined, these maintain ~30 FPS even when window is minimized
   *
   * EVENT LOOP OPTIMIZATION:
   * - Uses setTimeout(0) macrotasks instead of Promise microtasks
   * - Prevents event loop starvation and allows UI updates
   *
   * RESOURCE MANAGEMENT:
   * - VideoFrame.close() called after each frame to release GPU memory
   * - Critical to prevent memory leaks with WebCodecs API
   */
  // Using 'any' for refs as MediaStreamTrackProcessor types aren't fully resolved at compile time
  // Type safety is enforced at usage sites through window.MediaStreamTrackProcessor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processorRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const readerRef = useRef<any>(null);
  const processingLoopActiveRef = useRef(false);

  // Initialize detection and start MediaStreamTrackProcessor when stream is ready
  useEffect(() => {
    let mounted = true;

    const initializeEverything = async () => {
      if (!stream || isInitialized || !isTracking) {
        return;
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        console.error('[SessionContext] No video track available for initialization');
        return;
      }

      // Wait for track to be live
      if (videoTrack.readyState !== 'live') {
        console.log('[SessionContext] Waiting for video track to be live...');
        await new Promise<void>((resolve) => {
          const checkState = () => {
            if (videoTrack.readyState === 'live') {
              resolve();
            } else {
              setTimeout(checkState, 100);
            }
          };
          checkState();
        });
      }

      // Small delay to ensure stable camera feed
      await new Promise((resolve) => setTimeout(resolve, CAMERA_STABILIZATION_DELAY_MS));

      if (!mounted) return;

      // Initialize MediaPipe detection - canvas is optional for visualization
      try {
        console.log('[SessionContext] Initializing MediaPipe detection...');
        await startDetection(canvasRef.current || undefined);

        if (mounted) {
          setIsInitialized(true);
          console.log('[SessionContext] Detection initialized successfully');

          // Start MediaStreamTrackProcessor-based frame capture
          console.log('[SessionContext] Starting MediaStreamTrackProcessor frame capture...');
          startTrackProcessor(videoTrack);
        }
      } catch (err) {
        console.error("[SessionContext] Failed to start detection:", err);
      }
    };

    initializeEverything();

    return () => {
      mounted = false;
    };
  }, [stream, isTracking, startDetection, isInitialized]);

  // Set video stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  // Use functional setState to avoid dependency on activeSession
  // This prevents cascading re-renders when session updates
  const updateActiveSessionBlinkRate = useCallback(
    (rate: number, totalBlinks: number) => {
      setActiveSession(prev => {
        if (!prev) return prev;

        const newPoint: BlinkRatePoint = {
          timestamp: Date.now(),
          rate,
        };

        const updatedHistory = [...prev.blinkRateHistory, newPoint];
        const avgRate =
          updatedHistory.reduce((sum, p) => sum + p.rate, 0) /
          updatedHistory.length;
        const quality = getSessionQuality(avgRate);

        const updatedSession: SessionData = {
          ...prev,
          blinkRateHistory: updatedHistory,
          averageBlinkRate: avgRate,
          quality,
          totalBlinks,
        };

        // Update sessions array with the new session data
        setSessions(prevSessions =>
          prevSessions.map(session =>
            session.id === updatedSession.id ? updatedSession : session
          )
        );

        return updatedSession;
      });
    },
    [] // No dependencies - prevents cascading re-renders
  );

  // Use functional setState to avoid dependency on activeSession
  const handleFatigueAlert = useCallback(() => {
    setActiveSession(prev => {
      if (!prev) return prev;

      const updatedSession: SessionData = {
        ...prev,
        fatigueAlertCount: prev.fatigueAlertCount + 1,
      };

      setSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === updatedSession.id ? updatedSession : session
        )
      );

      return updatedSession;
    });
  }, []);

  // Handle frame processing with face detection and blink rate updates
  // Only depend on values that affect the face detection state machine logic
  const handleFrameProcessing = useCallback(() => {
    // Check if face is detected based on having valid EAR
    const faceCurrentlyDetected = currentEAR > 0;

    // Handle face detection state changes
    if (faceCurrentlyDetected && !isFaceDetected) {
      // Face just detected (regained)
      setIsFaceDetected(true);
      setFaceLostCountdown(null); // Clear countdown
      faceDetectionLostTimeRef.current = null;

      // Close the current face lost period if one was started
      if (currentFaceLostPeriodStartRef.current !== null && activeSession) {
        const periodEnd = Date.now();
        const newPeriod = {
          start: currentFaceLostPeriodStartRef.current,
          end: periodEnd,
        };

        setActiveSession(prev => {
          if (!prev) return prev;

          const updatedSession = {
            ...prev,
            faceLostPeriods: [...(prev.faceLostPeriods || []), newPeriod],
          };

          // Update sessions array
          setSessions(prevSessions =>
            prevSessions.map(session =>
              session.id === updatedSession.id ? updatedSession : session
            )
          );

          return updatedSession;
        });

        currentFaceLostPeriodStartRef.current = null;
      }
    } else if (!faceCurrentlyDetected && isFaceDetected) {
      // Face just lost - start tracking and countdown
      if (!faceDetectionLostTimeRef.current) {
        faceDetectionLostTimeRef.current = Date.now();
        // Start tracking this idle period
        currentFaceLostPeriodStartRef.current = Date.now();
        // Immediately mark face as not detected for UI
        setIsFaceDetected(false);
        // Start countdown from 20 seconds
        setFaceLostCountdown(Math.ceil(FACE_DETECTION_LOST_TIMEOUT_MS / 1000));
      }
    } else if (!faceCurrentlyDetected && !isFaceDetected && faceDetectionLostTimeRef.current) {
      // Face is still lost - update countdown
      const elapsedMs = Date.now() - faceDetectionLostTimeRef.current;
      const remainingSeconds = Math.ceil((FACE_DETECTION_LOST_TIMEOUT_MS - elapsedMs) / 1000);

      if (remainingSeconds <= 0) {
        // Countdown finished - session will be closed by the effect
        setFaceLostCountdown(0);
      } else {
        setFaceLostCountdown(remainingSeconds);
      }
    }

    // Update session data (including chart history) periodically
    // Live blink count/rate are derived by consumers from source of truth values
    if (activeSession && Date.now() - lastBlinkUpdateRef.current > BLINK_RATE_UPDATE_INTERVAL_MS) {
      const timeElapsed =
        (Date.now() - sessionStartTimeRef.current) / 1000 / 60; // in minutes
      const blinksSinceStart = blinkCountStateRef.current - blinkCountRef.current;
      const currentBlinkRate =
        timeElapsed > 0 ? blinksSinceStart / timeElapsed : 0;

      updateActiveSessionBlinkRate(currentBlinkRate, blinksSinceStart);
      lastBlinkUpdateRef.current = Date.now();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEAR, isFaceDetected, updateActiveSessionBlinkRate]); // activeSession read from ref; blinkCount read from ref

  // Store stable references to avoid triggering worker callback changes
  const processFrameRef = useRef(processFrame);
  const handleFrameProcessingRef = useRef(handleFrameProcessing);

  useEffect(() => {
    processFrameRef.current = processFrame;
    handleFrameProcessingRef.current = handleFrameProcessing;
  }, [processFrame, handleFrameProcessing]);

  // Start MediaStreamTrackProcessor-based frame capture
  const startTrackProcessor = useCallback((track: MediaStreamTrack) => {
    // Check if MediaStreamTrackProcessor is available
    if (typeof window !== 'undefined' && !('MediaStreamTrackProcessor' in window)) {
      console.warn('[SessionContext] MediaStreamTrackProcessor not supported, using fallback');
      // Could fallback to ImageCapture or requestAnimationFrame here
      return;
    }

    try {
      processorRef.current = new window.MediaStreamTrackProcessor({ track });
      readerRef.current = processorRef.current.readable.getReader();
      processingLoopActiveRef.current = true;

      console.log('[SessionContext] MediaStreamTrackProcessor initialized');

      // FPS monitoring
      let frameCount = 0;
      let lastFpsLog = Date.now();

      // Start the frame processing loop
      // Uses setTimeout(0) to create macrotasks instead of microtasks
      // This prevents starving the event loop and allows UI updates
      const processLoop = async () => {
        if (!readerRef.current || !processingLoopActiveRef.current) {
          return;
        }

        try {
          const { value: frame, done } = await readerRef.current.read();

          if (done || !frame) {
            console.log('[SessionContext] Stream ended');
            processingLoopActiveRef.current = false;
            return;
          }

          // Process VideoFrame directly with MediaPipe
          // VideoFrame is a TexImageSource and can be used directly without conversion
          try {
            // Pass VideoFrame directly to MediaPipe (zero-copy, more efficient)
            await processFrameRef.current(frame, undefined);
            handleFrameProcessingRef.current();

            // FPS monitoring
            frameCount++;
            const now = Date.now();
            if (now - lastFpsLog >= FPS_LOG_INTERVAL_MS) {
              const fps = (frameCount / ((now - lastFpsLog) / 1000)).toFixed(1);
              console.log(`[SessionContext] FPS: ${fps}`);
              frameCount = 0;
              lastFpsLog = now;
            }
          } catch (error) {
            console.error('[SessionContext] Frame processing error:', error);
          } finally {
            // CRITICAL: Close the VideoFrame to release GPU memory
            frame.close();
          }

          // Continue processing if still active
          // Use setTimeout(0) to schedule as macrotask, allowing event loop breathing room
          if (processingLoopActiveRef.current) {
            setTimeout(processLoop, 0);
          }
        } catch (error) {
          console.error('[SessionContext] Frame read error:', error);
          processingLoopActiveRef.current = false;
        }
      };

      // Start the loop
      processLoop();
    } catch (error) {
      console.error('[SessionContext] Failed to initialize MediaStreamTrackProcessor:', error);
    }
  }, []);

  // Stop MediaStreamTrackProcessor
  const stopTrackProcessor = useCallback(() => {
    processingLoopActiveRef.current = false;

    if (readerRef.current) {
      try {
        readerRef.current.releaseLock();
      } catch (e) {
        // Ignore errors during cleanup
      }
      readerRef.current = null;
    }

    processorRef.current = null;
    console.log('[SessionContext] MediaStreamTrackProcessor stopped');
  }, []);

  const startSession = useCallback(() => {
    if (!isTracking || activeSession || !isFaceDetected) return;

    const newSession: SessionData = {
      id: `session-${Date.now()}`,
      startTime: new Date(),
      isActive: true,
      averageBlinkRate: 0,
      blinkRateHistory: [],
      quality: "good",
      fatigueAlertCount: 0,
      calibrationId: activeCalibration?.id,
      totalBlinks: 0,
      faceLostPeriods: [],
    };

    setActiveSession(newSession);
    setSessions((prev) => [newSession, ...prev]);
    blinkCountRef.current = blinkCount;
    sessionStartTimeRef.current = Date.now();
    currentFaceLostPeriodStartRef.current = null; // Reset idle period tracking
    // Set baseline values for consumers to derive live counts
    setSessionBaselineBlinkCount(blinkCount);
    setSessionStartTime(Date.now());
  }, [isTracking, activeSession, isFaceDetected, blinkCount, activeCalibration]);

  const stopSession = useCallback(() => {
    if (!activeSession) return;

    // Close any open face lost period
    const faceLostPeriods = [...(activeSession.faceLostPeriods || [])];
    if (currentFaceLostPeriodStartRef.current !== null) {
      faceLostPeriods.push({
        start: currentFaceLostPeriodStartRef.current,
        end: Date.now(),
      });
      currentFaceLostPeriodStartRef.current = null;
    }

    // Use ref to prevent stale closure
    const totalBlinks = blinkCountStateRef.current - blinkCountRef.current;
    const updatedSession: SessionData = {
      ...activeSession,
      endTime: new Date(),
      isActive: false,
      duration: Math.floor(
        (new Date().getTime() - activeSession.startTime.getTime()) / 1000
      ),
      totalBlinks,
      faceLostPeriods,
    };

    setActiveSession(null);
    setSessions((prev) =>
      prev.map((session) =>
        session.id === updatedSession.id ? updatedSession : session
      )
    );
  }, [activeSession]); // blinkCount read from ref

  // Internal function to set tracking state (used by both toggle and Electron IPC)
  const setTrackingState = useCallback(async (enabled: boolean) => {
    if (enabled === isTracking) return; // No change needed

    setIsTracking(enabled);

    // Notify Electron main process of state change (for tray menu sync)
    const electronAPI = getElectronAPI();
    if (electronAPI) {
      electronAPI.notifyTrackingStateChanged(enabled);
    }

    if (enabled) {
      // Start camera when enabling tracking
      try {
        await startCamera();
        // Start alert monitoring
        alertServiceRef.current.startMonitoring(
          () => activeSession,
          handleFatigueAlert
        );
      } catch (error) {
        console.error("Failed to start camera:", error);
        setIsTracking(false);
        // Notify Electron of failed state
        if (electronAPI) {
          electronAPI.notifyTrackingStateChanged(false);
        }
      }
    } else {
      // Stop everything when disabling tracking
      if (activeSession) {
        stopSession();
      }
      setIsInitialized(false);
      stopDetection();
      stopTrackProcessor(); // Stop MediaStreamTrackProcessor
      stopCamera();
      setIsFaceDetected(false);
      // Stop alert monitoring
      alertServiceRef.current.stopMonitoring();
    }
  }, [
    isTracking,
    activeSession,
    startCamera,
    stopCamera,
    stopDetection,
    stopTrackProcessor,
    stopSession,
    handleFatigueAlert,
  ]);

  const toggleTracking = useCallback(async () => {
    await setTrackingState(!isTracking);
  }, [isTracking, setTrackingState]);

  // Listen for tracking toggle commands from Electron main process (tray menu)
  useEffect(() => {
    const electronAPI = getElectronAPI();
    if (!electronAPI) return;

    // Subscribe to toggle-tracking events from main process
    const cleanup = electronAPI.onToggleTracking((enabled: boolean) => {
      console.log('[SessionContext] Received toggle-tracking from main process:', enabled);
      setTrackingState(enabled);
    });

    return cleanup;
  }, [setTrackingState]);

  // Start session when tracking is enabled and face is detected
  useEffect(() => {
    if (isTracking && isFaceDetected && !activeSession) {
      startSession();
    } else if (!isFaceDetected && activeSession && faceLostCountdown === 0) {
      // Stop session when countdown reaches 0
      stopSession();
      // Reset countdown and face detection lost time after session stops
      setFaceLostCountdown(null);
      faceDetectionLostTimeRef.current = null;
    }
  }, [isTracking, isFaceDetected, activeSession, faceLostCountdown, startSession, stopSession]);

  const contextValue: SessionContextType = {
    sessions,
    activeSession,
    isTracking,
    isFaceDetected,
    faceLostCountdown,
    toggleTracking,
    videoRef,
    canvasRef,
    currentBlinkCount: blinkCount,
    sessionBaselineBlinkCount,
    sessionStartTime,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
