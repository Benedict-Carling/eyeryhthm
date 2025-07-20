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
import { useFrameProcessor } from "../hooks/useFrameProcessor";
import { useCalibration } from "./CalibrationContext";

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
      calibrationId: "default-calibration-1",
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
      calibrationId: "default-calibration-1",
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
  const blinkCountRef = useRef<number>(0);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const faceDetectionLostTimeRef = useRef<number | null>(null);

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

  // Load mock sessions on mount
  useEffect(() => {
    setSessions(generateMockSessions());
  }, []);

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

  const updateActiveSessionBlinkRate = useCallback(
    (rate: number) => {
      if (!activeSession) return;

      const newPoint: BlinkRatePoint = {
        timestamp: Date.now(),
        rate,
      };

      const updatedHistory = [...activeSession.blinkRateHistory, newPoint];
      const avgRate =
        updatedHistory.reduce((sum, p) => sum + p.rate, 0) /
        updatedHistory.length;
      const quality = getSessionQuality(avgRate);

      const updatedSession: SessionData = {
        ...activeSession,
        blinkRateHistory: updatedHistory,
        averageBlinkRate: avgRate,
        quality,
      };

      setActiveSession(updatedSession);
      setSessions((prev) =>
        prev.map((session) =>
          session.id === updatedSession.id ? updatedSession : session
        )
      );
    },
    [activeSession]
  );

  // Handle frame processing with face detection and blink rate updates
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
    if (activeSession && Date.now() - lastBlinkUpdateRef.current > 5000) {
      const timeElapsed =
        (Date.now() - sessionStartTimeRef.current) / 1000 / 60; // in minutes
      const blinksSinceStart = blinkCount - blinkCountRef.current;
      const currentBlinkRate =
        timeElapsed > 0 ? blinksSinceStart / timeElapsed : 0;

      updateActiveSessionBlinkRate(currentBlinkRate);
      lastBlinkUpdateRef.current = Date.now();
    }
  }, [currentEAR, isFaceDetected, activeSession, blinkCount, updateActiveSessionBlinkRate]);

  // Use the shared frame processor hook
  useFrameProcessor({
    videoRef,
    canvasRef,
    processFrame,
    onFrame: handleFrameProcessing,
    isEnabled: isInitialized && isTracking,
  });

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
    };

    setActiveSession(newSession);
    setSessions((prev) => [newSession, ...prev]);
    blinkCountRef.current = blinkCount;
    sessionStartTimeRef.current = Date.now();
  }, [isTracking, activeSession, isFaceDetected, blinkCount, activeCalibration]);

  const stopSession = useCallback(() => {
    if (!activeSession) return;

    const updatedSession: SessionData = {
      ...activeSession,
      endTime: new Date(),
      isActive: false,
      duration: Math.floor(
        (new Date().getTime() - activeSession.startTime.getTime()) / 1000
      ),
    };

    setActiveSession(null);
    setSessions((prev) =>
      prev.map((session) =>
        session.id === updatedSession.id ? updatedSession : session
      )
    );
  }, [activeSession]);

  const toggleTracking = useCallback(async () => {
    const newTrackingState = !isTracking;
    setIsTracking(newTrackingState);

    if (newTrackingState) {
      // Start camera when enabling tracking
      try {
        await startCamera();
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
    }
  }, [
    isTracking,
    activeSession,
    startCamera,
    stopCamera,
    stopDetection,
    stopSession,
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
