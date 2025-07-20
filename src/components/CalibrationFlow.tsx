"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Box,
  Card,
  Flex,
  Text,
  Button,
  Badge,
  Heading,
  Callout,
} from "@radix-ui/themes";
import { useCalibration } from "../contexts/CalibrationContext";
import { useCamera } from "../hooks/useCamera";
import { useBlinkDetection } from "../hooks/useBlinkDetection";
import { useFrameProcessor } from "../hooks/useFrameProcessor";
import { CalibrationService } from "../lib/calibration/calibration-service";
import { BlinkAnalyzer } from "../lib/calibration/blink-analyzer";
import { EARTimeSeriesGraph } from "./EARTimeSeriesGraph";
import { VideoCanvas } from "./VideoCanvas";
import {
  BlinkEvent,
  CalibrationRawData,
  CalibrationMetadata,
} from "../lib/blink-detection/types";

interface CalibrationFlowProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

type CalibrationPhase =
  | "setup"
  | "recording"
  | "analyzing"
  | "complete"
  | "failed";

interface EARDataPoint {
  time: number;
  ear: number;
}

export function CalibrationFlow({
  onComplete,
  onCancel,
}: CalibrationFlowProps) {
  const { completeCalibration, stopCalibration } = useCalibration();

  const [phase, setPhase] = useState<CalibrationPhase>("setup");
  const [isRecording, setIsRecording] = useState(false);
  const [earData, setEarData] = useState<EARDataPoint[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { stream, videoRef, startCamera, stopCamera } = useCamera();

  const {
    currentEAR,
    start: startDetection,
    stop: stopDetection,
    processFrame,
  } = useBlinkDetection();

  // Unified initialization effect that matches Camera component
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

      // Initialize detection
      try {
        await startDetection(canvasRef.current);
        if (mounted) {
          setIsInitialized(true);
        }
      } catch (err) {
        console.error("Failed to start detection:", err);
      }
    };

    if (phase !== "setup") {
      initializeEverything();
    }

    return () => {
      mounted = false;
    };
  }, [stream, phase, startDetection, isInitialized]);

  // Handle frame processing with EAR data recording
  const handleFrameData = useCallback(
    (data: { currentEAR: number }) => {
      if (isRecording && data.currentEAR > 0) {
        const currentTime = Date.now() - recordingStartTime;
        setEarData((prev) => [
          ...prev,
          { time: currentTime, ear: data.currentEAR },
        ]);
      }
    },
    [isRecording, recordingStartTime]
  );

  // Use the shared frame processor hook
  useFrameProcessor({
    videoRef,
    canvasRef,
    processFrame,
    onFrame: () => handleFrameData({ currentEAR }),
    isEnabled: isInitialized && phase !== "setup",
  });

  const initializeCalibration = useCallback(async () => {
    try {
      if (!stream) {
        await startCamera();
      }
      setPhase("recording");
    } catch (error) {
      console.error("Failed to initialize calibration:", error);
    }
  }, [stream, startCamera]);

  const startRecording = useCallback(() => {
    setEarData([]);
    setRecordingStartTime(Date.now());
    setIsRecording(true);
  }, []);

  const restartRecording = useCallback(() => {
    setIsRecording(false);
    setEarData([]);
    setTimeout(() => {
      startRecording();
    }, 100);
  }, [startRecording]);

  const confirmCalibration = useCallback(() => {
    setIsRecording(false);
    setPhase("analyzing");

    // Analyze the data to find optimal threshold
    const analysisResult = BlinkAnalyzer.analyzeBlinkData(
      earData,
      10,
      0.2,
      0.3
    );

    if (analysisResult.detectedBlinks === 10) {
      // Create calibration data
      const blinkEvents: BlinkEvent[] = analysisResult.blinkTimestamps.map(
        (timestamp) => ({
          timestamp,
          earValue: analysisResult.calibratedThreshold,
          duration: 150,
        })
      );

      const rawData: CalibrationRawData = {
        timestamps: earData.map((d) => d.time),
        earValues: earData.map((d) => d.ear),
        blinkEvents,
      };

      const metadata: CalibrationMetadata = {
        totalBlinksRequested: 10,
        totalBlinksDetected: 10,
        accuracy: 1.0,
        averageBlinkInterval:
          analysisResult.blinkTimestamps.length > 1
            ? (analysisResult.blinkTimestamps[
                analysisResult.blinkTimestamps.length - 1
              ] -
                analysisResult.blinkTimestamps[0]) /
              9
            : 0,
        minEarValue: Math.min(...earData.map((d) => d.ear)),
        maxEarValue: Math.max(...earData.map((d) => d.ear)),
      };

      const calibration = {
        name: CalibrationService.generateDefaultName(),
        isActive: true,
        earThreshold: analysisResult.calibratedThreshold,
        metadata,
        rawData,
      };

      try {
        completeCalibration(calibration);
        setPhase("complete");

        setTimeout(() => {
          onComplete?.();
        }, 2000);
      } catch (error) {
        console.error("Error saving calibration:", error);
        setPhase("failed");
      }
    } else {
      // Not exactly 10 blinks found
      setPhase("failed");
    }
  }, [earData, completeCalibration, onComplete]);

  const handleCancel = useCallback(() => {
    setIsRecording(false);
    setIsInitialized(false);
    stopCalibration();
    stopDetection();
    stopCamera();
    onCancel?.();
  }, [stopCalibration, stopDetection, stopCamera, onCancel]);

  const retryCalibration = useCallback(() => {
    setPhase("recording");
    setEarData([]);
    setIsRecording(false);
  }, []);

  // Set video stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  const renderPhase = () => {
    switch (phase) {
      case "setup":
        return (
          <Box>
            <Callout.Root mb="4">
              <Callout.Icon>📋</Callout.Icon>
              <Callout.Text>
                <strong>Calibration Instructions:</strong>
                <br />
                1. Click &quot;Start Calibration&quot; to begin
                <br />
                2. Click &quot;Start Recording&quot; when ready
                <br />
                3. Blink exactly 10 times at your own pace
                <br />
                4. Watch the graph to see your blinks as dips in the EAR value
                <br />
                5. Click &quot;Confirm 10 Blinks&quot; when done
                <br />
                6. If you lose count, click &quot;Restart&quot; to try again
              </Callout.Text>
            </Callout.Root>

            <Flex gap="3" justify="center">
              <Button size="3" onClick={initializeCalibration}>
                Start Calibration
              </Button>
              <Button size="3" variant="soft" onClick={handleCancel}>
                Cancel
              </Button>
            </Flex>
          </Box>
        );

      case "recording":
        return (
          <Box>
            <Flex direction="column" gap="4">
              <Box>
                <EARTimeSeriesGraph
                  data={earData}
                  width={480}
                  height={150}
                  minEAR={0}
                  maxEAR={0.5}
                />
              </Box>

              <Flex justify="between" align="center">
                <Text size="3">
                  {isRecording
                    ? "Recording... Blink 10 times"
                    : "Click Start to begin recording"}
                </Text>
                <Badge size="2" color={currentEAR < 0.25 ? "red" : "green"}>
                  EAR: {currentEAR.toFixed(3)}
                </Badge>
              </Flex>

              <Flex gap="3" justify="center">
                {!isRecording ? (
                  <Button size="3" onClick={startRecording}>
                    Start Recording
                  </Button>
                ) : (
                  <>
                    <Button size="3" variant="soft" onClick={restartRecording}>
                      Restart
                    </Button>
                    <Button size="3" onClick={confirmCalibration}>
                      Confirm 10 Blinks
                    </Button>
                  </>
                )}
                <Button size="3" variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </Flex>
            </Flex>
          </Box>
        );

      case "analyzing":
        return (
          <Box>
            <Flex direction="column" align="center" gap="4">
              <Text size="5">Analyzing blink data...</Text>
              <Text size="3">
                Searching for the optimal EAR threshold between 0.2 and 0.3
              </Text>
            </Flex>
          </Box>
        );

      case "complete":
        return (
          <Box>
            <Flex direction="column" align="center" gap="4">
              <Text size="5" color="green">
                ✅ Calibration Complete!
              </Text>
              <Text size="3" align="center">
                Successfully detected 10 blinks and calculated your optimal EAR
                threshold.
              </Text>
            </Flex>
          </Box>
        );

      case "failed":
        return (
          <Box>
            <Flex direction="column" align="center" gap="4">
              <Text size="5" color="red">
                ❌ Calibration Failed
              </Text>
              <Text size="3" align="center">
                Could not detect exactly 10 blinks in the EAR range of 0.2 to
                0.3.
                <br />
                Please try again with more deliberate blinks.
              </Text>
              <Flex gap="3" mt="2">
                <Button size="3" onClick={retryCalibration}>
                  Retry Calibration
                </Button>
                <Button size="3" variant="soft" onClick={handleCancel}>
                  Cancel
                </Button>
              </Flex>
            </Flex>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Card style={{ padding: "24px" }}>
        <Flex direction="column" gap="6">
          <Heading size="6" align="center">
            Blink Detection Calibration
          </Heading>

          {stream && phase !== "setup" && (
            <Box style={{ display: "flex", justifyContent: "center" }}>
              <VideoCanvas
                videoRef={videoRef}
                canvasRef={canvasRef}
                showCanvas={true}
                maxWidth="480px"
              />
            </Box>
          )}

          {renderPhase()}
        </Flex>
      </Card>
    </Box>
  );
}
