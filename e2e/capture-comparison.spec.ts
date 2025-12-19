import { test } from '@playwright/test';
import { enterApp } from './test-utils';

test('capture canvas comparison', async ({ page }) => {
  await enterApp(page);

  // Wait for canvas to render
  await page.waitForTimeout(1000);

  // Screenshot the main canvas
  await page.screenshot({ path: '/tmp/main-canvas-view.png', fullPage: false });
  console.log('Captured main canvas');
});
