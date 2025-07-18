import { useRef, useCallback, useState, useEffect } from 'react';
import { BlinkDetector } from '../lib/blink-detection/blink-detector';
import { VideoProcessor } from '../lib/utils/video-processor';
import { BlinkDetectionResult, BlinkDetectorConfig } from '../lib/blink-detection/types';

interface UseBlinkDetectionReturn {
  detector: BlinkDetector | null;
  processor: VideoProcessor | null;
  isProcessing: boolean;
  blinkCount: number;
  currentEAR: number;
  isBlinking: boolean;
  error: string | null;
  startDetection: (videoElement: HTMLVideoElement) => Promise<void>;
  stopDetection: () => void;
  processVideo: (videoElement: HTMLVideoElement) => Promise<number>;
  resetCounter: () => void;
}

export function useBlinkDetection(config?: Partial<BlinkDetectorConfig>): UseBlinkDetectionReturn {
  const detectorRef = useRef<BlinkDetector | null>(null);
  const processorRef = useRef<VideoProcessor | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [blinkCount, setBlinkCount] = useState(0);
  const [currentEAR, setCurrentEAR] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeDetector = useCallback(() => {
    if (!detectorRef.current) {
      detectorRef.current = new BlinkDetector(config);
      processorRef.current = new VideoProcessor(detectorRef.current);
    }
  }, [config]);

  const handleResult = useCallback((result: BlinkDetectionResult) => {
    setBlinkCount(result.blinkCount);
    setCurrentEAR(result.currentEAR);
    setIsBlinking(result.isBlinking);
  }, []);

  const startDetection = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      setError(null);
      setIsProcessing(true);
      
      initializeDetector();
      
      if (!processorRef.current) {
        throw new Error('Failed to initialize video processor');
      }

      await processorRef.current.processVideoWithCallback(videoElement, handleResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  }, [initializeDetector, handleResult]);

  const stopDetection = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.stopProcessing();
    }
    setIsProcessing(false);
  }, []);

  const processVideo = useCallback(async (videoElement: HTMLVideoElement): Promise<number> => {
    try {
      setError(null);
      setIsProcessing(true);
      
      initializeDetector();
      
      if (!processorRef.current) {
        throw new Error('Failed to initialize video processor');
      }

      const result = await processorRef.current.processVideo(videoElement);
      setBlinkCount(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [initializeDetector]);

  const resetCounter = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.resetBlinkCounter();
    }
    setBlinkCount(0);
    setCurrentEAR(0);
    setIsBlinking(false);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (processorRef.current) {
        processorRef.current.dispose();
      }
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
    };
  }, []);

  return {
    detector: detectorRef.current,
    processor: processorRef.current,
    isProcessing,
    blinkCount,
    currentEAR,
    isBlinking,
    error,
    startDetection,
    stopDetection,
    processVideo,
    resetCounter
  };
}