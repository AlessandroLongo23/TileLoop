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

test('campaign button navigates to the campaign screen', async ({ page }) => {
  await page.goto('/menu');
  await page.getByTestId('mode-campaign').click();
  await expect(page).toHaveURL(/\/campaign$/);
  await expect(page.getByTestId('campaign-heading')).toBeVisible();
});
