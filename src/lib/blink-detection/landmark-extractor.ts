import { EyeLandmarks, FaceMeshResults } from './types';

const RIGHT_EYE_INDICES = [33, 159, 158, 133, 153, 145];
const LEFT_EYE_INDICES = [362, 380, 374, 263, 386, 385];

export function extractEyeLandmarks(
  landmarks: Array<{ x: number; y: number; z: number }>,
  eyeIndices: number[],
  videoWidth: number,
  videoHeight: number
): EyeLandmarks {
  const points = eyeIndices.map(index => ({
    x: landmarks[index].x * videoWidth,
    y: landmarks[index].y * videoHeight
  }));

  return {
    p1: points[0],
    p2: points[1],
    p3: points[2],
    p4: points[3],
    p5: points[4],
    p6: points[5]
  };
}

export function extractBothEyeLandmarks(
  faceMeshResults: FaceMeshResults,
  videoWidth: number,
  videoHeight: number
): { leftEye: EyeLandmarks; rightEye: EyeLandmarks } | null {
  if (!faceMeshResults.faceLandmarks || faceMeshResults.faceLandmarks.length === 0) {
    return null;
  }

  const landmarks = faceMeshResults.faceLandmarks[0];
  
  if (landmarks.length < 468) {
    return null;
  }

  const leftEye = extractEyeLandmarks(landmarks, LEFT_EYE_INDICES, videoWidth, videoHeight);
  const rightEye = extractEyeLandmarks(landmarks, RIGHT_EYE_INDICES, videoWidth, videoHeight);

  return { leftEye, rightEye };
}