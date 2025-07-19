'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { SessionData, BlinkRatePoint, getSessionQuality } from '../lib/sessions/types';
import { useCamera } from '../hooks/useCamera';
import { useBlinkDetection } from '../hooks/useBlinkDetection';
import { useAnimationFrame } from '../hooks/useAnimationFrame';
import { useCalibration } from './CalibrationContext';

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
      id: 'session-1',
      startTime: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      endTime: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      isActive: false,
      averageBlinkRate: 7,
      blinkRateHistory: generateMockBlinkHistory(90, 7),
      quality: 'poor',
      fatigueAlertCount: 2,
      duration: 5400, // 1h 30m
    },
    {
      id: 'session-2',
      startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      endTime: new Date(now.getTime() - 0.5 * 60 * 60 * 1000),
      isActive: false,
      averageBlinkRate: 11,
      blinkRateHistory: generateMockBlinkHistory(90, 11),
      quality: 'fair',
      fatigueAlertCount: 0,
      duration: 5400, // 1h 30m
    },
  ];
};

function generateMockBlinkHistory(minutes: number, avgRate: number): BlinkRatePoint[] {
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
  const {
    stream,
    videoRef,
    startCamera,
    stopCamera,
    hasPermission,
  } = useCamera();
  
  const {
    blinkCount,
    currentEAR,
    isReady: isDetectorReady,
    start: startDetection,
    stop: stopDetection,
    processFrame,
  } = useBlinkDetection({
    earThreshold: activeCalibration?.earThreshold || 0.25,
  });

  // Load mock sessions on mount
  useEffect(() => {
    setSessions(generateMockSessions());
  }, []);

  // Initialize detection when stream is ready
  useEffect(() => {
    let mounted = true;

    const initializeEverything = async () => {
      if (!stream || !videoRef.current || !canvasRef.current || isInitialized || !isTracking) {
        return;
      }

      const video = videoRef.current;
      
      // Wait for video to be ready
      if (video.readyState < 2) {
        await new Promise<void>((resolve) => {
          const handleCanPlay = () => {
            video.removeEventListener('canplay', handleCanPlay);
            resolve();
          };
          video.addEventListener('canplay', handleCanPlay);
        });
      }

      // Small delay to ensure stable video feed
      await new Promise(resolve => setTimeout(resolve, 200));

      if (!mounted) return;

      // Initialize detection
      try {
        await startDetection(canvasRef.current);
        if (mounted) {
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('Failed to start detection:', err);
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

  // Animation frame for continuous detection
  const handleAnimationFrame = useCallback(() => {
    if (videoRef.current && isInitialized && isTracking) {
      // Ensure canvas dimensions match video
      if (canvasRef.current && videoRef.current.videoWidth > 0) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }
      
      processFrame(videoRef.current, canvasRef.current);
      
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
        const timeElapsed = (Date.now() - sessionStartTimeRef.current) / 1000 / 60; // in minutes
        const blinksSinceStart = blinkCount - blinkCountRef.current;
        const currentBlinkRate = timeElapsed > 0 ? blinksSinceStart / timeElapsed : 0;
        
        updateActiveSessionBlinkRate(currentBlinkRate);
        lastBlinkUpdateRef.current = Date.now();
      }
    }
  }, [processFrame, isInitialized, isTracking, currentEAR, isFaceDetected, activeSession, blinkCount]);

  useAnimationFrame(handleAnimationFrame, isInitialized && isTracking);

  const startSession = useCallback(() => {
    if (!isTracking || activeSession || !isFaceDetected) return;

    const newSession: SessionData = {
      id: `session-${Date.now()}`,
      startTime: new Date(),
      isActive: true,
      averageBlinkRate: 0,
      blinkRateHistory: [],
      quality: 'good',
      fatigueAlertCount: 0,
    };

    setActiveSession(newSession);
    setSessions(prev => [newSession, ...prev]);
    blinkCountRef.current = blinkCount;
    sessionStartTimeRef.current = Date.now();
  }, [isTracking, activeSession, isFaceDetected, blinkCount]);

  const stopSession = useCallback(() => {
    if (!activeSession) return;

    const updatedSession: SessionData = {
      ...activeSession,
      endTime: new Date(),
      isActive: false,
      duration: Math.floor((new Date().getTime() - activeSession.startTime.getTime()) / 1000),
    };

    setActiveSession(null);
    setSessions(prev => 
      prev.map(session => 
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
        console.error('Failed to start camera:', error);
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
  }, [isTracking, activeSession, startCamera, stopCamera, stopDetection, stopSession]);

  const updateActiveSessionBlinkRate = useCallback((rate: number) => {
    if (!activeSession) return;

    const newPoint: BlinkRatePoint = {
      timestamp: Date.now(),
      rate,
    };

    const updatedHistory = [...activeSession.blinkRateHistory, newPoint];
    const avgRate = updatedHistory.reduce((sum, p) => sum + p.rate, 0) / updatedHistory.length;
    const quality = getSessionQuality(avgRate);

    const updatedSession: SessionData = {
      ...activeSession,
      blinkRateHistory: updatedHistory,
      averageBlinkRate: avgRate,
      quality,
    };

    setActiveSession(updatedSession);
    setSessions(prev =>
      prev.map(session =>
        session.id === updatedSession.id ? updatedSession : session
      )
    );
  }, [activeSession]);

  // Start session when tracking is enabled and face is detected
  useEffect(() => {
    if (isTracking && isFaceDetected && !activeSession) {
      startSession();
    } else if (!isFaceDetected && activeSession) {
      // Only stop session if face has been lost for more than 10 seconds
      if (faceDetectionLostTimeRef.current && 
          Date.now() - faceDetectionLostTimeRef.current > 10000) {
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
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}