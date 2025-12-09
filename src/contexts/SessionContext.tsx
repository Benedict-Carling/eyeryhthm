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
  BlinkEvent,
  getSessionQuality,
  MAX_BLINK_RATE,
} from "../lib/sessions/types";
import { SessionStorageService } from "../lib/sessions/session-storage-service";
import { useCamera } from "../hooks/useCamera";
import { useBlinkDetection } from "../hooks/useBlinkDetection";
import { useCalibration } from "./CalibrationContext";
import { AlertService } from "../lib/alert-service";
import { getElectronAPI } from "../lib/electron";

interface SessionContextType {
  sessions: SessionData[];
  activeSession: SessionData | null;
  isTracking: boolean;
  isInitializing: boolean; // true when tracking is enabled but MediaPipe/camera stack is still loading
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
const FACE_DETECTION_LOST_TIMEOUT_MS = 60000; // Stop session if face lost for 60 seconds
const CAMERA_STABILIZATION_DELAY_MS = 200; // Wait for stable camera feed before processing
const BLINK_RATE_UPDATE_INTERVAL_MS = 5000; // Update blink rate every 5 seconds
const WINDOWED_RATE_DURATION_MS = 30000; // 30-second window for calculating current blink rate
const MIN_SESSION_TIME_FOR_RATE_MS = WINDOWED_RATE_DURATION_MS; // Wait for full window before first reading

// Mock data generator for demo purposes
const generateMockSessions = (): SessionData[] => {
  const now = new Date();

  const session1Start = now.getTime() - 4 * 60 * 60 * 1000;
  const session1End = now.getTime() - 2.5 * 60 * 60 * 1000;
  const session2Start = now.getTime() - 2 * 60 * 60 * 1000;
  const session2End = now.getTime() - 0.5 * 60 * 60 * 1000;

  return [
    {
      id: "session-1",
      startTime: new Date(session1Start),
      endTime: new Date(session1End),
      isActive: false,
      averageBlinkRate: 7,
      blinkEvents: generateMockBlinkEvents(session1Start, session1End, 7),
      quality: "poor",
      fatigueAlertCount: 2,
      duration: 5400, // 1h 30m
      totalBlinks: 630, // ~90 minutes * 7 blinks/min
      isExample: true,
      calibrationId: "default", // Factory Default calibration
    },
    {
      id: "session-2",
      startTime: new Date(session2Start),
      endTime: new Date(session2End),
      isActive: false,
      averageBlinkRate: 11,
      blinkEvents: generateMockBlinkEvents(session2Start, session2End, 11),
      quality: "fair",
      fatigueAlertCount: 0,
      duration: 5400, // 1h 30m
      totalBlinks: 990, // ~90 minutes * 11 blinks/min
      isExample: true,
      calibrationId: "default", // Factory Default calibration
    },
  ];
};

// Generate realistic mock blink events with some variation
function generateMockBlinkEvents(
  startTime: number,
  endTime: number,
  avgRate: number
): BlinkEvent[] {
  const events: BlinkEvent[] = [];
  const durationMs = endTime - startTime;
  const durationMinutes = durationMs / 60000;

  // Total expected blinks based on average rate
  const totalBlinks = Math.round(durationMinutes * avgRate);

  // Distribute blinks across the session with some randomness
  for (let i = 0; i < totalBlinks; i++) {
    // Add some variation to the timing (not perfectly uniform)
    const baseProgress = i / totalBlinks;
    const variation = (Math.random() - 0.5) * 0.02; // +/- 1% variation
    const progress = Math.max(0, Math.min(1, baseProgress + variation));

    events.push({
      timestamp: startTime + progress * durationMs,
      duration: 100 + Math.random() * 100, // 100-200ms blink duration
    });
  }

  // Sort by timestamp
  events.sort((a, b) => a.timestamp - b.timestamp);

  return events;
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
  const lastBlinkUpdateRef = useRef<number>(Date.now());
  const blinkCountRef = useRef<number>(0); // Baseline blink count when session started
  const blinkCountStateRef = useRef<number>(0); // Current blink count (prevents stale closures)
  const sessionStartTimeRef = useRef<number>(Date.now());
  const faceDetectionLostTimeRef = useRef<number | null>(null);
  const currentFaceLostPeriodStartRef = useRef<number | null>(null); // Track start of current idle period
  const alertServiceRef = useRef<AlertService>(new AlertService());
  // Track the last state we sent to main process to detect if incoming toggle is a response to our change
  const lastSentStateRef = useRef<boolean | null>(null);
  // Keep activeSession in ref to avoid stale closures in AlertService monitoring
  const activeSessionRef = useRef<SessionData | null>(null);
  // History of blink count snapshots for windowed rate calculation
  // Each entry is { timestamp, blinkCount } - we keep entries within the window duration
  const blinkSnapshotsRef = useRef<Array<{ timestamp: number; blinkCount: number }>>([]);

  const { activeCalibration } = useCalibration();

  // Camera and blink detection hooks
  const { stream, videoRef, startCamera, stopCamera } =
    useCamera();

  // Keep camera functions in refs to avoid stale closures
  const stopCameraRef = useRef(stopCamera);
  stopCameraRef.current = stopCamera;

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

  // Keep activeSession ref in sync with state for AlertService monitoring
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Load persisted sessions on mount (or mock data if none exist) and cleanup on unmount
  useEffect(() => {
    // Check if there are persisted sessions in localStorage
    if (SessionStorageService.hasPersistedSessions()) {
      const persistedSessions = SessionStorageService.getAllSessions();
      setSessions(persistedSessions);
    } else {
      // No persisted sessions - show example sessions for new users
      setSessions(generateMockSessions());
    }

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

  // Track the last recorded blink count to detect new blinks
  const lastRecordedBlinkCountRef = useRef<number>(0);

  // Record a new blink event
  const recordBlinkEvent = useCallback((blinkTimestamp: number) => {
    setActiveSession(prev => {
      if (!prev) return prev;

      const newEvent: BlinkEvent = {
        timestamp: blinkTimestamp,
      };

      const updatedEvents = [...prev.blinkEvents, newEvent];

      // Calculate average blink rate from events
      const sessionDurationMs = Date.now() - prev.startTime.getTime();
      const sessionDurationMinutes = sessionDurationMs / 60000;
      const avgRate = sessionDurationMinutes > 0
        ? updatedEvents.length / sessionDurationMinutes
        : 0;
      const quality = getSessionQuality(avgRate);

      const updatedSession: SessionData = {
        ...prev,
        blinkEvents: updatedEvents,
        averageBlinkRate: avgRate,
        quality,
        totalBlinks: updatedEvents.length,
      };

      // Update sessions array with the new session data
      setSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === updatedSession.id ? updatedSession : session
        )
      );

      return updatedSession;
    });
  }, []);

  // Update session stats periodically (for UI updates without new blinks)
  const updateSessionStats = useCallback((totalBlinks: number) => {
    setActiveSession(prev => {
      if (!prev) return prev;

      // Calculate average blink rate from events
      const sessionDurationMs = Date.now() - prev.startTime.getTime();
      const sessionDurationMinutes = sessionDurationMs / 60000;
      const avgRate = sessionDurationMinutes > 0
        ? prev.blinkEvents.length / sessionDurationMinutes
        : 0;
      const quality = getSessionQuality(avgRate);

      const updatedSession: SessionData = {
        ...prev,
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
  }, []);

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
        // Start countdown from timeout value (60 seconds)
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

    // Record individual blink events when new blinks are detected
    if (activeSession) {
      const currentBlinksSinceStart = blinkCountStateRef.current - blinkCountRef.current;
      const lastRecordedBlinks = lastRecordedBlinkCountRef.current;

      // Check if new blinks occurred since last check
      if (currentBlinksSinceStart > lastRecordedBlinks) {
        const newBlinksCount = currentBlinksSinceStart - lastRecordedBlinks;
        const now = Date.now();

        // Record each new blink event
        // For simplicity, we assign the current timestamp to all new blinks
        // In reality they may have occurred slightly earlier within this frame interval
        for (let i = 0; i < newBlinksCount; i++) {
          recordBlinkEvent(now);
        }

        lastRecordedBlinkCountRef.current = currentBlinksSinceStart;
      }

      // Periodically update session stats (for UI updates)
      if (Date.now() - lastBlinkUpdateRef.current > BLINK_RATE_UPDATE_INTERVAL_MS) {
        updateSessionStats(currentBlinksSinceStart);
        lastBlinkUpdateRef.current = Date.now();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEAR, isFaceDetected, recordBlinkEvent, updateSessionStats]); // activeSession read from ref; blinkCount read from ref

  // Store stable references to avoid triggering worker callback changes
  const processFrameRef = useRef(processFrame);
  const handleFrameProcessingRef = useRef(handleFrameProcessing);

  useEffect(() => {
    processFrameRef.current = processFrame;
    handleFrameProcessingRef.current = handleFrameProcessing;
  }, [processFrame, handleFrameProcessing]);

  // Fallback frame processing using requestAnimationFrame for browsers without MediaStreamTrackProcessor
  const startRafFallback = useCallback(() => {
    processingLoopActiveRef.current = true;
    console.log('[SessionContext] Using requestAnimationFrame fallback for frame processing');

    // FPS monitoring
    let frameCount = 0;
    let lastFpsLog = Date.now();

    const processLoop = async () => {
      if (!processingLoopActiveRef.current || !videoRef.current) {
        return;
      }

      const video = videoRef.current;
      if (video.readyState >= 2) {
        try {
          await processFrameRef.current(video, undefined);
          handleFrameProcessingRef.current();

          // FPS monitoring
          frameCount++;
          const now = Date.now();
          if (now - lastFpsLog >= FPS_LOG_INTERVAL_MS) {
            const fps = (frameCount / ((now - lastFpsLog) / 1000)).toFixed(1);
            console.log(`[SessionContext] FPS (fallback): ${fps}`);
            frameCount = 0;
            lastFpsLog = now;
          }
        } catch (error) {
          console.error('[SessionContext] Frame processing error (fallback):', error);
        }
      }

      if (processingLoopActiveRef.current) {
        requestAnimationFrame(processLoop);
      }
    };

    requestAnimationFrame(processLoop);
  }, [videoRef]);

  // Start MediaStreamTrackProcessor-based frame capture
  const startTrackProcessor = useCallback((track: MediaStreamTrack) => {
    // Check if MediaStreamTrackProcessor is available
    if (typeof window !== 'undefined' && !('MediaStreamTrackProcessor' in window)) {
      console.warn('[SessionContext] MediaStreamTrackProcessor not supported, using requestAnimationFrame fallback');
      startRafFallback();
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
  }, [startRafFallback]);

  // Stop MediaStreamTrackProcessor
  // Returns a promise to ensure cleanup completes before stopping the camera
  const stopTrackProcessor = useCallback(async () => {
    processingLoopActiveRef.current = false;

    if (readerRef.current) {
      try {
        // Cancel the reader first to signal we're done reading
        // This properly closes the stream and releases camera resources on Windows
        await readerRef.current.cancel();
      } catch (e) {
        // Ignore errors during cancel (stream may already be closed)
      }
      try {
        readerRef.current.releaseLock();
      } catch (e) {
        // Ignore errors during cleanup (lock may already be released)
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
      blinkEvents: [], // Individual blink events
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
    blinkSnapshotsRef.current = []; // Reset blink snapshots for windowed rate calculation
    lastRecordedBlinkCountRef.current = 0; // Reset blink event tracking
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

    // Persist session to localStorage (service handles min duration check)
    SessionStorageService.saveSession(updatedSession);
  }, [activeSession]); // blinkCount read from ref

  // Internal function to set tracking state (used by both toggle and Electron IPC)
  const setTrackingState = useCallback(async (enabled: boolean) => {
    if (enabled === isTracking) return; // No change needed

    setIsTracking(enabled);

    // Notify Electron main process of state change (for tray menu sync)
    const electronAPI = getElectronAPI();
    if (electronAPI) {
      // Track what state we're sending so we can ignore the echo from main
      lastSentStateRef.current = enabled;
      electronAPI.notifyTrackingStateChanged(enabled);
    }

    if (enabled) {
      // Start camera when enabling tracking
      try {
        await startCamera();
        // Start alert monitoring (use ref to avoid stale closure)
        alertServiceRef.current.startMonitoring(
          () => activeSessionRef.current,
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
      // Await stopTrackProcessor to ensure reader is properly cancelled
      // before stopping the camera - critical for Windows camera cleanup
      await stopTrackProcessor();
      // Use ref to ensure we call the current stopCamera, not a stale closure
      stopCameraRef.current();
      setIsFaceDetected(false);
      // Stop alert monitoring
      alertServiceRef.current.stopMonitoring();
    }
  }, [
    isTracking,
    activeSession,
    startCamera,
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
      // Ignore if this is an echo of a state we just sent (prevents feedback loop)
      // But only ignore if it matches what we sent - a different state means tray initiated it
      if (lastSentStateRef.current === enabled) {
        // This is likely an echo from our own change, ignore it
        lastSentStateRef.current = null; // Reset so next toggle works
        return;
      }
      // This is a new toggle from tray menu
      lastSentStateRef.current = null;
      setTrackingState(enabled);
    });

    return cleanup;
  }, [setTrackingState]);

  // Listen for system suspend event to gracefully stop tracking
  // This prevents state desync when the OS kills the camera during sleep
  useEffect(() => {
    const electronAPI = getElectronAPI();
    if (!electronAPI?.onSystemSuspend) return;

    const cleanup = electronAPI.onSystemSuspend(() => {
      console.log('[SessionContext] System suspending - stopping tracking');
      if (isTracking) {
        setTrackingState(false);
      }
    });

    return cleanup;
  }, [isTracking, setTrackingState]);

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
    isInitializing: isTracking && !isInitialized,
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
