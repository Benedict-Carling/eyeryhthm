import { test, expect } from '@playwright/test';

test.describe('EyeRhythm App', () => {
  test('should load the main page successfully', async ({ page }) => {
    await page.goto('/');

    // Check that the app loads with the EyeRhythm branding in the navbar
    await expect(page.getByRole('link', { name: 'EyeRhythm' })).toBeVisible();

    // Check that navigation links are present
    await expect(page.getByRole('link', { name: 'Sessions' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Calibration' })).toBeVisible();
  });
});