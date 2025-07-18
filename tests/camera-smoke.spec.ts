import { expect } from '@playwright/test';
import { cameraTest } from './fixtures/camera-setup';

cameraTest.describe('Camera Smoke Tests', () => {
  cameraTest('permission button appears', async ({ cameraPage }) => {
    await expect(cameraPage.getByRole('button', { name: /start camera/i })).toBeVisible();
  });

  cameraTest('permission can be granted', async ({ cameraPage, context }) => {
    await context.grantPermissions(['camera']);
    await cameraPage.getByRole('button', { name: /start camera/i }).click();
    // Test passes if no permission error occurs
  });

  cameraTest('video element renders', async ({ cameraPage, context }) => {
    await context.grantPermissions(['camera']);
    await cameraPage.getByRole('button', { name: /start camera/i }).click();
    
    // Wait for loading to complete
    await cameraPage.waitForFunction(() => {
      const button = document.querySelector('button');
      return button && button.textContent !== 'Requesting camera permission...';
    });
    
    await expect(cameraPage.locator('video')).toBeVisible({ timeout: 10000 });
  });

  cameraTest('error state handled', async ({ cameraPage }) => {
    // Test that the component can handle camera access gracefully
    // This test just verifies no crashes occur during camera interaction
    await cameraPage.getByRole('button', { name: /start camera/i }).click();
    await cameraPage.waitForTimeout(1000);
    
    // Verify the page is still responsive after camera interaction
    await expect(cameraPage.getByText('BlinkTrack')).toBeVisible();
  });

  cameraTest('page does not crash', async ({ cameraPage }) => {
    const consoleErrors: string[] = [];
    cameraPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await cameraPage.getByRole('button', { name: /start camera/i }).click();
    await cameraPage.waitForTimeout(1000);
    
    expect(consoleErrors).toHaveLength(0);
  });
});