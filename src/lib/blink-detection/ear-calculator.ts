import { EyeLandmarks, Point2D } from './types';

export function calculateEuclideanDistance(p1: Point2D, p2: Point2D): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export function calculateEAR(landmarks: EyeLandmarks): number {
  const d1 = calculateEuclideanDistance(landmarks.p2, landmarks.p6);
  const d2 = calculateEuclideanDistance(landmarks.p3, landmarks.p5);
  const d3 = calculateEuclideanDistance(landmarks.p1, landmarks.p4);

  // Guard against division by zero (corrupted landmark data)
  if (d3 === 0) {
    return 0;
  }

  const ear = (d1 + d2) / (2 * d3);
  return ear;
}

export function calculateAverageEAR(leftEyeLandmarks: EyeLandmarks, rightEyeLandmarks: EyeLandmarks): number {
  const leftEAR = calculateEAR(leftEyeLandmarks);
  const rightEAR = calculateEAR(rightEyeLandmarks);
  
  return (leftEAR + rightEAR) / 2;
}