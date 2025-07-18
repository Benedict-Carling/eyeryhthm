# Greyscale Camera Feed Implementation Plan

## Problem
Camera permissions are granted and browser shows active video usage, but the video display box remains black. Need to implement a greyscale live camera feed to reduce CPU usage.

## Implementation Plan

1. **Investigate Current Camera Implementation**
   - Check existing camera-related code
   - Identify why video display is black despite permissions
   - Review video element setup and constraints

2. **Fix Camera Feed Display**
   - Ensure proper video element configuration
   - Verify getUserMedia constraints are correct
   - Check for any CSS or styling issues blocking display

3. **Implement Greyscale Conversion**
   - Add Canvas element for video processing
   - Implement greyscale filter using Canvas 2D context
   - Use CSS filters as fallback for better performance

4. **Optimize for Performance**
   - Use requestAnimationFrame for smooth rendering
   - Consider reducing video resolution if needed
   - Implement efficient greyscale conversion method

## Technical Approach
- Canvas-based processing for greyscale conversion
- CSS filter: grayscale(100%) as primary method (most efficient)
- Canvas drawImage + ImageData manipulation as fallback
- Monitor performance and adjust accordingly