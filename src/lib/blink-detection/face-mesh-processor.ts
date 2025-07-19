import { FaceMeshResults } from "./types";

interface FaceMesh {
  setOptions: (options: {
    maxNumFaces: number;
    refineLandmarks: boolean;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
  }) => void;
  onResults: (callback: (results: FaceMeshResults) => void) => void;
  send: (input: { image: HTMLVideoElement }) => void;
  close: () => void;
}

export class FaceMeshProcessor {
  private faceMesh: FaceMesh | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Only import MediaPipe when running in the browser
    if (typeof window === "undefined") {
      throw new Error("FaceMeshProcessor can only be used in the browser");
    }

    const { FaceMesh } = await import("@mediapipe/face_mesh");

    this.faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.isInitialized = true;
  }

  async processFrame(
    videoElement: HTMLVideoElement,
    onResults: (results: FaceMeshResults) => void
  ): Promise<void> {
    if (!this.faceMesh || !this.isInitialized) {
      throw new Error("FaceMesh not initialized. Call initialize() first.");
    }

    return new Promise((resolve) => {
      this.faceMesh!.onResults((results: FaceMeshResults) => {
        onResults(results);
        resolve();
      });
      this.faceMesh!.send({ image: videoElement });
    });
  }

  dispose(): void {
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
    this.isInitialized = false;
  }
}
