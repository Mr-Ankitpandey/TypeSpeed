import { test, expect } from '@playwright/test';
test('production solo app works offline after installation', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.goto('/games');
  await expect(
    page.getByRole('heading', { name: 'The typing arcade.' }),
  ).toBeVisible();
  await page.goto('/play?mode=custom');
  await page.getByLabel('Your practice text').fill('offline');
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Typing passage' }).focus();
  await page.keyboard.type('offline');
  await expect(
    page.getByText('CHALLENGE COMPLETE · LOCAL RESULT'),
  ).toBeVisible();
  await page.goto('/replays');
  await expect(page.getByLabel('Recording')).toBeVisible();
  await context.setOffline(false);
});
