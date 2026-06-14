import { test, expect } from '@playwright/test';

test('sound-effects setting persists across reload', async ({ page }) => {
  await page.goto('/menu');

  // Open settings and read the current state of the Sound Effects toggle.
  await page.getByRole('button', { name: 'Settings' }).click();
  const sound = page.getByRole('checkbox', { name: 'Sound Effects' });
  await expect(sound).toBeChecked(); // default on

  // Turn it off (the real checkbox is sr-only; click its wrapping label).
  await sound.locator('xpath=ancestor::label').click();
  await expect(sound).not.toBeChecked();

  // Reload and confirm it stayed off (persisted to localStorage).
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('checkbox', { name: 'Sound Effects' })).not.toBeChecked();
});

test('appearance modal switches a tileset and it persists', async ({ page }) => {
  await page.addInitScript(() => {
    window.__tileloop = { seed: 12345 };
  });
  await page.goto('/menu');
  await page.getByTestId('mode-precision').click(); // in-game header has the appearance button

  await page.getByRole('button', { name: 'Appearance' }).click();
  await expect(page.getByTestId('appearance-modal')).toBeVisible();

  const tech = page.getByTestId('tileset-square-tech');
  await tech.click();
  await expect(tech).toHaveClass(/bg-slate-600/);

  // Reload and confirm the tech tileset is still selected.
  await page.reload();
  await page.getByRole('button', { name: 'Appearance' }).click();
  await expect(page.getByTestId('tileset-square-tech')).toHaveClass(/bg-slate-600/);
});
