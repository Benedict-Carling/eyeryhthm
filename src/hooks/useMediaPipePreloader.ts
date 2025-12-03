import { useEffect, useRef } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Local paths for bundled MediaPipe assets (offline support)
const LOCAL_WASM_PATH = '/mediapipe/wasm';
const LOCAL_MODEL_PATH = '/mediapipe/face_landmarker.task';

// Preload delay after app mount (allows UI to settle first)
const PRELOAD_DELAY_MS = 1500;

// Singleton to track preload state across hook instances
let preloadPromise: Promise<FaceLandmarker | null> | null = null;
let preloadedInstance: FaceLandmarker | null = null;

/**
 * Check if camera permission was previously granted
 * Returns true if permission is 'granted', false otherwise
 */
async function checkCameraPermission(): Promise<boolean> {
  try {
    // navigator.permissions.query is not available in all browsers
    if (!navigator.permissions?.query) {
      return false;
    }

    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return result.state === 'granted';
  } catch {
    // Some browsers don't support querying camera permission
    return false;
  }
}

/**
 * Preload MediaPipe FaceLandmarker in the background
 * This loads WASM and model files without starting detection
 */
async function preloadMediaPipe(): Promise<FaceLandmarker | null> {
  // Return existing instance if already preloaded
  if (preloadedInstance) {
    return preloadedInstance;
  }

  // Return existing promise if preload is in progress
  if (preloadPromise) {
    return preloadPromise;
  }

  preloadPromise = (async () => {
    try {
      console.log('[MediaPipePreloader] Starting background preload...');
      const startTime = performance.now();

      // Load WASM files
      const vision = await FilesetResolver.forVisionTasks(LOCAL_WASM_PATH);

      // Create FaceLandmarker instance (this loads the model)
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: LOCAL_MODEL_PATH,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      const duration = (performance.now() - startTime).toFixed(0);
      console.log(`[MediaPipePreloader] Preload complete in ${duration}ms`);

      preloadedInstance = landmarker;
      return landmarker;
    } catch (error) {
      console.warn('[MediaPipePreloader] Preload failed (will retry on demand):', error);
      preloadPromise = null;
      return null;
    }
  })();

  return preloadPromise;
}

/**
 * Get the preloaded FaceLandmarker instance if available
 * Returns null if not yet preloaded
 */
export function getPreloadedFaceLandmarker(): FaceLandmarker | null {
  return preloadedInstance;
}

/**
 * Clear the preloaded instance (for cleanup)
 */
export function clearPreloadedFaceLandmarker(): void {
  if (preloadedInstance) {
    preloadedInstance.close();
    preloadedInstance = null;
  }
  preloadPromise = null;
}

/**
 * Hook to preload MediaPipe in the background
 * Only preloads if camera permission was previously granted
 *
 * Usage: Add to a top-level component (like SessionProvider)
 * The preloaded instance will be used by useFaceLandmarker automatically
 */
export function useMediaPipePreloader(): void {
  const hasAttemptedPreload = useRef(false);

  useEffect(() => {
    // Only attempt preload once per app lifecycle
    if (hasAttemptedPreload.current) {
      return;
    }
    hasAttemptedPreload.current = true;

    // Wait for UI to settle, then check permission and preload
    const timeoutId = setTimeout(async () => {
      const hasPermission = await checkCameraPermission();

      if (hasPermission) {
        console.log('[MediaPipePreloader] Camera permission granted, starting preload...');
        preloadMediaPipe();
      } else {
        console.log('[MediaPipePreloader] No camera permission, skipping preload');
      }
    }, PRELOAD_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);
}
