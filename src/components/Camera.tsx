'use client';

import { Box, Button, Text, Flex, Badge, Card, Callout } from '@radix-ui/themes';
import { useRef, useCallback, useEffect, useState } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useBlinkDetection } from '../hooks/useBlinkDetection';
import { useCalibration } from '../contexts/CalibrationContext';
import { useAnimationFrame } from '../hooks/useAnimationFrame';

export function Camera() {
  const { canStartDetection, activeCalibration } = useCalibration();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { 
    stream, 
    isLoading, 
    error, 
    hasPermission, 
    videoRef, 
    startCamera, 
    stopCamera
  } = useCamera();

  const {
    blinkCount,
    currentEAR,
    isBlinking,
    isReady: isDetectorReady,
    resetBlinkCounter,
    start: startDetection,
    stop: stopDetection,
    processFrame,
    error: blinkError
  } = useBlinkDetection();

  const showDebugOverlay = true;
  const toggleDebugOverlay = () => {}; // Placeholder since we removed this functionality

  const displayError = error || blinkError;

  // Single initialization effect that handles everything in order
  useEffect(() => {
    let mounted = true;

    const initializeEverything = async () => {
      if (!stream || !videoRef.current || !canvasRef.current || isInitialized) {
        return;
      }

      // Wait for video to be truly ready
      const video = videoRef.current;
      
      // Ensure video is playing
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

      // Initialize detection if allowed
      if (canStartDetection()) {
        try {
          await startDetection(canvasRef.current);
          if (mounted) {
            setIsInitialized(true);
          }
        } catch (err) {
          console.error('Failed to start detection:', err);
        }
      }
    };

    initializeEverything();

    return () => {
      mounted = false;
    };
  }, [stream, canStartDetection, startDetection]);

  // Animation frame for continuous detection
  const handleAnimationFrame = useCallback(() => {
    if (videoRef.current && isDetectorReady && isInitialized) {
      processFrame(videoRef.current, canvasRef.current);
    }
  }, [isDetectorReady, isInitialized, processFrame]);

  useAnimationFrame(handleAnimationFrame, isDetectorReady && isInitialized);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      setIsInitialized(false);
      stopDetection();
    };
  }, [stopDetection]);

  const handleStopCamera = useCallback(() => {
    setIsInitialized(false);
    stopDetection();
    stopCamera();
  }, [stopDetection, stopCamera]);

  // Set video stream without extra callbacks
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  return (
    <Box>
      <Flex direction="column" align="center" gap="4">
        {/* Calibration Required Warning */}
        {!canStartDetection() && (
          <Callout.Root color="orange">
            <Callout.Icon>⚠️</Callout.Icon>
            <Callout.Text>
              Please complete calibration before starting blink detection.
            </Callout.Text>
          </Callout.Root>
        )}

        {!hasPermission && !isLoading && (
          <Button 
            onClick={startCamera} 
            size="3"
            disabled={isLoading || !canStartDetection()}
          >
            Start Camera
          </Button>
        )}

        {isLoading && (
          <Text>Requesting camera permission...</Text>
        )}

        {displayError && (
          <Text color="red" size="2">
            {displayError}
          </Text>
        )}

        {stream && (
          <Box>
            <Flex direction="column" align="center" gap="3">
              {/* Live Metrics Display */}
              <Card style={{ padding: '16px', minWidth: '300px' }}>
                <Flex direction="column" gap="2">
                  <Flex justify="between" align="center">
                    <Text size="2" weight="medium">Blink Count:</Text>
                    <Badge color={isBlinking ? "green" : "gray"} size="2">
                      {blinkCount}
                    </Badge>
                  </Flex>
                  <Flex justify="between" align="center">
                    <Text size="2" weight="medium">EAR Score:</Text>
                    <Badge color={currentEAR < (activeCalibration?.earThreshold || 0.25) ? "orange" : "blue"} size="2">
                      {currentEAR.toFixed(3)}
                    </Badge>
                  </Flex>
                  {activeCalibration && (
                    <Flex justify="between" align="center">
                      <Text size="2" weight="medium">Threshold:</Text>
                      <Badge color="gray" size="2">
                        {activeCalibration.earThreshold.toFixed(3)}
                      </Badge>
                    </Flex>
                  )}
                  <Flex justify="between" align="center">
                    <Text size="2" weight="medium">Status:</Text>
                    <Badge 
                      color={!isDetectorReady ? "gray" : isBlinking ? "red" : "green"} 
                      size="2"
                    >
                      {!isDetectorReady ? "Initializing..." : isBlinking ? "Blinking" : "Eyes Open"}
                    </Badge>
                  </Flex>
                </Flex>
              </Card>

              <Box style={{ position: 'relative', display: 'inline-block' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    maxWidth: '640px',
                    height: 'auto',
                    borderRadius: '8px',
                    backgroundColor: '#000',
                    filter: 'grayscale(100%)',
                    display: 'block',
                  }}
                />
                {showDebugOverlay && (
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
                )}
              </Box>

              <Flex gap="2" justify="center" wrap="wrap">
                {stream && (
                  <Button 
                    onClick={handleStopCamera} 
                    size="3" 
                    variant="soft" 
                    color="red"
                  >
                    Stop Camera
                  </Button>
                )}
                
                <Button 
                  onClick={resetBlinkCounter} 
                  size="2" 
                  variant="soft"
                  disabled={!isDetectorReady}
                >
                  Reset Counter
                </Button>

                <Button 
                  onClick={toggleDebugOverlay} 
                  size="2" 
                  variant="soft"
                  disabled={!isDetectorReady}
                >
                  Toggle Debug: {showDebugOverlay ? 'ON' : 'OFF'}
                </Button>
              </Flex>
            </Flex>
          </Box>
        )}
      </Flex>
    </Box>
  );
}