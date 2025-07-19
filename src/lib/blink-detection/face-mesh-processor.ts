import { FaceMeshResults } from "./types";
import { FaceLandmarker, FaceLandmarkerResult, FilesetResolver } from "@mediapipe/tasks-vision";

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
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
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
