import { test, expect } from '@playwright/test';
test('practice preferences survive reload and malformed storage recovers', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '60s', exact: true }).click();
  await page.getByRole('button', { name: 'hard', exact: true }).click();
  await page.getByRole('button', { name: /punctuation/ }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: '60s', exact: true }),
  ).toHaveClass(/selected/);
  await expect(
    page.getByRole('button', { name: 'hard', exact: true }),
  ).toHaveClass(/selected/);
  await expect(
    page.getByRole('button', { name: /punctuation/ }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => localStorage.setItem('typespeed.practice', '{bad'));
  await page.reload();
  await expect(
    page.getByRole('button', { name: '30s', exact: true }),
  ).toHaveClass(/selected/);
});
test('native text input inserts once, corrects with backspace, and rejects paste', async ({
  page,
}) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Mobile typing input' });
  await page.getByRole('textbox', { name: 'Typing passage' }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveCSS('opacity', '0');
  await expect(
    page.locator('.typing-area .correct, .typing-area .incorrect'),
  ).toHaveCount(0);
  await page.keyboard.type('abc');
  await expect(
    page.locator('.typing-area .correct, .typing-area .incorrect'),
  ).toHaveCount(3);
  await page.keyboard.press('Backspace');
  await expect(
    page.locator('.typing-area .correct, .typing-area .incorrect'),
  ).toHaveCount(2);
  await input.evaluate((el) => {
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'insertFromPaste',
        data: 'pasted',
      }),
    );
  });
  await expect(
    page.locator('.typing-area .correct, .typing-area .incorrect'),
  ).toHaveCount(2);
});
