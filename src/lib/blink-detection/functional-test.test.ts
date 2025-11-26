import { describe, it, expect } from "vitest";
import { BlinkDetector } from "./blink-detector";
import { calculateEAR } from "./ear-calculator";
import { EyeLandmarks } from "./types";

describe("Functional Blink Detection Test", () => {
  it("should detect exactly 7 blinks with the expected algorithm", () => {
    const detector = new BlinkDetector({
      earThreshold: 0.25,
      consecutiveFrames: 2,
      debounceTime: 50,
    });

    detector.resetBlinkCounter();

    // Create test data that should produce exactly 7 blinks
    const testFrames = [
      // Frame 1-5: Eyes open (EAR > 0.25)
      { ear: 0.35, expectBlink: false },
      { ear: 0.34, expectBlink: false },
      { ear: 0.33, expectBlink: false },
      { ear: 0.32, expectBlink: false },
      { ear: 0.31, expectBlink: false },

      // Blink 1: Frames 6-8 (EAR < 0.25 for 3 consecutive frames)
      { ear: 0.2, expectBlink: false }, // Frame 6: Below threshold, count = 1
      { ear: 0.18, expectBlink: false }, // Frame 7: Below threshold, count = 2 (trigger blink)
      { ear: 0.19, expectBlink: true }, // Frame 8: Still below, blink detected

      // Eyes open again
      { ear: 0.3, expectBlink: false },
      { ear: 0.31, expectBlink: false },
      { ear: 0.32, expectBlink: false },
      { ear: 0.33, expectBlink: false },
      { ear: 0.34, expectBlink: false },

      // Blink 2: Frames 14-16
      { ear: 0.22, expectBlink: false },
      { ear: 0.21, expectBlink: false },
      { ear: 0.2, expectBlink: true },

      // Eyes open
      { ear: 0.3, expectBlink: false },
      { ear: 0.31, expectBlink: false },
      { ear: 0.32, expectBlink: false },
      { ear: 0.33, expectBlink: false },
      { ear: 0.34, expectBlink: false },

      // Blink 3: Frames 22-24
      { ear: 0.23, expectBlink: false },
      { ear: 0.22, expectBlink: false },
      { ear: 0.21, expectBlink: true },

      // Eyes open
      { ear: 0.3, expectBlink: false },
      { ear: 0.31, expectBlink: false },
      { ear: 0.32, expectBlink: false },
      { ear: 0.33, expectBlink: false },
      { ear: 0.34, expectBlink: false },

      // Blink 4: Frames 30-32
      { ear: 0.24, expectBlink: false },
      { ear: 0.23, expectBlink: false },
      { ear: 0.22, expectBlink: true },

      // Eyes open
      { ear: 0.3, expectBlink: false },
      { ear: 0.31, expectBlink: false },
      { ear: 0.32, expectBlink: false },
      { ear: 0.33, expectBlink: false },
      { ear: 0.34, expectBlink: false },

      // Blink 5: Frames 38-40
      { ear: 0.24, expectBlink: false },
      { ear: 0.23, expectBlink: false },
      { ear: 0.22, expectBlink: true },

      // Eyes open
      { ear: 0.3, expectBlink: false },
      { ear: 0.31, expectBlink: false },
      { ear: 0.32, expectBlink: false },
      { ear: 0.33, expectBlink: false },
      { ear: 0.34, expectBlink: false },

      // Blink 6: Frames 46-48
      { ear: 0.24, expectBlink: false },
      { ear: 0.23, expectBlink: false },
      { ear: 0.22, expectBlink: true },

      // Eyes open
      { ear: 0.3, expectBlink: false },
      { ear: 0.31, expectBlink: false },
      { ear: 0.32, expectBlink: false },
      { ear: 0.33, expectBlink: false },
      { ear: 0.34, expectBlink: false },

      // Blink 7: Frames 54-56
      { ear: 0.24, expectBlink: false },
      { ear: 0.23, expectBlink: false },
      { ear: 0.22, expectBlink: true },

      // Eyes open to end
      { ear: 0.3, expectBlink: false },
      { ear: 0.31, expectBlink: false },
      { ear: 0.32, expectBlink: false },
    ];

    let detectedBlinks = 0;

    // Process each frame by directly calling the private detection logic
    testFrames.forEach((frame, index) => {
      const timestamp = index * 50 + 1000; // 50ms apart, starting at 1000ms

      // Access private method using bracket notation
      const isBlinking = (
        detector as unknown as { detectBlink: (ear: number, timestamp: number) => boolean }
      ).detectBlink(frame.ear, timestamp);

      if (isBlinking && !frame.expectBlink) {
        // A blink was detected when we didn't expect one
        console.log(
          `Unexpected blink detected at frame ${index + 1}, EAR: ${frame.ear}`
        );
      }

      if (isBlinking) {
        detectedBlinks++;
      }
    });

    const finalBlinkCount = detector.getBlinkCount();

    console.log(`Detected ${finalBlinkCount} blinks total`);
    console.log(`Blink events triggered: ${detectedBlinks}`);

    // We should detect exactly 7 blinks
    expect(finalBlinkCount).toBe(7);
  });

  it("should correctly calculate EAR for realistic eye shapes", () => {
    // Test with realistic eye landmark positions
    const openEye: EyeLandmarks = {
      p1: { x: 100, y: 150 }, // Left corner
      p2: { x: 110, y: 140 }, // Top left
      p3: { x: 130, y: 140 }, // Top right
      p4: { x: 140, y: 150 }, // Right corner
      p5: { x: 130, y: 160 }, // Bottom right
      p6: { x: 110, y: 160 }, // Bottom left
    };

    const closedEye: EyeLandmarks = {
      p1: { x: 100, y: 150 }, // Left corner
      p2: { x: 110, y: 148 }, // Top left (closer to center)
      p3: { x: 130, y: 148 }, // Top right (closer to center)
      p4: { x: 140, y: 150 }, // Right corner
      p5: { x: 130, y: 152 }, // Bottom right (closer to center)
      p6: { x: 110, y: 152 }, // Bottom left (closer to center)
    };

    const openEAR = calculateEAR(openEye);
    const closedEAR = calculateEAR(closedEye);

    expect(openEAR).toBeGreaterThan(0.25);
    expect(closedEAR).toBeLessThan(0.25);
    expect(openEAR).toBeGreaterThan(closedEAR);
  });

  it("should handle edge cases properly", () => {
    const detector = new BlinkDetector({
      earThreshold: 0.25,
      consecutiveFrames: 2,
      debounceTime: 100,
    });

    detector.resetBlinkCounter();

    const detectorWithPrivateMethods = detector as unknown as {
      detectBlink: (ear: number, timestamp: number) => boolean;
    };

    // Test single frame below threshold (should not trigger blink)
    detectorWithPrivateMethods.detectBlink(0.2, 1000);
    expect(detector.getBlinkCount()).toBe(0);

    // Test two consecutive frames below threshold (should trigger blink)
    detectorWithPrivateMethods.detectBlink(0.2, 1100);
    expect(detector.getBlinkCount()).toBe(1);

    // Test immediate second blink (should be debounced)
    detectorWithPrivateMethods.detectBlink(0.2, 1110);
    detectorWithPrivateMethods.detectBlink(0.2, 1120);
    expect(detector.getBlinkCount()).toBe(1); // Still 1 due to debounce

    // Test blink after debounce period
    detectorWithPrivateMethods.detectBlink(0.3, 1300); // Reset state
    detectorWithPrivateMethods.detectBlink(0.2, 1400);
    detectorWithPrivateMethods.detectBlink(0.2, 1450);
    expect(detector.getBlinkCount()).toBe(2);
  });
});
