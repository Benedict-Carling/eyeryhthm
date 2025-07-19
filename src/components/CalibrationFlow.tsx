'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  Flex,
  Text,
  Button,
  Progress,
  Badge,
  Heading,
  Callout,
} from '@radix-ui/themes';
import { useCalibration } from '../contexts/CalibrationContext';
import { useCamera } from '../hooks/useCamera';
import { useBlinkDetection } from '../hooks/useBlinkDetection';
import { CalibrationService } from '../lib/calibration/calibration-service';
import { BlinkEvent, CalibrationRawData, CalibrationMetadata } from '../lib/blink-detection/types';

interface CalibrationFlowProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function CalibrationFlow({ onComplete, onCancel }: CalibrationFlowProps) {
  const {
    calibrationProgress,
    updateCalibrationProgress,
    completeCalibration,
    stopCalibration,
  } = useCalibration();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const {
    stream,
    videoRef,
    startCamera,
    stopCamera,
  } = useCamera({
    onVideoReady: () => {
      startDetection();
    }
  });

  const {
    blinkCount,
    currentEAR,
    isBlinking,
    isDetectorReady,
    resetBlinkCounter,
    startDetection,
    stopDetection,
  } = useBlinkDetection({
    videoElement: videoRef.current,
    canvasElement: canvasRef.current,
    autoStart: false
  });

  const [phase, setPhase] = useState<'setup' | 'countdown' | 'calibrating' | 'analyzing' | 'complete'>('setup');
  const [countdown, setCountdown] = useState(3);
  const [calibrationData, setCalibrationData] = useState<{
    blinkEvents: BlinkEvent[];
    earValues: number[];
    timestamps: number[];
  }>({
    blinkEvents: [],
    earValues: [],
    timestamps: [],
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const earCollectionRef = useRef<NodeJS.Timeout | null>(null);
  const lastBlinkCountRef = useRef(0);
  const calibrationStartTime = useRef<number>(0);
  const targetBlinks = 10;
  const blinkInterval = 2000; // 2 seconds between blinks

  // Start EAR value collection when calibrating
  useEffect(() => {
    if (phase === 'calibrating' && isDetectorReady) {
      earCollectionRef.current = setInterval(() => {
        const timestamp = Date.now() - calibrationStartTime.current;
        setCalibrationData(prev => ({
          ...prev,
          earValues: [...prev.earValues, currentEAR],
          timestamps: [...prev.timestamps, timestamp],
        }));
      }, 100); // Collect EAR every 100ms

      return () => {
        if (earCollectionRef.current) {
          clearInterval(earCollectionRef.current);
        }
      };
    }
  }, [phase, isDetectorReady, currentEAR]);

  // Monitor blink detection
  useEffect(() => {
    if (phase === 'calibrating' && blinkCount > lastBlinkCountRef.current) {
      const newBlinks = blinkCount - lastBlinkCountRef.current;
      
      for (let i = 0; i < newBlinks; i++) {
        const blinkEvent: BlinkEvent = {
          timestamp: Date.now() - calibrationStartTime.current,
          earValue: currentEAR,
          duration: 150, // Estimated blink duration
        };

        setCalibrationData(prev => ({
          ...prev,
          blinkEvents: [...prev.blinkEvents, blinkEvent],
        }));
      }

      lastBlinkCountRef.current = blinkCount;

      // Update progress
      updateCalibrationProgress({
        currentBlink: Math.min(blinkCount, targetBlinks),
        lastDetectedBlink: Date.now(),
      });

      // Check if calibration is complete
      if (blinkCount >= targetBlinks) {
        setPhase('analyzing');
      }
    }
  }, [blinkCount, phase, currentEAR, updateCalibrationProgress]);

  const startCalibrationProcess = async () => {
    if (!stream) {
      await startCamera();
    }
    setPhase('countdown');
    
    // Countdown before starting
    let count = 3;
    setCountdown(count);
    
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count <= 0) {
        clearInterval(countdownInterval);
        beginCalibration();
      }
    }, 1000);
  };

  const beginCalibration = () => {
    setPhase('calibrating');
    calibrationStartTime.current = Date.now();
    resetBlinkCounter();
    lastBlinkCountRef.current = 0;

    updateCalibrationProgress({
      currentBlink: 0,
      totalBlinks: targetBlinks,
      isActive: true,
      timeRemaining: blinkInterval,
      showBlinkPrompt: true,
    });

    // Start blink prompts
    let currentPrompt = 0;
    const showNextPrompt = () => {
      if (currentPrompt < targetBlinks) {
        updateCalibrationProgress({
          showBlinkPrompt: true,
          timeRemaining: blinkInterval,
        });

        // Hide prompt after 500ms
        setTimeout(() => {
          updateCalibrationProgress({
            showBlinkPrompt: false,
          });
        }, 500);

        currentPrompt++;
        
        if (currentPrompt < targetBlinks) {
          blinkTimerRef.current = setTimeout(showNextPrompt, blinkInterval);
        }
      }
    };

    showNextPrompt();
  };

  const analyzeCalibration = useCallback(async () => {
    // Calculate metadata
    const totalBlinksDetected = calibrationData.blinkEvents.length;
    const accuracy = Math.min(totalBlinksDetected / targetBlinks, 1.0);
    
    const earValues = calibrationData.earValues.filter(val => val > 0);
    const minEarValue = Math.min(...earValues);
    const maxEarValue = Math.max(...earValues);
    
    const blinkTimestamps = calibrationData.blinkEvents.map(event => event.timestamp);
    const intervals = blinkTimestamps.slice(1).map((timestamp, i) => timestamp - blinkTimestamps[i]);
    const averageBlinkInterval = intervals.length > 0 
      ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length 
      : 0;

    const rawData: CalibrationRawData = {
      timestamps: calibrationData.timestamps,
      earValues: calibrationData.earValues,
      blinkEvents: calibrationData.blinkEvents,
    };

    const metadata: CalibrationMetadata = {
      totalBlinksRequested: targetBlinks,
      totalBlinksDetected,
      accuracy,
      averageBlinkInterval,
      minEarValue,
      maxEarValue,
    };

    const earThreshold = CalibrationService.calculateEarThreshold(rawData);

    const calibration = {
      name: CalibrationService.generateDefaultName(),
      isActive: true, // Make new calibrations active by default
      earThreshold,
      metadata,
      rawData,
    };

    try {
      completeCalibration(calibration);
      setPhase('complete');
      
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    } catch (error) {
      console.error('Error saving calibration:', error);
    }
  }, [calibrationData, targetBlinks, completeCalibration, onComplete]);

  const handleCancel = () => {
    // Clean up timers
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    if (earCollectionRef.current) clearInterval(earCollectionRef.current);
    
    stopCalibration();
    stopDetection();
    stopCamera();
    onCancel?.();
  };

  // Auto-analyze when we have enough data
  useEffect(() => {
    if (phase === 'analyzing') {
      const timer = setTimeout(analyzeCalibration, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, analyzeCalibration]);

  const renderCurrentPhase = () => {
    switch (phase) {
      case 'setup':
        return (
          <Box>
            <Callout.Root>
              <Callout.Icon>👁️</Callout.Icon>
              <Callout.Text>
                You&apos;ll be asked to blink exactly 10 times at 2-second intervals. 
                Make sure you&apos;re in good lighting and looking directly at the camera.
              </Callout.Text>
            </Callout.Root>
            
            <Flex mt="4" gap="3" justify="center">
              <Button size="3" onClick={startCalibrationProcess}>
                Start Calibration
              </Button>
              <Button size="3" variant="soft" onClick={handleCancel}>
                Cancel
              </Button>
            </Flex>
          </Box>
        );

      case 'countdown':
        return (
          <Box>
            <Flex direction="column" align="center" gap="4">
              <Text size="8" weight="bold" align="center">
                {countdown}
              </Text>
              <Text size="4" align="center">
                Get ready to start blinking...
              </Text>
            </Flex>
          </Box>
        );

      case 'calibrating':
        return (
          <Box>
            <Flex direction="column" gap="4">
              <Progress 
                value={(calibrationProgress?.currentBlink || 0) / targetBlinks * 100} 
                size="3"
              />
              
              <Flex justify="between" align="center">
                <Text size="3">
                  Blink {calibrationProgress?.currentBlink || 0} / {targetBlinks}
                </Text>
                <Badge color={isBlinking ? "green" : "gray"}>
                  EAR: {currentEAR.toFixed(3)}
                </Badge>
              </Flex>

              {calibrationProgress?.showBlinkPrompt && (
                <Card style={{ padding: '20px', backgroundColor: 'var(--accent-3)' }}>
                  <Text size="6" weight="bold" align="center">
                    BLINK NOW!
                  </Text>
                </Card>
              )}

              <Flex justify="center">
                <Button variant="soft" onClick={handleCancel}>
                  Cancel Calibration
                </Button>
              </Flex>
            </Flex>
          </Box>
        );

      case 'analyzing':
        return (
          <Box>
            <Flex direction="column" align="center" gap="4">
              <Text size="5">Analyzing calibration data...</Text>
              <Progress value={undefined} size="3" />
            </Flex>
          </Box>
        );

      case 'complete':
        return (
          <Box>
            <Flex direction="column" align="center" gap="4">
              <Text size="5" color="green">
                ✅ Calibration Complete!
              </Text>
              <Text size="3" align="center">
                Your blink detection is now calibrated and ready to use.
              </Text>
            </Flex>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Card style={{ padding: '24px' }}>
        <Flex direction="column" gap="6">
          <Heading size="6" align="center">
            Blink Detection Calibration
          </Heading>

          {stream && (phase === 'calibrating' || phase === 'countdown') && (
            <Box style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  maxWidth: '480px',
                  height: 'auto',
                  borderRadius: '8px',
                  backgroundColor: '#000',
                  filter: 'grayscale(100%)',
                }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px',
                  pointerEvents: 'none',
                }}
              />
            </Box>
          )}

          {renderCurrentPhase()}
        </Flex>
      </Card>
    </Box>
  );
}