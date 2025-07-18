import { FaceMesh } from '@mediapipe/face_mesh';
import { FaceMeshResults } from './types';

export class FaceMeshProcessor {
  private faceMesh: FaceMesh | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.isInitialized = true;
  }

  async processFrame(
    videoElement: HTMLVideoElement,
    onResults: (results: FaceMeshResults) => void
  ): Promise<void> {
    if (!this.faceMesh || !this.isInitialized) {
      throw new Error('FaceMesh not initialized. Call initialize() first.');
    }

    this.faceMesh.onResults(onResults);
    await this.faceMesh.send({ image: videoElement });
  }

  dispose(): void {
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
    this.isInitialized = false;
  }
}