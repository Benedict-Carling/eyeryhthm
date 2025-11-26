/**
 * TypeScript declarations for ImageCapture API
 *
 * The ImageCapture API is supported in Chromium-based browsers (including Electron)
 * since Chrome 59 (2017). Electron 39 uses Chromium 142 and has full support.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/ImageCapture
 * @see https://w3c.github.io/mediacapture-image/
 */

interface ImageCapture {
  readonly track: MediaStreamTrack;

  /**
   * Takes a snapshot of the live video in a MediaStreamTrack.
   * Returns a Promise that resolves with an ImageBitmap containing the snapshot.
   *
   * The ImageBitmap will have the resolution of the video source (usually lower
   * than the camera's still-image capabilities).
   *
   * @returns Promise<ImageBitmap> - The captured frame
   */
  grabFrame(): Promise<ImageBitmap>;

  /**
   * Takes a photograph using the video capture device.
   * Returns a Promise that resolves with a Blob containing the image data.
   *
   * @returns Promise<Blob> - The captured photo
   */
  takePhoto(photoSettings?: PhotoSettings): Promise<Blob>;

  /**
   * Returns a Promise that resolves with a PhotoCapabilities object
   * containing the ranges of available configuration options.
   */
  getPhotoCapabilities(): Promise<PhotoCapabilities>;

  /**
   * Returns a Promise that resolves with a PhotoSettings object
   * containing the current photo configuration settings.
   */
  getPhotoSettings(): Promise<PhotoSettings>;
}

interface PhotoCapabilities {
  readonly redEyeReduction: 'never' | 'always' | 'controllable';
  readonly imageHeight: MediaSettingsRange;
  readonly imageWidth: MediaSettingsRange;
  readonly fillLightMode: string[];
}

interface PhotoSettings {
  fillLightMode?: 'auto' | 'off' | 'flash';
  imageHeight?: number;
  imageWidth?: number;
  redEyeReduction?: boolean;
}

interface MediaSettingsRange {
  readonly max: number;
  readonly min: number;
  readonly step: number;
}

/**
 * ImageCapture constructor
 * Creates a new ImageCapture object which can be used to capture still frames
 * from a MediaStreamTrack.
 *
 * @param track - The MediaStreamTrack to capture from
 */
declare const ImageCapture: {
  prototype: ImageCapture;
  new (track: MediaStreamTrack): ImageCapture;
};
