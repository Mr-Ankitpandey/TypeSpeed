import { test, expect } from '@playwright/test';
test('public pages have distinct metadata and private routes opt out', async ({
  page,
}) => {
  await page.goto('/learn/typing-speed');
  await expect(page).toHaveTitle(
    'How to Calculate Typing WPM and Raw WPM | TypeSpeed',
  );
  await expect(
    page.getByRole('heading', { name: 'How typing speed is measured' }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'index,follow',
  );
  await page.getByRole('link', { name: 'My progress', exact: true }).click();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex,nofollow',
  );
  await page.goto('/not-a-page');
  await expect(
    page.getByRole('heading', { name: 'That page isn’t here.' }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex,nofollow',
  );
});
