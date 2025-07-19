import { BlinkDetectorConfig, BlinkDetectionResult, BlinkDetectionState, FaceMeshResults } from './types';
import { FaceMeshProcessor } from './face-mesh-processor';
import { extractBothEyeLandmarks } from './landmark-extractor';
import { calculateAverageEAR } from './ear-calculator';

export class BlinkDetector {
  private config: BlinkDetectorConfig;
  private state: BlinkDetectionState;
  private faceMeshProcessor: FaceMeshProcessor;

  constructor(config: Partial<BlinkDetectorConfig> = {}) {
    this.config = {
      earThreshold: 0.25,
      consecutiveFrames: 3,
      debounceTime: 100,
      ...config
    };

    this.state = {
      consecutiveFramesBelow: 0,
      lastBlinkTime: 0,
      totalBlinks: 0,
      isCurrentlyBlinking: false
    };

    this.faceMeshProcessor = new FaceMeshProcessor();
  }

  async initialize(): Promise<void> {
    await this.faceMeshProcessor.initialize();
  }

  async processFrame(
    videoElement: HTMLVideoElement, 
    onRawResults?: (results: FaceMeshResults) => void
  ): Promise<BlinkDetectionResult> {
    return new Promise((resolve) => {
      this.faceMeshProcessor.processFrame(videoElement, (results: FaceMeshResults) => {
        // Pass raw results to visualizer if callback provided
        if (onRawResults) {
          onRawResults(results);
        }
        
        const timestamp = Date.now();
        const result = this.analyzeFrame(results, videoElement.videoWidth, videoElement.videoHeight, timestamp);
        resolve(result);
      });
    });
  }

  private analyzeFrame(
    results: FaceMeshResults,
    videoWidth: number,
    videoHeight: number,
    timestamp: number
  ): BlinkDetectionResult {
    const eyeLandmarks = extractBothEyeLandmarks(results, videoWidth, videoHeight);
    
    if (!eyeLandmarks) {
      return {
        blinkCount: this.state.totalBlinks,
        currentEAR: 0,
        isBlinking: false,
        timestamp
      };
    }

    const currentEAR = calculateAverageEAR(eyeLandmarks.leftEye, eyeLandmarks.rightEye);
    const isBlinking = this.detectBlink(currentEAR, timestamp);

    return {
      blinkCount: this.state.totalBlinks,
      currentEAR,
      isBlinking,
      timestamp
    };
  }

  private detectBlink(currentEAR: number, timestamp: number): boolean {
    if (currentEAR < this.config.earThreshold) {
      this.state.consecutiveFramesBelow++;
      
      if (this.state.consecutiveFramesBelow >= this.config.consecutiveFrames && 
          !this.state.isCurrentlyBlinking &&
          timestamp - this.state.lastBlinkTime > this.config.debounceTime) {
        
        this.state.isCurrentlyBlinking = true;
        this.state.totalBlinks++;
        this.state.lastBlinkTime = timestamp;
        return true;
      }
    } else {
      this.state.consecutiveFramesBelow = 0;
      this.state.isCurrentlyBlinking = false;
    }

    return this.state.isCurrentlyBlinking;
  }

  resetBlinkCounter(): void {
    this.state = {
      consecutiveFramesBelow: 0,
      lastBlinkTime: 0,
      totalBlinks: 0,
      isCurrentlyBlinking: false
    };
  }

  dispose(): void {
    this.faceMeshProcessor.dispose();
  }

  getBlinkCount(): number {
    return this.state.totalBlinks;
  }
}