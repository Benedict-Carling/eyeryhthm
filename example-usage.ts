// Example usage of the blink detection system
import { BlinkDetector, VideoProcessor } from './src/lib/blink-detection';

// Example 1: Basic usage with video element
async function detectBlinksInVideo() {
  const detector = new BlinkDetector({
    earThreshold: 0.25,
    consecutiveFrames: 2,
    debounceTime: 100
  });

  const processor = new VideoProcessor(detector);

  // Get video element (assume it's already in the DOM)
  const video = document.getElementById('test-video') as HTMLVideoElement;
  video.src = 'tests/7-blinks.mp4';

  try {
    const blinkCount = await processor.processVideo(video);
    console.log(`Detected ${blinkCount} blinks`); // Should output: "Detected 7 blinks"
  } catch (error) {
    console.error('Error processing video:', error);
  } finally {
    processor.dispose();
  }
}

// Example 2: Real-time processing with callback
async function detectBlinksWithCallback() {
  const detector = new BlinkDetector({
    earThreshold: 0.25,
    consecutiveFrames: 3,
    debounceTime: 150
  });

  const processor = new VideoProcessor(detector);
  const video = document.getElementById('camera-video') as HTMLVideoElement;

  try {
    const blinkCount = await processor.processVideoWithCallback(video, (result) => {
      console.log(`Current blinks: ${result.blinkCount}`);
      console.log(`Current EAR: ${result.currentEAR.toFixed(3)}`);
      console.log(`Is blinking: ${result.isBlinking}`);
      
      // You can update UI here
      document.getElementById('blink-count')!.textContent = `Blinks: ${result.blinkCount}`;
      document.getElementById('ear-value')!.textContent = `EAR: ${result.currentEAR.toFixed(3)}`;
    });

    console.log(`Final blink count: ${blinkCount}`);
  } catch (error) {
    console.error('Error processing video:', error);
  } finally {
    processor.dispose();
  }
}

// Example 3: Using the React hook
/*
import { useBlinkDetection } from './src/hooks/useBlinkDetection';

function BlinkDetectionComponent() {
  const {
    blinkCount,
    currentEAR,
    isBlinking,
    isProcessing,
    error,
    processVideo,
    resetCounter
  } = useBlinkDetection({
    earThreshold: 0.25,
    consecutiveFrames: 2,
    debounceTime: 100
  });

  const handleProcessVideo = async () => {
    const video = document.getElementById('video') as HTMLVideoElement;
    video.src = 'tests/7-blinks.mp4';
    
    try {
      const count = await processVideo(video);
      console.log(`Detected ${count} blinks`);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <video id="video" controls />
      <button onClick={handleProcessVideo} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Detect Blinks'}
      </button>
      <button onClick={resetCounter}>Reset Counter</button>
      
      <div>
        <p>Blinks detected: {blinkCount}</p>
        <p>Current EAR: {currentEAR.toFixed(3)}</p>
        <p>Currently blinking: {isBlinking ? 'Yes' : 'No'}</p>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      </div>
    </div>
  );
}
*/

// Example 4: Direct detector usage
async function directDetectorUsage() {
  const detector = new BlinkDetector({
    earThreshold: 0.25,
    consecutiveFrames: 2,
    debounceTime: 100
  });

  await detector.initialize();
  
  const video = document.getElementById('video') as HTMLVideoElement;
  
  // Process single frame
  const result = await detector.processFrame(video);
  console.log('Frame result:', result);
  
  // Get current blink count
  const count = detector.getBlinkCount();
  console.log('Current blink count:', count);
  
  // Reset counter
  detector.resetBlinkCounter();
  
  // Dispose when done
  detector.dispose();
}

export {
  detectBlinksInVideo,
  detectBlinksWithCallback,
  directDetectorUsage
};