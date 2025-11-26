import { useState, useCallback, useRef, useEffect } from 'react';
import {
  FaceLandmarker,
  FilesetResolver,
  FaceLandmarkerResult
} from '@mediapipe/tasks-vision';

// Local paths for bundled MediaPipe assets (offline support)
const LOCAL_WASM_PATH = '/mediapipe/wasm';
const LOCAL_MODEL_PATH = '/mediapipe/face_landmarker.task';

interface UseFaceLandmarkerOptions {
  delegate?: 'GPU' | 'CPU';
  numFaces?: number;
}

interface FaceLandmarkerState {
  isLoading: boolean;
  isInitialized: boolean;
  error: Error | null;
}

export function useFaceLandmarker(options: UseFaceLandmarkerOptions = {}) {
  const [state, setState] = useState<FaceLandmarkerState>({
    isLoading: false,
    isInitialized: false,
    error: null,
  });

  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  const initialize = useCallback(async () => {
    // If already initializing or initialized, return the existing promise
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }

    if (state.isInitialized && faceLandmarkerRef.current) {
      return Promise.resolve();
    }

    const initPromise = (async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const vision = await FilesetResolver.forVisionTasks(LOCAL_WASM_PATH);

        const landmarkerOptions = {
          baseOptions: {
            modelAssetPath: LOCAL_MODEL_PATH,
            delegate: options.delegate || "GPU"
          },
          runningMode: "VIDEO" as const,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          numFaces: options.numFaces || 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        };

        // Try GPU first, fall back to CPU if it fails
        try {
          faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, landmarkerOptions);
        } catch (gpuError) {
          if (options.delegate !== 'CPU') {
            landmarkerOptions.baseOptions.delegate = 'CPU';
            faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, landmarkerOptions);
          } else {
            throw gpuError;
          }
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          isInitialized: true,
          error: null
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isInitialized: false,
          error: error as Error
        }));
        throw error;
      }
    })();

    initPromiseRef.current = initPromise;
    return initPromise;
  }, [options.delegate, options.numFaces, state.isInitialized]);

  const detectForVideo = useCallback(async (
    video: HTMLVideoElement, 
    timestamp: number
  ): Promise<FaceLandmarkerResult | null> => {
    if (!faceLandmarkerRef.current || !state.isInitialized) {
      await initialize();
    }

    if (!faceLandmarkerRef.current) {
      return null;
    }

    try {
      return faceLandmarkerRef.current.detectForVideo(video, timestamp);
    } catch (error) {
      console.error('Face detection error:', error);
      return null;
    }
  }, [state.isInitialized, initialize]);

  const dispose = useCallback(() => {
    if (faceLandmarkerRef.current) {
      faceLandmarkerRef.current.close();
      faceLandmarkerRef.current = null;
    }
    initPromiseRef.current = null;
    setState({
      isLoading: false,
      isInitialized: false,
      error: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

  return {
    ...state,
    initialize,
    detectForVideo,
    dispose,
  };
}