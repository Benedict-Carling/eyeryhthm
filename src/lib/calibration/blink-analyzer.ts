interface EARDataPoint {
  time: number;
  ear: number;
}

interface BlinkAnalysisResult {
  detectedBlinks: number;
  minThreshold: number;
  maxThreshold: number;
  calibratedThreshold: number;
  blinkTimestamps: number[];
}

export class BlinkAnalyzer {
  /**
   * Analyzes EAR data to find the optimal threshold that would detect exactly 10 blinks
   * within the 0.1 to 0.4 range
   */
  static analyzeBlinkData(
    earData: EARDataPoint[],
    targetBlinks: number = 10,
    minThreshold: number = 0.1,
    maxThreshold: number = 0.4
  ): BlinkAnalysisResult {
    const thresholdStep = 0.005;
    const analysisResults: Array<{
      threshold: number;
      blinkCount: number;
      blinkTimestamps: number[];
    }> = [];

    // Test different thresholds
    for (let threshold = minThreshold; threshold <= maxThreshold; threshold += thresholdStep) {
      const { blinkCount, blinkTimestamps } = this.countBlinksAtThreshold(earData, threshold);
      analysisResults.push({ threshold, blinkCount, blinkTimestamps });
    }

    // Find thresholds that give exactly targetBlinks
    const exactMatches = analysisResults.filter(r => r.blinkCount === targetBlinks);

    if (exactMatches.length > 0) {
      // If we have exact matches, use the middle threshold
      const minExactThreshold = Math.min(...exactMatches.map(r => r.threshold));
      const maxExactThreshold = Math.max(...exactMatches.map(r => r.threshold));
      const calibratedThreshold = (minExactThreshold + maxExactThreshold) / 2;
      
      // Get the blink timestamps for the calibrated threshold
      const calibratedResult = this.countBlinksAtThreshold(earData, calibratedThreshold);

      return {
        detectedBlinks: targetBlinks,
        minThreshold: minExactThreshold,
        maxThreshold: maxExactThreshold,
        calibratedThreshold,
        blinkTimestamps: calibratedResult.blinkTimestamps,
      };
    }

    // If no exact match, find the closest
    const closestResult = analysisResults.reduce((closest, current) => {
      const currentDiff = Math.abs(current.blinkCount - targetBlinks);
      const closestDiff = Math.abs(closest.blinkCount - targetBlinks);
      return currentDiff < closestDiff ? current : closest;
    });

    return {
      detectedBlinks: closestResult.blinkCount,
      minThreshold: closestResult.threshold,
      maxThreshold: closestResult.threshold,
      calibratedThreshold: closestResult.threshold,
      blinkTimestamps: closestResult.blinkTimestamps,
    };
  }

  /**
   * Counts blinks at a specific threshold
   */
  private static countBlinksAtThreshold(
    earData: EARDataPoint[],
    threshold: number
  ): { blinkCount: number; blinkTimestamps: number[] } {
    const blinkTimestamps: number[] = [];
    let isBlinking = false;
    let consecutiveBelowThreshold = 0;
    const minConsecutiveFrames = 2;
    const minBlinkDuration = 50; // ms
    const maxBlinkDuration = 400; // ms
    let blinkStartTime = 0;

    for (let i = 0; i < earData.length; i++) {
      const point = earData[i];

      if (!point) continue;

      if (point.ear < threshold) {
        consecutiveBelowThreshold++;

        if (!isBlinking && consecutiveBelowThreshold >= minConsecutiveFrames) {
          isBlinking = true;
          blinkStartTime = point.time;
        }
      } else {
        if (isBlinking) {
          const blinkDuration = point.time - blinkStartTime;
          
          // Only count as a blink if duration is reasonable
          if (blinkDuration >= minBlinkDuration && blinkDuration <= maxBlinkDuration) {
            // Check if this is not too close to the previous blink (debounce)
            const lastBlinkTime = blinkTimestamps[blinkTimestamps.length - 1] || 0;
            if (blinkStartTime - lastBlinkTime > 100) {
              blinkTimestamps.push(blinkStartTime);
            }
          }
          
          isBlinking = false;
        }
        consecutiveBelowThreshold = 0;
      }
    }

    return {
      blinkCount: blinkTimestamps.length,
      blinkTimestamps,
    };
  }

  /**
   * Validates if the blink pattern is reasonable
   */
  static validateBlinkPattern(blinkTimestamps: number[]): boolean {
    if (blinkTimestamps.length < 2) return true;

    // Check if blinks are reasonably spaced
    const intervals: number[] = [];
    for (let i = 1; i < blinkTimestamps.length; i++) {
      const current = blinkTimestamps[i];
      const previous = blinkTimestamps[i - 1];
      if (current !== undefined && previous !== undefined) {
        intervals.push(current - previous);
      }
    }

    // All intervals should be at least 200ms (can't blink faster than 5 times per second)
    const tooFastBlinks = intervals.some(interval => interval < 200);
    if (tooFastBlinks) return false;

    // Check for reasonable variance in intervals (not robotic)
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - avgInterval, 2);
    }, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // If standard deviation is too low, pattern might be artificial
    if (stdDev < 50 && intervals.length > 5) return false;

    return true;
  }
}