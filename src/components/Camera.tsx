'use client';

import { Box, Button, Text, Flex, Badge, Card, Callout } from '@radix-ui/themes';
import { useRef } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useBlinkDetection } from '../hooks/useBlinkDetection';
import { useCalibration } from '../contexts/CalibrationContext';

export function Camera() {
  const { canStartDetection, activeCalibration } = useCalibration();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { 
    stream, 
    isLoading, 
    error, 
    hasPermission, 
    videoRef, 
    startCamera, 
    stopCamera
  } = useCamera({
    onVideoReady: () => {
      if (canStartDetection()) {
        startDetection();
      }
    }
  });

  const {
    blinkCount,
    currentEAR,
    isBlinking,
    isDetectorReady,
    showDebugOverlay,
    resetBlinkCounter,
    toggleDebugOverlay,
    startDetection,
    stopDetection,
    error: blinkError
  } = useBlinkDetection({
    videoElement: videoRef.current,
    canvasElement: canvasRef.current,
    autoStart: false
  });

  const displayError = error || blinkError;

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
                  webkit-playsinline="true"
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
                <Button 
                  onClick={resetBlinkCounter}
                  variant="soft"
                  size="2"
                  disabled={!isDetectorReady}
                >
                  Reset Counter
                </Button>
                <Button 
                  onClick={toggleDebugOverlay}
                  variant={showDebugOverlay ? "solid" : "soft"}
                  size="2"
                  disabled={!isDetectorReady}
                >
                  {showDebugOverlay ? "Hide" : "Show"} Debug
                </Button>
                <Button 
                  onClick={() => {
                    stopDetection();
                    stopCamera();
                  }}
                  variant="outline"
                  size="2"
                >
                  Stop Camera
                </Button>
              </Flex>
            </Flex>
          </Box>
        )}
      </Flex>
    </Box>
  );
}