import { test, expect } from '@playwright/test';
test('relay and boss rooms finish with server-controlled team outcomes', async ({
  browser,
}) => {
  test.setTimeout(160000);
  for (const mode of ['relay', 'boss']) {
    const hc = await browser.newContext();
    const gc = await browser.newContext();
    const host = await hc.newPage();
    const guest = await gc.newPage();
    await host.goto('/multiplayer');
    await host.getByLabel('Your display name').first().fill('Host');
    await host.getByLabel('Room game').selectOption(mode);
    await host.getByLabel('Race duration').selectOption('30');
    await host
      .getByRole('button', { name: 'Create room', exact: true })
      .click();
    const code = await host.locator('.room-code').innerText();
    await guest.goto(`/room/${code}`);
    await guest.getByLabel('Your display name').last().fill('Guest');
    await guest
      .getByRole('button', { name: 'Request to join', exact: true })
      .click();
    await host.getByRole('button', { name: 'Approve Guest' }).click();
    await host
      .getByRole('button', { name: 'Ready to race', exact: true })
      .click();
    await guest
      .getByRole('button', { name: 'Ready to race', exact: true })
      .click();
    await host.getByRole('button', { name: 'Start race', exact: true }).click();
    const ha = host.getByRole('textbox', { name: 'Typing passage' });
    const ga = guest.getByRole('textbox', { name: 'Typing passage' });
    await expect(ha).toHaveAttribute('aria-disabled', 'false', {
      timeout: 10000,
    });
    if (mode === 'relay')
      await expect(ga).toHaveAttribute('aria-disabled', 'true');
    const hp = await ha.innerText();
    await ha.focus();
    await host.keyboard.type(mode === 'relay' ? hp : hp.slice(0, 32), {
      delay: 55,
    });
    await expect(ga).toHaveAttribute('aria-disabled', 'false', {
      timeout: 10000,
    });
    const gp = await ga.innerText();
    await ga.focus();
    await guest.keyboard.type(mode === 'relay' ? gp : gp.slice(0, 32), {
      delay: 55,
    });
    await expect(host.getByText(/Team goal reached!/)).toBeVisible();
    await expect(
      host.getByRole('heading', { name: 'Team goal achieved!' }),
    ).toBeVisible({ timeout: 40000 });
    await expect(
      guest.getByRole('heading', { name: 'Team goal achieved!' }),
    ).toBeVisible();
    await hc.close();
    await gc.close();
  }
});
