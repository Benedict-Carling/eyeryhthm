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

export interface CalibrationMetadata {
  totalBlinksRequested: number;
  totalBlinksDetected: number;
  accuracy: number;
  averageBlinkInterval: number;
  minEarValue: number;
  maxEarValue: number;
}

export interface BlinkEvent {
  timestamp: number;
  earValue: number;
  duration: number;
}

export interface CalibrationRawData {
  timestamps: number[];
  earValues: number[];
  blinkEvents: BlinkEvent[];
}

export interface Calibration {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  earThreshold: number;
  metadata: CalibrationMetadata;
  rawData: CalibrationRawData;
}

export interface CalibrationProgress {
  currentBlink: number;
  totalBlinks: number;
  isActive: boolean;
  timeRemaining: number;
  showBlinkPrompt: boolean;
  lastDetectedBlink?: number;
}