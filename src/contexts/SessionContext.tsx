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
import { useCalibration } from "./CalibrationContext";
import { AlertService } from "../lib/alert-service";

interface SessionContextType {
  sessions: SessionData[];
  activeSession: SessionData | null;
  isTracking: boolean;
  isFaceDetected: boolean;
  toggleTracking: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

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
  const [isInitialized, setIsInitialized] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastBlinkUpdateRef = useRef<number>(Date.now());
  const blinkCountRef = useRef<number>(0); // Baseline blink count when session started
  const blinkCountStateRef = useRef<number>(0); // Current blink count (prevents stale closures)
  const sessionStartTimeRef = useRef<number>(Date.now());
  const faceDetectionLostTimeRef = useRef<number | null>(null);
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

  // MediaStreamTrackProcessor for reliable frame capture (runs in main thread)
  // Combined with Electron anti-throttling flags, this provides consistent FPS even when minimized
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processorRef = useRef<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const readerRef = useRef<any | null>(null);
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
      await new Promise((resolve) => setTimeout(resolve, 200));

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
      // Face just detected
      setIsFaceDetected(true);
      faceDetectionLostTimeRef.current = null;
    } else if (!faceCurrentlyDetected && isFaceDetected) {
      // Face just lost - start 10-second timer
      if (!faceDetectionLostTimeRef.current) {
        faceDetectionLostTimeRef.current = Date.now();
      } else {
        // Check if 10 seconds have passed
        if (Date.now() - faceDetectionLostTimeRef.current > 10000) {
          setIsFaceDetected(false);
        }
      }
    }

    // Update blink rate every 5 seconds
    // Read from refs to avoid stale closures while preventing effect restarts
    if (activeSession && Date.now() - lastBlinkUpdateRef.current > 5000) {
      const timeElapsed =
        (Date.now() - sessionStartTimeRef.current) / 1000 / 60; // in minutes
      // Use ref instead of closure value to prevent stale reads
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      processorRef.current = new (window as any).MediaStreamTrackProcessor({ track });
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

          // Convert VideoFrame to ImageBitmap for MediaPipe compatibility
          // MediaPipe's detectForVideo expects ImageBitmap, not VideoFrame
          let imageBitmap: ImageBitmap | null = null;
          try {
            imageBitmap = await createImageBitmap(frame);

            // Process the bitmap with MediaPipe
            await processFrameRef.current(imageBitmap, undefined);
            handleFrameProcessingRef.current();

            // FPS monitoring
            frameCount++;
            const now = Date.now();
            if (now - lastFpsLog >= 5000) {
              const fps = (frameCount / ((now - lastFpsLog) / 1000)).toFixed(1);
              console.log(`[SessionContext] FPS: ${fps}`);
              frameCount = 0;
              lastFpsLog = now;
            }
          } catch (error) {
            console.error('[SessionContext] Frame processing error:', error);
          } finally {
            // CRITICAL: Close both the frame and bitmap to release resources
            if (imageBitmap) {
              imageBitmap.close();
            }
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
    };

    setActiveSession(newSession);
    setSessions((prev) => [newSession, ...prev]);
    blinkCountRef.current = blinkCount;
    sessionStartTimeRef.current = Date.now();
  }, [isTracking, activeSession, isFaceDetected, blinkCount, activeCalibration]);

  const stopSession = useCallback(() => {
    if (!activeSession) return;

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
    };

    setActiveSession(null);
    setSessions((prev) =>
      prev.map((session) =>
        session.id === updatedSession.id ? updatedSession : session
      )
    );
  }, [activeSession]); // blinkCount read from ref

  const toggleTracking = useCallback(async () => {
    const newTrackingState = !isTracking;
    setIsTracking(newTrackingState);

    if (newTrackingState) {
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

  // Start session when tracking is enabled and face is detected
  useEffect(() => {
    if (isTracking && isFaceDetected && !activeSession) {
      startSession();
    } else if (!isFaceDetected && activeSession) {
      // Only stop session if face has been lost for more than 10 seconds
      if (
        faceDetectionLostTimeRef.current &&
        Date.now() - faceDetectionLostTimeRef.current > 10000
      ) {
        stopSession();
      }
    }
  }, [isTracking, isFaceDetected, activeSession, startSession, stopSession]);

  const contextValue: SessionContextType = {
    sessions,
    activeSession,
    isTracking,
    isFaceDetected,
    toggleTracking,
    videoRef,
    canvasRef,
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
