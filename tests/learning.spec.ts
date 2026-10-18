import { test, expect } from '@playwright/test';
test('custom session records corrections, replay, ghost and backup import', async ({
  page,
}) => {
  await page.goto('/play?mode=custom');
  await page.getByLabel('Your practice text').fill('cat');
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .click();
  const area = page.getByRole('textbox', { name: 'Typing passage' });
  await area.focus();
  await page.keyboard.type('x');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('cat');
  await expect(page.getByText('SESSION COMPLETE · LOCAL RESULT')).toBeVisible();
  await expect(page.getByText('75.0%', { exact: true })).toBeVisible();
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('typespeed.recordings')!),
  );
  expect(records[0].events).toHaveLength(5);
  await page.getByRole('link', { name: 'Inspect replay' }).click();
  await page.getByLabel('Replay position').focus();
  await page.keyboard.press('End');
  await expect(page.locator('.typing-area .correct')).toHaveCount(3);
  await page.goto('/play?mode=ghost');
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .click();
  await expect(page.locator('.ghost-lane')).toBeVisible();
  await page.goto('/insights');
  await expect(page.getByText('✓ First steps')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('typespeed-progress.json');
  const backupPath = await download.path();
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: 'Delete recordings', exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('typespeed.recordings')!),
    ),
  ).toHaveLength(0);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Import backup').setInputFiles(backupPath!);
  await expect(page.getByRole('status')).toHaveText('Backup imported.');
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('typespeed.recordings')!),
    ),
  ).toHaveLength(1);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Import backup').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await expect(page.getByRole('status')).toContainText('Import failed');
});
test('multiline code supports Enter and accented input records once', async ({
  page,
}) => {
  await page.goto('/play?mode=code');
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .click();
  const area = page.getByRole('textbox', { name: 'Typing passage' });
  await area.focus();
  await page.keyboard.type('function total(values) {');
  await page.keyboard.press('Enter');
  await page.keyboard.type('  ');
  await expect(area.locator('.incorrect')).toHaveCount(0);
  await expect(area.locator('.correct')).toHaveCount(27);
  await page.goto('/play?mode=custom');
  await page.getByLabel('Your practice text').fill('café');
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Typing passage' }).focus();
  await page.keyboard.type('caf');
  await page.keyboard.insertText('é');
  // The passage now routes physical and native input through one capture field.
  await expect(
    page.getByText('CHALLENGE COMPLETE · LOCAL RESULT'),
  ).toBeVisible();
});
test('daily challenge completes on schedule and keeps first and best attempts', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/play?mode=dailySprint');
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .click();
  const area = page.getByRole('textbox', { name: 'Typing passage' });
  const text = await area.innerText();
  await area.focus();
  await page.keyboard.type(text.slice(0, 30));
  await page.clock.fastForward(31000);
  await expect(
    page.getByText('CHALLENGE COMPLETE · LOCAL RESULT'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Change setup' }).click();
  await expect(page.getByText(/1 saved attempts today/)).toBeVisible();
});
test('perfect challenge rejects a mistake and Wordfall requires corrections', async ({
  page,
}) => {
  await page.goto('/play?mode=perfect25');
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Typing passage' }).focus();
  await page.keyboard.type('~');
  await expect(page.getByText('TRY AGAIN · LOCAL RESULT')).toBeVisible();
  await page.goto('/play?mode=wordfall');
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .click();
  const target = await page.locator('.game-target').innerText();
  await page.getByRole('textbox', { name: 'Typing passage' }).focus();
  await page.keyboard.type('~'.repeat(target.length) + ' ');
  await expect(page.locator('.game-target')).toHaveText(target);
  for (let i = 0; i <= target.length; i++)
    await page.keyboard.press('Backspace');
  await page.keyboard.type(target + ' ');
  await expect(page.getByText('1 words', { exact: true })).toBeVisible();
});
test('survival game ends at the word deadline', async ({ page }) => {
  await page.clock.install();
  await page.goto('/play?mode=wordfall');
  await page.getByLabel('Game mode').selectOption('survival');
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Typing passage' }).focus();
  await page.keyboard.type('~');
  await page.clock.fastForward(90000);
  await expect(page.getByText('TRY AGAIN · LOCAL RESULT')).toBeVisible();
});
test('composition commits a normalized accent once', async ({ page }) => {
  await page.goto('/play?mode=custom');
  await page.getByLabel('Your practice text').fill('éé');
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .click();
  const input = page.getByRole('textbox', { name: 'Mobile typing input' });
  await input.focus();
  await input.evaluate((el) => {
    el.dispatchEvent(
      new CompositionEvent('compositionend', {
        bubbles: true,
        data: 'e\u0301',
      }),
    );
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: 'e\u0301',
      }),
    );
  });
  await expect(page.locator('.typing-area .correct')).toHaveCount(1);
  await page.keyboard.insertText('é');
  await expect(
    page.getByText('CHALLENGE COMPLETE · LOCAL RESULT'),
  ).toBeVisible();
});
test('all arcade modes and studio layouts fit mobile and desktop', async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const route of ['/challenges', '/games', '/insights', '/replays']) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.goto('/games');
  await page.screenshot({
    path: 'test-results/arcade-desktop.png',
    fullPage: true,
  });
  for (const mode of [
    'wordfall',
    'tower',
    'defender',
    'rally',
    'rhythm',
    'story',
    'beginner',
    'spanish',
    'french',
    'german',
    'code',
    'plan',
    'clean100',
    'consistency',
    'ladder',
  ]) {
    await page.goto(`/play?mode=${mode}`);
    await page
      .getByRole('button', { name: 'Start session', exact: true })
      .click();
    await expect(
      page.getByRole('textbox', { name: 'Typing passage' }),
    ).toBeVisible();
  }
  await page.goto('/play?mode=friend#broken');
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('invalid');
  await page.goto('/play?mode=wordfall');
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .click();
  await page.screenshot({
    path: 'test-results/wordfall-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/wordfall-mobile.png',
    fullPage: true,
  });
});
