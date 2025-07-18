import { BlinkDetector } from './blink-detector';
import { VideoProcessor } from '../utils/video-processor';

export async function testVideoBlinkDetection(videoPath: string): Promise<number> {
  const detector = new BlinkDetector({
    earThreshold: 0.25,
    consecutiveFrames: 2,
    debounceTime: 100
  });

  const processor = new VideoProcessor(detector);
  
  const videoElement = document.createElement('video');
  videoElement.src = videoPath;
  videoElement.crossOrigin = 'anonymous';
  videoElement.muted = true;
  
  try {
    const blinkCount = await processor.processVideo(videoElement);
    processor.dispose();
    return blinkCount;
  } catch (error) {
    processor.dispose();
    throw error;
  }
}

if (typeof window !== 'undefined') {
  (window as typeof window & { testVideoBlinkDetection: typeof testVideoBlinkDetection }).testVideoBlinkDetection = testVideoBlinkDetection;
}