import { FaceMeshResults } from "./types";
import { DrawingUtils } from "@mediapipe/tasks-vision";

// Face mesh connection indices - only face oval and eyes
const FACE_MESH_CONNECTIONS = {
  FACE_OVAL: [
    [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454], [454, 323], [323, 361],
    [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152], [152, 148], [148, 176],
    [176, 149], [149, 150], [150, 136], [136, 172], [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162],
    [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10]
  ],
  LEFT_EYE: [
    [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154], [154, 155], [155, 133], [133, 173], [173, 157],
    [157, 158], [158, 159], [159, 160], [160, 161], [161, 246], [246, 33]
  ],
  RIGHT_EYE: [
    [362, 382], [382, 381], [381, 380], [380, 374], [374, 373], [373, 390], [390, 249], [249, 263], [263, 466], [466, 388],
    [388, 387], [387, 386], [386, 385], [385, 384], [384, 398], [398, 362]
  ]
};

export class FaceMeshVisualizer {
  private canvas: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private drawingUtils: DrawingUtils | null = null;

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d");

    if (typeof window === "undefined") {
      throw new Error("FaceMeshVisualizer can only be used in the browser");
    }

    // Initialize the modern DrawingUtils
    this.drawingUtils = new DrawingUtils(this.canvasCtx!);
  }

  drawResults(
    results: FaceMeshResults,
    videoWidth: number,
    videoHeight: number
  ): void {
    if (!this.canvas || !this.canvasCtx || !this.drawingUtils) {
      return;
    }

    // Set canvas size to match video
    this.canvas.width = videoWidth;
    this.canvas.height = videoHeight;

    // Clear canvas
    this.canvasCtx.clearRect(0, 0, videoWidth, videoHeight);

    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      const landmarks = results.faceLandmarks[0];

      if (landmarks) {
        // Draw face oval (blue)
        this.drawConnections(landmarks, FACE_MESH_CONNECTIONS.FACE_OVAL, "#0000FF", 2);

        // Draw eyes (green)
        this.drawConnections(landmarks, FACE_MESH_CONNECTIONS.LEFT_EYE, "#00FF00", 2);
        this.drawConnections(landmarks, FACE_MESH_CONNECTIONS.RIGHT_EYE, "#00FF00", 2);

        // Highlight specific eye landmarks for EAR calculation
        this.highlightEyeLandmarks(landmarks);
      }
    }
  }

  private drawConnections(
    landmarks: Array<{ x: number; y: number; z: number }>,
    connections: number[][],
    color: string,
    lineWidth: number
  ): void {
    if (!this.canvasCtx || !this.canvas) return;

    this.canvasCtx.strokeStyle = color;
    this.canvasCtx.lineWidth = lineWidth;
    this.canvasCtx.beginPath();

    connections.forEach(([startIdx, endIdx]) => {
      if (startIdx !== undefined && endIdx !== undefined && startIdx < landmarks.length && endIdx < landmarks.length) {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];

        if (start && end) {
          const startX = start.x * this.canvas!.width;
          const startY = start.y * this.canvas!.height;
          const endX = end.x * this.canvas!.width;
          const endY = end.y * this.canvas!.height;

          this.canvasCtx!.moveTo(startX, startY);
          this.canvasCtx!.lineTo(endX, endY);
        }
      }
    });

    this.canvasCtx.stroke();
  }

  private highlightEyeLandmarks(
    landmarks: Array<{ x: number; y: number; z: number }>
  ): void {
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
      this.canvasCtx.strokeStyle = "#FFFFFF";
      this.canvasCtx.lineWidth = 1;
      this.canvasCtx.stroke();

      // Draw label
      this.canvasCtx.fillStyle = "#FFFFFF";
      this.canvasCtx.font = "10px Arial";
      this.canvasCtx.fillText(label, x + 6, y - 6);
    };

    // Draw right eye landmarks
    rightEyeIndices.forEach((index, i) => {
      drawEyePoint(index, "#FF00FF", `R${i + 1}`);
    });

    // Draw left eye landmarks
    leftEyeIndices.forEach((index, i) => {
      drawEyePoint(index, "#00FFFF", `L${i + 1}`);
    });
  }

  dispose(): void {
    this.canvas = null;
    this.canvasCtx = null;
    this.drawingUtils = null;
  }
}
