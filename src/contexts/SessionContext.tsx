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

  // ImageCapture for UI-independent processing
  const imageCaptureRef = useRef<ImageCapture | null>(null);
  const processingActiveRef = useRef(false);

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

  // Initialize ImageCapture from camera stream for UI-independent processing
  useEffect(() => {
    if (!stream) {
      imageCaptureRef.current = null;
      return;
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      console.error('[ImageCapture] No video track available');
      return;
    }

    // Define event handler so we can properly remove it later
    const handleTrackEnded = () => {
      console.warn('[ImageCapture] Video track ended');
      imageCaptureRef.current = null;
    };

    try {
      imageCaptureRef.current = new ImageCapture(videoTrack);
      console.log('[ImageCapture] Initialized:', {
        label: videoTrack.label,
        enabled: videoTrack.enabled,
        readyState: videoTrack.readyState,
        settings: videoTrack.getSettings(),
      });

      // Listen for track end
      videoTrack.addEventListener('ended', handleTrackEnded);
    } catch (error) {
      console.error('[ImageCapture] Initialization failed:', error);
      imageCaptureRef.current = null;
    }

    return () => {
      console.log('[ImageCapture] Cleaning up');
      videoTrack.removeEventListener('ended', handleTrackEnded);
      imageCaptureRef.current = null;
    };
  }, [stream]);

  // Initialize detection when stream is ready
  useEffect(() => {
    let mounted = true;

    const initializeEverything = async () => {
      // Remove canvas requirement - it's optional for visualization only
      if (!stream || !videoRef.current || isInitialized || !isTracking) {
        return;
      }

      const video = videoRef.current;

      // Wait for video to be ready with metadata
      if (video.readyState < 3) {
        await new Promise<void>((resolve) => {
          const handleLoadedData = () => {
            video.removeEventListener("loadeddata", handleLoadedData);
            resolve();
          };
          video.addEventListener("loadeddata", handleLoadedData);
        });
      }

      // Ensure video has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn('Video dimensions are 0, waiting for metadata...');
        await new Promise<void>((resolve) => {
          const handleLoadedMetadata = () => {
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
            resolve();
          };
          video.addEventListener("loadedmetadata", handleLoadedMetadata);
        });
      }

      // Small delay to ensure stable video feed
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (!mounted) return;

      // Initialize detection
      try {
        await startDetection(canvasRef.current || undefined);
        if (mounted) {
          setIsInitialized(true);
        }
      } catch (err) {
        console.error("Failed to start detection:", err);
      }
    };

    initializeEverything();

    return () => {
      mounted = false;
    };
  }, [stream, isTracking, startDetection, isInitialized, videoRef]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally exclude activeSession, blinkCount, and updateActiveSessionBlinkRate to prevent cascading re-renders (see PR #40)
  const handleFrameProcessing = useCallback(() => {
    // Safety check: If ImageCapture is not available, reset state
    if (!imageCaptureRef.current || !processingActiveRef.current) {
      if (isFaceDetected) {
        console.log('[SessionContext] ImageCapture unavailable, resetting face detection state');
        setIsFaceDetected(false);
      }
      return;
    }

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
  }, [currentEAR, isFaceDetected]); // activeSession, blinkCount read from closure; updateActiveSessionBlinkRate is stable

  // Store stable references to avoid processing loop restarts
  const processFrameRef = useRef(processFrame);
  const handleFrameProcessingRef = useRef(handleFrameProcessing);

  useEffect(() => {
    processFrameRef.current = processFrame;
    handleFrameProcessingRef.current = handleFrameProcessing;
  }, [processFrame, handleFrameProcessing]);

  // ImageCapture processing loop - runs independently of UI video element
  useEffect(() => {
    if (!imageCaptureRef.current || !isTracking || !isInitialized) {
      processingActiveRef.current = false;
      return;
    }

    processingActiveRef.current = true;
    let frameCount = 0;
    let lastLogTime = Date.now();
    const startTime = Date.now();

    const processLoop = async () => {
      if (!processingActiveRef.current || !imageCaptureRef.current) {
        return;
      }

      try {
        const grabStart = performance.now();

        // Grab frame directly from camera track (Chromium-optimized)
        const imageBitmap = await imageCaptureRef.current.grabFrame();

        const grabTime = performance.now() - grabStart;
        const processStart = performance.now();

        // Feed ImageBitmap to MediaPipe processing (use ref to avoid loop restarts)
        await processFrameRef.current(imageBitmap, undefined);

        // Trigger frame processing callback for session stats (use ref to avoid loop restarts)
        handleFrameProcessingRef.current();

        const processTime = performance.now() - processStart;
        frameCount++;

        // Log stats every 5 seconds (only in development)
        if (process.env.NODE_ENV === 'development' && Date.now() - lastLogTime > 5000) {
          const elapsed = (Date.now() - startTime) / 1000;
          const actualFps = frameCount / 5;

          console.log('[ImageCapture] Performance:', {
            fps: actualFps.toFixed(1),
            avgGrabTime: `${grabTime.toFixed(2)}ms`,
            avgProcessTime: `${processTime.toFixed(2)}ms`,
            totalTime: `${(grabTime + processTime).toFixed(2)}ms`,
            bitmapSize: `${imageBitmap.width}x${imageBitmap.height}`,
            uptime: `${elapsed.toFixed(0)}s`,
          });

          frameCount = 0;
          lastLogTime = Date.now();
        }

        // Schedule next frame (target 30fps = ~33ms)
        // grabFrame() auto-throttles, so setTimeout ensures we don't overload
        if (processingActiveRef.current) {
          setTimeout(processLoop, 1000 / 30);
        }
      } catch (error) {
        console.error('[ImageCapture] Frame capture failed:', error);

        // Retry after delay on error
        if (processingActiveRef.current) {
          setTimeout(processLoop, 100);
        }
      }
    };

    console.log('[ImageCapture] Starting processing loop at 30fps');
    processLoop();

    return () => {
      console.log('[ImageCapture] Stopping processing loop');
      processingActiveRef.current = false;
    };
  }, [isTracking, isInitialized]); // Removed processFrame and handleFrameProcessing - using refs instead

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
  }, [activeSession, blinkCount]);

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
