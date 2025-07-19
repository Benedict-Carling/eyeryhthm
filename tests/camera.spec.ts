import { test, expect } from '@playwright/test';

test.describe('BlinkTrack App', () => {
  test('should load the main page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the app loads with the correct title
    await expect(page.getByRole('heading', { name: 'BlinkTrack' })).toBeVisible();
    
    // Check that navigation tabs are present using getByRole
    await expect(page.getByRole('tab', { name: 'Blink Detection' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Calibration' })).toBeVisible();
  });
});