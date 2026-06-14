import { test, expect } from '@playwright/test';

test.describe('level editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__tileloop = { seed: 12345 };
    });
  });

  test('loads with the renderer and connection points', async ({ page }) => {
    await page.goto('/editor/level');
    await expect(page.getByTestId('level-renderer')).toBeVisible();
    expect(await page.getByTestId('connection-point').count()).toBeGreaterThan(0);
  });

  test('toggles between edit and test mode', async ({ page }) => {
    await page.goto('/editor/level');
    const toggle = page.getByTestId('test-level');
    await expect(toggle).toHaveText('Test Level');
    await toggle.click();
    await expect(toggle).toHaveText('Edit Mode');
  });
});

test.describe('tile editor', () => {
  test('draws a line element on the canvas', async ({ page }) => {
    await page.goto('/editor/tile');
    const canvas = page.getByTestId('tile-canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    if (!box) throw new Error('no canvas box');

    await page.mouse.move(box.x + 160, box.y + 160);
    await page.mouse.down();
    await page.mouse.move(box.x + 440, box.y + 440);
    await page.mouse.up();

    // A committed line is drawn in slate (#1e293b).
    await expect(canvas.locator('line[stroke="#1e293b"]')).toHaveCount(1);
  });

  test('switches shapes', async ({ page }) => {
    await page.goto('/editor/tile');
    await page.getByTestId('shape-6').click();
    // border-polygon for a hexagon has 6 points.
    const points = await page.locator('#border-polygon').getAttribute('points');
    expect(points!.trim().split(' ')).toHaveLength(6);
  });

  test('exports an SVG', async ({ page }) => {
    await page.goto('/editor/tile');
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-svg').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('tileset');
  });
});
