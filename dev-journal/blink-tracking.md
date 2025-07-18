# Updated Claude Code Prompt for MediaPipe Face Mesh

Here's the complete prompt for Claude Code:

---

**Prompt for Claude Code:**

```
I need you to implement a blink detection system for my Next.js app using @mediapipe/face_mesh and the EAR (Eye Aspect Ratio) algorithm from the 2016 Soukupova & Cech paper "Real-Time Eye Blink Detection Using Facial Landmarks."

Requirements:
1. Create a reusable blink detection module that can process both video files and live camera streams
2. Implement the EAR algorithm using MediaPipe Face Mesh landmarks
3. Build it to detect blinks in a test video (7 blinks) and return the exact count
4. Structure it so we can later plug it into live camera functionality
5. Include comprehensive unit tests using Vitest

Technical Details about EAR Algorithm:
- EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
- Uses 6 facial landmarks around each eye
- Normal EAR when eyes open: ~0.3
- EAR drops significantly when eyes close: ~0.1-0.15
- Blink detected when EAR falls below threshold for consecutive frames
- Typical threshold: 0.25-0.3
- Consecutive frame requirement: 2-3 frames to avoid false positives

MediaPipe Face Mesh Implementation:
- Use @mediapipe/face_mesh library
- Extract eye landmark indices from the 468 facial landmarks
- Left eye landmarks: indices [33, 7, 163, 144, 145, 153]
- Right eye landmarks: indices [362, 382, 381, 380, 374, 373]
- Convert normalized coordinates to pixel coordinates
- Calculate EAR for both eyes and use average

Implementation Structure:
```

src/
├── lib/
│ ├── blink-detection/
│ │ ├── ear-calculator.ts # EAR algorithm implementation
│ │ ├── blink-detector.ts # Main blink detection class
│ │ ├── face-mesh-processor.ts # MediaPipe Face Mesh integration
│ │ ├── landmark-extractor.ts # Extract eye landmarks from 468 points
│ │ └── types.ts # TypeScript types
│ └── utils/
│ └── video-processor.ts # Video processing utilities
├── components/
│ └── blink-counter/
│ ├── BlinkCounter.tsx # React component
│ └── BlinkStats.tsx # Stats display
└── hooks/
└── useBlinkDetection.ts # React hook for blink detection

````

Key Features to Build:
1. **Face Mesh Processor**: Initialize and run MediaPipe Face Mesh on video frames
2. **Landmark Extractor**: Extract the 12 eye landmarks from 468 total landmarks
3. **EAR Calculator**: Pure function that calculates EAR from 6 eye landmarks
4. **Blink Detector**: Class that processes frames, calculates EAR, and detects blinks
5. **Video Processor**: Utility to process video files frame by frame
6. **React Hook**: useBlinkDetection hook for integration with React components
7. **Blink Counter Component**: UI component that displays blink count and stats

MediaPipe Face Mesh Landmark Indices:
- Right eye: [33, 7, 163, 144, 145, 153]
- Left eye: [362, 382, 381, 380, 374, 373]
- These correspond to the 6 points needed for EAR calculation (p1-p6)

EAR Calculation Steps:
1. Extract eye landmarks from MediaPipe results
2. Convert normalized coordinates to pixel coordinates
3. Calculate euclidean distances between landmark pairs
4. Apply EAR formula: (d1 + d2) / (2 * d3)
5. Average EAR values from both eyes
6. Track EAR over time to detect blinks

Blink Detection Logic:
1. Calculate EAR for current frame
2. Compare with threshold (default 0.25)
3. Track consecutive frames below threshold
4. Trigger blink detection after 2-3 consecutive frames
5. Reset counter when EAR returns above threshold
6. Apply debouncing to prevent multiple detections

Testing Requirements:
- Unit tests for EAR calculation function with known coordinates
- Unit tests for landmark extraction from MediaPipe results
- Integration tests using the test video (should detect exactly 7 blinks)
- Mock tests for MediaPipe Face Mesh
- Performance tests to ensure real-time capability (30 FPS)

Libraries to install:
```bash
npm install @mediapipe/face_mesh
npm install @mediapipe/camera_utils
npm install @mediapipe/drawing_utils
````

The test video is located at: `public/test-videos/blink-test-7.mp4`

Please structure this as a modular, reusable system that can be easily integrated into the existing camera functionality later. Focus on accuracy and performance for real-time processing.

TypeScript Interfaces to include:

```typescript
interface EyeLandmarks {
  p1: Point2D;
  p2: Point2D;
  p3: Point2D;
  p4: Point2D;
  p5: Point2D;
  p6: Point2D;
}

interface BlinkDetectionResult {
  blinkCount: number;
  currentEAR: number;
  isBlinking: boolean;
  timestamp: number;
}

interface BlinkDetectorConfig {
  earThreshold: number;
  consecutiveFrames: number;
  debounceTime: number;
}
```

Key Functions to implement:

1. `initializeFaceMesh()` - Initialize MediaPipe Face Mesh
2. `extractEyeLandmarks(results)` - Extract eye landmarks from Face Mesh results
3. `calculateEAR(landmarks)` - Calculate EAR from 6 eye landmarks
4. `detectBlinks(videoElement)` - Main function to process video and detect blinks
5. `processVideoFrame(frame)` - Process single video frame
6. `resetBlinkCounter()` - Reset detection state

Error Handling Requirements:

- Handle MediaPipe initialization failures
- Graceful fallback when no face detected
- Handle video processing errors
- Validate landmark data integrity
- Performance monitoring and warnings

Performance Optimizations:

- Process every 2nd or 3rd frame for better performance
- Use requestAnimationFrame for smooth video processing
- Implement frame skipping under heavy load
- Memory management for long-running detection

The end goal is to have a `detectBlinks(videoElement)` function that can be called with either a video file or live camera stream and return accurate blink counts using the scientifically-proven EAR algorithm with MediaPipe Face Mesh landmark detection.

Make sure the implementation is production-ready with proper error handling, performance optimizations, and comprehensive testing.

````

---

## Additional Context for Claude Code

### Installation Commands
```bash
npm install @mediapipe/face_mesh @mediapipe/camera_utils @mediapipe/drawing_utils
npm install -D @types/dom-mediacapture-transform
````

### Expected Output Structure

The implementation should result in a clean API like:

```typescript
// Usage example
const detector = new BlinkDetector({
  earThreshold: 0.25,
  consecutiveFrames: 3,
  debounceTime: 100,
});

// For video file
const result = await detector.detectBlinks(videoElement);
console.log(`Detected ${result.blinkCount} blinks`); // Should output: 7

// For live camera
const liveDetector = detector.startLiveDetection(videoElement, (result) => {
  console.log(`Current blinks: ${result.blinkCount}`);
});
```

### Testing Strategy

The implementation should include:

1. **Unit tests** for pure functions (EAR calculation)
2. **Integration tests** with the 7-blink video
3. **Mock tests** for MediaPipe Face Mesh
4. **Performance benchmarks** for real-time processing

This prompt gives Claude Code everything needed to build a complete, production-ready blink detection system using MediaPipe Face Mesh and the EAR algorithm.
