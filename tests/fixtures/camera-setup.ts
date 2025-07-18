import { test as base, Page } from '@playwright/test';

export const cameraTest = base.extend<{ cameraPage: Page }>({
  cameraPage: async ({ page, context }, use) => {
    await page.goto('/');
    await use(page);
  },
});