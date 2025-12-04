"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Text,
  Flex,
  Badge,
  Card,
  Callout,
} from "@radix-ui/themes";
import { useCalibration } from "../contexts/CalibrationContext";
import { useCamera } from "../hooks/useCamera";
import { useBlinkDetection } from "../hooks/useBlinkDetection";
import { useFrameProcessor } from "../hooks/useFrameProcessor";
import { VideoCanvas } from "./VideoCanvas";

export function Camera() {
  const { canStartDetection, activeCalibration } = useCalibration();
  const [isInitialized, setIsInitialized] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    stream,
    videoRef,
    startCamera,
    stopCamera,
    error,
    hasPermission,
    isLoading: isCameraLoading,
  } = useCamera();

  const {
    blinkCount,
    currentEAR,
    isBlinking,
    isReady: isDetectorReady,
    start: startDetection,
    stop: stopDetection,
    processFrame,
    resetBlinkCounter,
  } = useBlinkDetection({
    earThreshold: activeCalibration?.earThreshold || 0.25,
  });

  // Unified initialization effect that matches CalibrationFlow component
  useEffect(() => {
    let mounted = true;

    const initializeEverything = async () => {
      if (!stream || !videoRef.current || !canvasRef.current || isInitialized) {
        return;
      }

      const video = videoRef.current;

      // Wait for video to be ready
      if (video.readyState < 2) {
        await new Promise<void>((resolve) => {
          const handleCanPlay = () => {
            video.removeEventListener("canplay", handleCanPlay);
            resolve();
          };
          video.addEventListener("canplay", handleCanPlay);
        });
      }

      // Small delay to ensure stable video feed
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (!mounted) return;

      // Initialize detection if calibration is complete
      if (canStartDetection()) {
        try {
          await startDetection(canvasRef.current);
          if (mounted) {
            setIsInitialized(true);
          }
        } catch (err) {
          console.error("Failed to start detection:", err);
        }
      }
    };

    initializeEverything();

    return () => {
      mounted = false;
    };
  }, [stream, canStartDetection, startDetection, isInitialized]);

  // Use the shared frame processor hook
  useFrameProcessor({
    videoRef,
    canvasRef,
    processFrame,
    isEnabled: isInitialized,
  });

  // Set video stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  // React Compiler auto-memoizes these handlers
  const handleStartCamera = async () => {
    try {
      await startCamera();
    } catch (error) {
      console.error("Failed to start camera:", error);
    }
  };

  const handleStopCamera = () => {
    setIsInitialized(false);
    stopDetection();
    stopCamera();
  };

  const showDebugOverlay = true;
  const toggleDebugOverlay = () => {}; // Placeholder

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

        {!hasPermission && !isCameraLoading && (
          <Button
            onClick={handleStartCamera}
            size="3"
            disabled={isCameraLoading || !canStartDetection()}
          >
            Start Camera
          </Button>
        )}

        {isCameraLoading && <Text>Requesting camera permission...</Text>}

        {error && (
          <Text color="red" size="2">
            {error}
          </Text>
        )}

        {stream && (
          <Box>
            <Flex direction="column" align="center" gap="3">
              {/* Live Metrics Display */}
              <Card style={{ padding: "16px", minWidth: "300px" }}>
                <Flex direction="column" gap="2">
                  <Flex justify="between" align="center">
                    <Text size="2" weight="medium">
                      Blink Count:
                    </Text>
                    <Badge color={isBlinking ? "green" : "gray"} size="2">
                      {blinkCount}
                    </Badge>
                  </Flex>
                  <Flex justify="between" align="center">
                    <Text size="2" weight="medium">
                      EAR Score:
                    </Text>
                    <Badge
                      color={
                        currentEAR < (activeCalibration?.earThreshold || 0.25)
                          ? "orange"
                          : "blue"
                      }
                      size="2"
                    >
                      {currentEAR.toFixed(3)}
                    </Badge>
                  </Flex>
                  {activeCalibration && (
                    <Flex justify="between" align="center">
                      <Text size="2" weight="medium">
                        Threshold:
                      </Text>
                      <Badge size="2">
                        {activeCalibration.earThreshold.toFixed(3)}
                      </Badge>
                    </Flex>
                  )}
                  <Flex justify="between" align="center">
                    <Text size="2" weight="medium">
                      Status:
                    </Text>
                    <Badge
                      color={
                        !isDetectorReady ? "gray" : isBlinking ? "red" : "green"
                      }
                      size="2"
                    >
                      {!isDetectorReady
                        ? "Initializing..."
                        : isBlinking
                        ? "Blinking"
                        : "Eyes Open"}
                    </Badge>
                  </Flex>
                </Flex>
              </Card>

              <VideoCanvas
                videoRef={videoRef}
                canvasRef={canvasRef}
                showCanvas={showDebugOverlay}
              />

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
                  Toggle Debug: {showDebugOverlay ? "ON" : "OFF"}
                </Button>
              </Flex>
            </Flex>
          </Box>
        )}
      </Flex>
    </Box>
  );
}
