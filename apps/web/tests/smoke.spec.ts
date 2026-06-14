import { test, expect } from '@playwright/test';

test('splash screen renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('splash')).toBeVisible();
  await expect(page.getByText('LOOP')).toBeVisible();
});

test('menu shows all game modes', async ({ page }) => {
  await page.goto('/menu');
  await expect(page.getByTestId('mode-campaign')).toBeVisible();
  await expect(page.getByTestId('mode-timeattack')).toBeVisible();
  await expect(page.getByTestId('mode-precision')).toBeVisible();
  await expect(page.getByTestId('mode-zen')).toBeVisible();
  await expect(page.getByText('Connect the loops')).toBeVisible();
});

test('campaign screen shows a level grid and the first level is unlocked', async ({ page }) => {
  await page.goto('/menu');
  await page.getByTestId('mode-campaign').click();
  await expect(page).toHaveURL(/\/campaign$/);
  await expect(page.getByTestId('level-grid')).toBeVisible();

  // Level 1 is unlocked and starts a game.
  await page.getByTestId('level-1').click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByTestId('level-renderer')).toBeVisible();
});
