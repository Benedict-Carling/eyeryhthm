import { FaceMeshResults } from './types';

type DrawingUtils = any;
type FaceMeshConnections = any;

export class FaceMeshVisualizer {
  private canvas: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private drawingUtils: DrawingUtils | null = null;
  private faceMeshConnections: FaceMeshConnections | null = null;

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');

    if (typeof window === 'undefined') {
      throw new Error('FaceMeshVisualizer can only be used in the browser');
    }

    // Import drawing utilities and face mesh connections
    const [drawingUtils, faceMesh] = await Promise.all([
      import('@mediapipe/drawing_utils'),
      import('@mediapipe/face_mesh')
    ]);

    this.drawingUtils = drawingUtils;
    this.faceMeshConnections = {
      FACE_OVAL: faceMesh.FACEMESH_FACE_OVAL,
      LEFT_EYE: faceMesh.FACEMESH_LEFT_EYE,
      RIGHT_EYE: faceMesh.FACEMESH_RIGHT_EYE,
      LEFT_EYEBROW: faceMesh.FACEMESH_LEFT_EYEBROW,
      RIGHT_EYEBROW: faceMesh.FACEMESH_RIGHT_EYEBROW,
      LIPS: faceMesh.FACEMESH_LIPS,
      TESSELATION: faceMesh.FACEMESH_TESSELATION
    };
  }

  drawResults(results: FaceMeshResults, videoWidth: number, videoHeight: number): void {
    if (!this.canvas || !this.canvasCtx || !this.drawingUtils) {
      return;
    }

    // Set canvas size to match video
    this.canvas.width = videoWidth;
    this.canvas.height = videoHeight;

    // Clear canvas
    this.canvasCtx.clearRect(0, 0, videoWidth, videoHeight);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];

      // Draw face mesh tesselation (light gray)
      this.drawingUtils.drawConnectors(
        this.canvasCtx,
        landmarks,
        this.faceMeshConnections.TESSELATION,
        { color: '#C0C0C070', lineWidth: 1 }
      );

      // Draw face oval (blue)
      this.drawingUtils.drawConnectors(
        this.canvasCtx,
        landmarks,
        this.faceMeshConnections.FACE_OVAL,
        { color: '#0000FF', lineWidth: 2 }
      );

      // Draw eyes (green)
      this.drawingUtils.drawConnectors(
        this.canvasCtx,
        landmarks,
        this.faceMeshConnections.LEFT_EYE,
        { color: '#00FF00', lineWidth: 2 }
      );
      this.drawingUtils.drawConnectors(
        this.canvasCtx,
        landmarks,
        this.faceMeshConnections.RIGHT_EYE,
        { color: '#00FF00', lineWidth: 2 }
      );

      // Draw eyebrows (yellow)
      this.drawingUtils.drawConnectors(
        this.canvasCtx,
        landmarks,
        this.faceMeshConnections.LEFT_EYEBROW,
        { color: '#FFFF00', lineWidth: 2 }
      );
      this.drawingUtils.drawConnectors(
        this.canvasCtx,
        landmarks,
        this.faceMeshConnections.RIGHT_EYEBROW,
        { color: '#FFFF00', lineWidth: 2 }
      );

      // Draw lips (red)
      this.drawingUtils.drawConnectors(
        this.canvasCtx,
        landmarks,
        this.faceMeshConnections.LIPS,
        { color: '#FF0000', lineWidth: 2 }
      );

      // Highlight specific eye landmarks for EAR calculation
      this.highlightEyeLandmarks(landmarks);
    }
  }

  private highlightEyeLandmarks(landmarks: Array<{ x: number; y: number; z: number }>): void {
    if (!this.canvasCtx || !this.canvas) {
      return;
    }

    // Eye landmark indices for EAR calculation
    const rightEyeIndices = [33, 159, 158, 133, 153, 145]; // p1, p2, p3, p4, p5, p6
    const leftEyeIndices = [362, 380, 374, 263, 386, 385]; // p1, p2, p3, p4, p5, p6

    const drawEyePoint = (index: number, color: string, label: string) => {
      if (!this.canvasCtx || !this.canvas) return;
      
      const landmark = landmarks[index];
      if (!landmark) return;

      const x = landmark.x * this.canvas.width;
      const y = landmark.y * this.canvas.height;

      // Draw circle
      this.canvasCtx.beginPath();
      this.canvasCtx.arc(x, y, 4, 0, 2 * Math.PI);
      this.canvasCtx.fillStyle = color;
      this.canvasCtx.fill();
      this.canvasCtx.strokeStyle = '#FFFFFF';
      this.canvasCtx.lineWidth = 1;
      this.canvasCtx.stroke();

      // Draw label
      this.canvasCtx.fillStyle = '#FFFFFF';
      this.canvasCtx.font = '10px Arial';
      this.canvasCtx.fillText(label, x + 6, y - 6);
    };

    // Draw right eye landmarks
    rightEyeIndices.forEach((index, i) => {
      drawEyePoint(index, '#FF00FF', `R${i + 1}`);
    });

    // Draw left eye landmarks
    leftEyeIndices.forEach((index, i) => {
      drawEyePoint(index, '#00FFFF', `L${i + 1}`);
    });
  }

  dispose(): void {
    this.canvas = null;
    this.canvasCtx = null;
    this.drawingUtils = null;
    this.faceMeshConnections = null;
  }
}