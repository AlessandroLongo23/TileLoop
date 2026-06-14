import { test, expect } from '@playwright/test';

// Force a deterministic board for every run.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__tileloop = { seed: 12345 };
  });
});

test('a seeded level renders tiles', async ({ page }) => {
  await page.goto('/menu');
  await page.getByTestId('mode-precision').click();
  await expect(page).toHaveURL(/\/play$/);

  await expect(page.getByTestId('level-renderer')).toBeVisible();
  const tiles = page.locator('[data-tile]');
  expect(await tiles.count()).toBeGreaterThan(0);
});

test('clicking a tile increments the move counter', async ({ page }) => {
  await page.goto('/menu');
  await page.getByTestId('mode-precision').click();

  const tile = page.locator('[data-tile]').first();
  await expect(tile).toBeVisible();
  await expect(page.getByTestId('moves')).toHaveText('0');

  const box = await tile.boundingBox();
  if (!box) throw new Error('tile has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(page.getByTestId('moves')).toHaveText('1');
});

test('solving a level shows the win modal', async ({ page }) => {
  await page.goto('/menu');
  await page.getByTestId('mode-precision').click();
  await expect(page.getByTestId('level-renderer')).toBeVisible();
  await expect(page.locator('[data-tile]').first()).toBeVisible();

  await page.evaluate(() => window.__tileloop?.solve?.());

  await expect(page.getByTestId('win-modal')).toBeVisible({ timeout: 6000 });
  await expect(page.getByText('Level Complete')).toBeVisible();
  await expect(page.getByTestId('next-level')).toBeVisible();
});
