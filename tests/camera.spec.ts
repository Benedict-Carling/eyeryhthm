import { test, expect } from '@playwright/test';

test.describe('Camera Component', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera']);
    
    // Navigate to the page
    await page.goto('/');
  });

  test('should display camera permission button initially', async ({ page }) => {
    await expect(page.locator('button:has-text("Start Camera")')).toBeVisible();
  });

  test('should request camera access when button is clicked', async ({ page }) => {
    // Click the start camera button
    await page.locator('button:has-text("Start Camera")').click();
    
    // Should show loading state
    await expect(page.locator('text=Requesting camera permission...')).toBeVisible();
    
    // Wait for either success or error
    await page.waitForSelector('video, text=Camera permission denied, text=Failed to access camera', { timeout: 10000 });
  });

  test('should display video element when camera access is granted', async ({ page }) => {
    // Mock getUserMedia to return a fake stream
    await page.addInitScript(() => {
      // Create a mock video track
      const mockVideoTrack = {
        kind: 'video',
        enabled: true,
        stop: () => {},
        getSettings: () => ({ width: 640, height: 480 }),
      };

      // Create a mock stream
      const mockStream = {
        getTracks: () => [mockVideoTrack],
        getVideoTracks: () => [mockVideoTrack],
        addTrack: () => {},
        removeTrack: () => {},
      };

      // Mock getUserMedia
      navigator.mediaDevices.getUserMedia = async () => {
        return mockStream as MediaStream;
      };
    });

    // Click the start camera button
    await page.locator('button:has-text("Start Camera")').click();
    
    // Should show video element
    await expect(page.locator('video')).toBeVisible({ timeout: 10000 });
    
    // Check video attributes
    const video = page.locator('video');
    await expect(video).toHaveAttribute('autoplay');
    await expect(video).toHaveAttribute('muted');
    await expect(video).toHaveAttribute('playsinline');
    
    // Should show stop button
    await expect(page.locator('button:has-text("Stop Camera")')).toBeVisible();
  });

  test('should apply grayscale filter to video', async ({ page }) => {
    // Mock getUserMedia
    await page.addInitScript(() => {
      const mockVideoTrack = {
        kind: 'video',
        enabled: true,
        stop: () => {},
        getSettings: () => ({ width: 640, height: 480 }),
      };

      const mockStream = {
        getTracks: () => [mockVideoTrack],
        getVideoTracks: () => [mockVideoTrack],
        addTrack: () => {},
        removeTrack: () => {},
      };

      navigator.mediaDevices.getUserMedia = async () => {
        return mockStream as MediaStream;
      };
    });

    await page.locator('button:has-text("Start Camera")').click();
    
    // Wait for video to appear
    await expect(page.locator('video')).toBeVisible({ timeout: 10000 });
    
    // Check that grayscale filter is applied
    const video = page.locator('video');
    const styles = await video.getAttribute('style');
    expect(styles).toContain('filter: grayscale(100%)');
  });

  test('should stop camera when stop button is clicked', async ({ page }) => {
    // Mock getUserMedia
    await page.addInitScript(() => {
      const mockVideoTrack = {
        kind: 'video',
        enabled: true,
        stop: () => {},
        getSettings: () => ({ width: 640, height: 480 }),
      };

      const mockStream = {
        getTracks: () => [mockVideoTrack],
        getVideoTracks: () => [mockVideoTrack],
        addTrack: () => {},
        removeTrack: () => {},
      };

      navigator.mediaDevices.getUserMedia = async () => {
        return mockStream as MediaStream;
      };
    });

    // Start camera
    await page.locator('button:has-text("Start Camera")').click();
    await expect(page.locator('video')).toBeVisible({ timeout: 10000 });
    
    // Stop camera
    await page.locator('button:has-text("Stop Camera")').click();
    
    // Video should be gone and start button should be back
    await expect(page.locator('video')).not.toBeVisible();
    await expect(page.locator('button:has-text("Start Camera")')).toBeVisible();
  });

  test('should handle camera permission denied', async ({ page }) => {
    // Mock getUserMedia to throw permission error
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const error = new Error('Permission denied');
        error.name = 'NotAllowedError';
        throw error;
      };
    });

    await page.locator('button:has-text("Start Camera")').click();
    
    // Should show error message
    await expect(page.locator('text=Camera permission denied')).toBeVisible({ timeout: 10000 });
  });

  test('should handle generic camera error', async ({ page }) => {
    // Mock getUserMedia to throw generic error
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const error = new Error('Camera not available');
        error.name = 'NotFoundError';
        throw error;
      };
    });

    await page.locator('button:has-text("Start Camera")').click();
    
    // Should show error message
    await expect(page.locator('text=Failed to access camera')).toBeVisible({ timeout: 10000 });
  });
});