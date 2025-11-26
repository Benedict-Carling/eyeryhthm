import { FaceMeshResults } from "./types";
import { FaceLandmarker, FaceLandmarkerResult, FilesetResolver } from "@mediapipe/tasks-vision";

// Local paths for bundled MediaPipe assets (offline support)
const LOCAL_WASM_PATH = '/mediapipe/wasm';
const LOCAL_MODEL_PATH = '/mediapipe/face_landmarker.task';

export class FaceMeshProcessor {
  private faceLandmarker: FaceLandmarker | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Only import MediaPipe when running in the browser
    if (typeof window === "undefined") {
      throw new Error("FaceMeshProcessor can only be used in the browser");
    }

    try {
      const vision = await FilesetResolver.forVisionTasks(LOCAL_WASM_PATH);

      // Try GPU first, fall back to CPU if it fails
      try {
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: LOCAL_MODEL_PATH,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
      } catch {
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: LOCAL_MODEL_PATH,
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
      }

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize FaceLandmarker:", error);
      throw error;
    }
  }

  async processFrame(
    videoElement: HTMLVideoElement,
    onResults: (results: FaceMeshResults) => void
  ): Promise<void> {
    if (!this.faceLandmarker || !this.isInitialized) {
      throw new Error("FaceLandmarker not initialized. Call initialize() first.");
    }

    try {
      const results: FaceLandmarkerResult = this.faceLandmarker.detectForVideo(videoElement, performance.now());
      
      // Convert new format to legacy format for compatibility
      const convertedResults: FaceMeshResults = {
        faceLandmarks: results.faceLandmarks || []
      };
      
      
      onResults(convertedResults);
    } catch (error) {
      console.error("Face detection error:", error);
      throw error;
    }
  }

  dispose(): void {
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
    }
    this.isInitialized = false;
  }
}
