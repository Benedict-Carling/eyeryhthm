import { describe, it, expect, beforeEach } from 'vitest';
import { calculateEAR, calculateEuclideanDistance, calculateAverageEAR } from './ear-calculator';
import { extractEyeLandmarks, extractBothEyeLandmarks } from './landmark-extractor';
import { BlinkDetector } from './blink-detector';
import { EyeLandmarks, Point2D, FaceMeshResults } from './types';

describe('EAR Calculator', () => {
  it('should calculate euclidean distance correctly', () => {
    const p1: Point2D = { x: 0, y: 0 };
    const p2: Point2D = { x: 3, y: 4 };
    
    const distance = calculateEuclideanDistance(p1, p2);
    expect(distance).toBe(5);
  });

  it('should calculate EAR correctly', () => {
    const landmarks: EyeLandmarks = {
      p1: { x: 0, y: 0 },
      p2: { x: 1, y: 2 },
      p3: { x: 2, y: 2 },
      p4: { x: 10, y: 0 },
      p5: { x: 2, y: -2 },
      p6: { x: 1, y: -2 }
    };

    const ear = calculateEAR(landmarks);
    
    const d1 = calculateEuclideanDistance(landmarks.p2, landmarks.p6);
    const d2 = calculateEuclideanDistance(landmarks.p3, landmarks.p5);
    const d3 = calculateEuclideanDistance(landmarks.p1, landmarks.p4);
    const expected = (d1 + d2) / (2 * d3);
    
    expect(ear).toBe(expected);
  });

  it('should calculate average EAR correctly', () => {
    const leftEye: EyeLandmarks = {
      p1: { x: 0, y: 0 },
      p2: { x: 1, y: 1 },
      p3: { x: 2, y: 1 },
      p4: { x: 5, y: 0 },
      p5: { x: 2, y: -1 },
      p6: { x: 1, y: -1 }
    };

    const rightEye: EyeLandmarks = {
      p1: { x: 0, y: 0 },
      p2: { x: 1, y: 1 },
      p3: { x: 2, y: 1 },
      p4: { x: 5, y: 0 },
      p5: { x: 2, y: -1 },
      p6: { x: 1, y: -1 }
    };

    const avgEAR = calculateAverageEAR(leftEye, rightEye);
    const expectedLeftEAR = calculateEAR(leftEye);
    const expectedRightEAR = calculateEAR(rightEye);
    const expected = (expectedLeftEAR + expectedRightEAR) / 2;
    
    expect(avgEAR).toBe(expected);
  });
});

describe('Landmark Extractor', () => {
  it('should extract eye landmarks correctly', () => {
    const landmarks = Array.from({ length: 468 }, (_, i) => ({
      x: i * 0.001,
      y: i * 0.001,
      z: 0
    }));

    const eyeIndices = [33, 7, 163, 144, 145, 153];
    const videoWidth = 640;
    const videoHeight = 480;

    const eyeLandmarks = extractEyeLandmarks(landmarks, eyeIndices, videoWidth, videoHeight);

    expect(eyeLandmarks.p1).toEqual({ x: 33 * 0.001 * 640, y: 33 * 0.001 * 480 });
    expect(eyeLandmarks.p2).toEqual({ x: 7 * 0.001 * 640, y: 7 * 0.001 * 480 });
    expect(eyeLandmarks.p3).toEqual({ x: 163 * 0.001 * 640, y: 163 * 0.001 * 480 });
    expect(eyeLandmarks.p4).toEqual({ x: 144 * 0.001 * 640, y: 144 * 0.001 * 480 });
    expect(eyeLandmarks.p5).toEqual({ x: 145 * 0.001 * 640, y: 145 * 0.001 * 480 });
    expect(eyeLandmarks.p6).toEqual({ x: 153 * 0.001 * 640, y: 153 * 0.001 * 480 });
  });

  it('should extract both eye landmarks correctly', () => {
    const landmarks = Array.from({ length: 468 }, (_, i) => ({
      x: i * 0.001,
      y: i * 0.001,
      z: 0
    }));

    const faceMeshResults: FaceMeshResults = {
      faceLandmarks: [landmarks]
    };

    const videoWidth = 640;
    const videoHeight = 480;

    const result = extractBothEyeLandmarks(faceMeshResults, videoWidth, videoHeight);

    expect(result).not.toBeNull();
    expect(result?.leftEye).toBeDefined();
    expect(result?.rightEye).toBeDefined();
  });

  it('should return null for empty face mesh results', () => {
    const faceMeshResults: FaceMeshResults = {
      faceLandmarks: []
    };

    const result = extractBothEyeLandmarks(faceMeshResults, 640, 480);

    expect(result).toBeNull();
  });

  it('should return null for insufficient landmarks', () => {
    const landmarks = Array.from({ length: 100 }, (_, i) => ({
      x: i * 0.001,
      y: i * 0.001,
      z: 0
    }));

    const faceMeshResults: FaceMeshResults = {
      faceLandmarks: [landmarks]
    };

    const result = extractBothEyeLandmarks(faceMeshResults, 640, 480);

    expect(result).toBeNull();
  });
});

describe('BlinkDetector', () => {
  let detector: BlinkDetector;

  beforeEach(() => {
    detector = new BlinkDetector({
      earThreshold: 0.25,
      consecutiveFrames: 2,
      debounceTime: 50
    });
  });

  it('should initialize with default config', () => {
    const defaultDetector = new BlinkDetector();
    expect(defaultDetector.getBlinkCount()).toBe(0);
  });

  it('should reset blink counter', () => {
    detector.resetBlinkCounter();
    expect(detector.getBlinkCount()).toBe(0);
  });

  it('should detect blinks with mock data', () => {
    const mockResults: FaceMeshResults = {
      faceLandmarks: [
        Array.from({ length: 468 }, (_, i) => ({
          x: i * 0.001,
          y: i * 0.001,
          z: 0
        }))
      ]
    };

    const result = detector['analyzeFrame'](mockResults, 640, 480, Date.now());

    expect(result).toBeDefined();
    expect(result.currentEAR).toBeGreaterThanOrEqual(0);
    expect(result.blinkCount).toBe(0);
    expect(result.isBlinking).toBe(false);
  });
});

describe('Video Blink Detection Integration', () => {
  it('should initialize detector with correct blink count', async () => {
    const detector = new BlinkDetector({
      earThreshold: 0.25,
      consecutiveFrames: 2,
      debounceTime: 100
    });

    const blinkCount = detector.getBlinkCount();
    
    expect(blinkCount).toBe(0);
  });
});