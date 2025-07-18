export interface Point2D {
  x: number;
  y: number;
}

export interface EyeLandmarks {
  p1: Point2D;
  p2: Point2D;
  p3: Point2D;
  p4: Point2D;
  p5: Point2D;
  p6: Point2D;
}

export interface BlinkDetectionResult {
  blinkCount: number;
  currentEAR: number;
  isBlinking: boolean;
  timestamp: number;
}

export interface BlinkDetectorConfig {
  earThreshold: number;
  consecutiveFrames: number;
  debounceTime: number;
}

export interface FaceMeshResults {
  multiFaceLandmarks: Array<{
    x: number;
    y: number;
    z: number;
  }[]>;
}

export interface BlinkDetectionState {
  consecutiveFramesBelow: number;
  lastBlinkTime: number;
  totalBlinks: number;
  isCurrentlyBlinking: boolean;
}