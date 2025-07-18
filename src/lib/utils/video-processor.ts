import { BlinkDetector } from '../blink-detection/blink-detector';
import { BlinkDetectionResult } from '../blink-detection/types';

export class VideoProcessor {
  private detector: BlinkDetector;
  private isProcessing = false;

  constructor(detector: BlinkDetector) {
    this.detector = detector;
  }

  async processVideo(videoElement: HTMLVideoElement): Promise<number> {
    if (this.isProcessing) {
      throw new Error('Video processing already in progress');
    }

    this.isProcessing = true;
    this.detector.resetBlinkCounter();

    try {
      await this.detector.initialize();
      
      return new Promise((resolve, reject) => {
        const processFrame = async () => {
          if (videoElement.ended) {
            this.isProcessing = false;
            resolve(this.detector.getBlinkCount());
            return;
          }

          try {
            await this.detector.processFrame(videoElement);
            
            setTimeout(() => {
              requestAnimationFrame(processFrame);
            }, 33);
          } catch (error) {
            this.isProcessing = false;
            reject(error);
          }
        };

        videoElement.addEventListener('loadedmetadata', () => {
          videoElement.play();
          processFrame();
        });

        videoElement.addEventListener('error', (error) => {
          this.isProcessing = false;
          reject(error);
        });
      });
    } catch (error) {
      this.isProcessing = false;
      throw error;
    }
  }

  async processVideoWithCallback(
    videoElement: HTMLVideoElement,
    onResult: (result: BlinkDetectionResult) => void
  ): Promise<number> {
    if (this.isProcessing) {
      throw new Error('Video processing already in progress');
    }

    this.isProcessing = true;
    this.detector.resetBlinkCounter();

    try {
      await this.detector.initialize();
      
      return new Promise((resolve, reject) => {
        const processFrame = async () => {
          if (videoElement.ended) {
            this.isProcessing = false;
            resolve(this.detector.getBlinkCount());
            return;
          }

          try {
            const result = await this.detector.processFrame(videoElement);
            onResult(result);
            
            setTimeout(() => {
              requestAnimationFrame(processFrame);
            }, 33);
          } catch (error) {
            this.isProcessing = false;
            reject(error);
          }
        };

        videoElement.addEventListener('loadedmetadata', () => {
          videoElement.play();
          processFrame();
        });

        videoElement.addEventListener('error', (error) => {
          this.isProcessing = false;
          reject(error);
        });
      });
    } catch (error) {
      this.isProcessing = false;
      throw error;
    }
  }

  stopProcessing(): void {
    this.isProcessing = false;
  }

  dispose(): void {
    this.detector.dispose();
  }
}