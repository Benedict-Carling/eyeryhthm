'use client';

import { Box, Button, Text, Flex, Badge, Card, Callout } from '@radix-ui/themes';
import { useRef, useCallback, useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useBlinkDetection } from '../hooks/useBlinkDetection';
import { useCalibration } from '../contexts/CalibrationContext';
import { useAnimationFrame } from '../hooks/useAnimationFrame';

export function Camera() {
  const { canStartDetection, activeCalibration } = useCalibration();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasStartedDetection = useRef(false);
  
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

  // Handle detection initialization
  const initializeDetection = useCallback(async () => {
    if (canStartDetection() && canvasRef.current && !hasStartedDetection.current) {
      hasStartedDetection.current = true;
      await startDetection(canvasRef.current);
    }
  }, [canStartDetection, startDetection]);

  // Set up video stream
  const setVideoStream = useCallback((video: HTMLVideoElement | null) => {
    if (video && stream) {
      video.srcObject = stream;
      // Initialize detection when video is ready
      video.onloadedmetadata = () => {
        setTimeout(initializeDetection, 100);
      };
    }
  }, [stream, initializeDetection]);

  const videoRefCallback = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
    setVideoStream(video);
  }, [videoRef, setVideoStream]);

  // Animation frame for continuous detection
  const handleAnimationFrame = useCallback(() => {
    if (videoRef.current && isDetectorReady && stream) {
      processFrame(videoRef.current, canvasRef.current);
    }
  }, [isDetectorReady, stream, processFrame]);

  const { start: startAnimation, stop: stopAnimation } = useAnimationFrame(
    handleAnimationFrame,
    isDetectorReady && !!stream
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      hasStartedDetection.current = false;
      stopAnimation();
      stopDetection();
    };
  }, [stopAnimation, stopDetection]);

  const handleStopCamera = useCallback(() => {
    hasStartedDetection.current = false;
    stopAnimation();
    stopDetection();
    stopCamera();
  }, [stopAnimation, stopDetection, stopCamera]);

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
                  ref={videoRefCallback}
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