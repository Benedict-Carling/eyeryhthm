/**
 * Type definitions for MediaStreamTrackProcessor and VideoFrame APIs
 * These are experimental WebCodecs APIs supported in Chromium-based browsers
 */

interface MediaStreamTrackProcessorInit {
  track: MediaStreamTrack;
  maxBufferSize?: number;
}

declare class MediaStreamTrackProcessor {
  constructor(init: MediaStreamTrackProcessorInit);
  readonly readable: ReadableStream<VideoFrame>;
}

interface VideoFrameInit {
  format?: string;
  codedWidth?: number;
  codedHeight?: number;
  timestamp?: number;
  duration?: number;
  visibleRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

declare class VideoFrame {
  constructor(
    image: CanvasImageSource | BufferSource,
    init?: VideoFrameInit
  );
  readonly format: string | null;
  readonly codedWidth: number;
  readonly codedHeight: number;
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly timestamp: number;
  readonly duration: number | null;
  readonly visibleRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  allocationSize(options?: { rect?: DOMRectInit }): number;
  copyTo(
    destination: BufferSource,
    options?: { rect?: DOMRectInit }
  ): Promise<void>;
  clone(): VideoFrame;
  close(): void;
}

// Extend TexImageSource to include VideoFrame
interface TexImageSource {
  width: number;
  height: number;
}

declare global {
  interface Window {
    MediaStreamTrackProcessor: typeof MediaStreamTrackProcessor;
    VideoFrame: typeof VideoFrame;
  }
}

export {};
