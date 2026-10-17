import { expect, test } from '@playwright/test';
test('desktop and mobile layouts stay within the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Find your flow.' }),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/practice-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/multiplayer', '/analytics', '/settings']) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto('/');
  await page.screenshot({
    path: 'test-results/practice-mobile.png',
    fullPage: true,
  });
});
test('typing scroll follows the cursor through a long passage', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '120s', exact: true }).click();
  const area = page.getByRole('textbox', { name: 'Typing passage' });
  const text = await area.innerText();
  await area.focus();
  await page.keyboard.type(text.slice(0, 400));
  await expect
    .poll(() =>
      area.evaluate((element) => {
        const cursor = element
          .querySelector('.cursor')!
          .getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        return cursor.top >= bounds.top && cursor.bottom <= bounds.bottom;
      }),
    )
    .toBe(true);
  await expect(area.locator('.correct')).toHaveCount(400);
});
test('solo practice completes and persists its result', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '15s', exact: true }).click();
  await page.getByRole('textbox', { name: 'Typing passage' }).focus();
  await page.keyboard.type('the quick brown fox');
  await expect(
    page.getByText('PRACTICE COMPLETE', { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await page.getByRole('link', { name: 'My progress' }).click();
  await expect(page.getByRole('cell', { name: '15s' })).toBeVisible();
});
test('host approves a guest, runs a synchronized 60 second race and rematches', async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  await host.goto('/multiplayer');
  await host.getByLabel('Your display name').first().fill('Ankit');
  await host.getByRole('button', { name: 'Create room', exact: true }).click();
  await expect(host.locator('.room-code')).toBeVisible();
  const code = await host.locator('.room-code').innerText();
  await guest.goto(`/room/${code}`);
  await guest.getByLabel('Your display name').last().fill('Rahul');
  await guest.getByRole('button', { name: 'Request to join' }).click();
  await expect(
    guest.getByRole('heading', { name: 'Waiting for the host' }),
  ).toBeVisible();
  await expect(guest.locator('.room-code')).toHaveCount(0);
  await host.getByRole('button', { name: 'Approve Rahul' }).click();
  await expect(guest.locator('.room-code')).toHaveText(code);
  await host
    .getByRole('button', { name: 'Ready to race', exact: true })
    .click();
  await guest
    .getByRole('button', { name: 'Ready to race', exact: true })
    .click();
  await host.getByRole('button', { name: 'Start race' }).click();
  await expect(host.getByText(/Starting in/)).toBeVisible();
  await expect(guest.getByText(/Starting in/)).toBeVisible();
  const hostText = host.getByRole('textbox', { name: 'Typing passage' });
  const guestText = guest.getByRole('textbox', { name: 'Typing passage' });
  const passage = await hostText.innerText();
  expect(await guestText.innerText()).toBe(passage);
  await expect(hostText).toHaveAttribute('aria-disabled', 'false');
  await hostText.focus();
  await host.keyboard.type(passage.slice(0, 35), { delay: 80 });
  await guestText.focus();
  await guest.keyboard.type('xxxxxxxxxxxx', { delay: 80 });
  await expect(host.getByRole('heading', { name: 'Ankit wins!' })).toBeVisible({
    timeout: 70_000,
  });
  await expect(
    guest.getByRole('heading', { name: 'Ankit wins!' }),
  ).toBeVisible();
  await host.getByRole('button', { name: 'Rematch / return to lobby' }).click();
  await expect(
    guest.getByRole('button', { name: 'Ready to race', exact: true }),
  ).toBeVisible();
  await guest.reload();
  await expect(guest.locator('.room-code')).toHaveText(code);
  await hostContext.close();
  await guestContext.close();
});
test('rejected guest remains outside the room', async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const host = await a.newPage();
  const guest = await b.newPage();
  await host.goto('/multiplayer');
  await host.getByLabel('Your display name').first().fill('Host');
  await host.getByRole('button', { name: 'Create room', exact: true }).click();
  await expect(host.locator('.room-code')).toBeVisible();
  await guest.goto(`/room/${await host.locator('.room-code').innerText()}`);
  await guest.getByLabel('Your display name').last().fill('Guest');
  await guest.getByRole('button', { name: 'Request to join' }).click();
  await host.getByRole('button', { name: 'Reject Guest' }).click();
  await expect(
    guest.getByText('The room host declined your request.'),
  ).toBeVisible();
  await expect(guest.locator('.room-code')).toHaveCount(0);
  await a.close();
  await b.close();
});
