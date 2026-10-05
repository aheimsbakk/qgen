import test from 'node:test';
import assert from 'node:assert/strict';

import { startStaticServer } from '../helpers/static-server.js';
import { openMatrix, closeMatrix } from '../helpers/browser-matrix.js';

/**
 * Close paths that Escape does not cover: a click on the About dialog backdrop,
 * and a click anywhere outside the open menu.
 */

const SCENARIOS = [
  {
    name: 'the about dialog closes on a backdrop click',
    async run(page) {
      await page.click('#menuButton');
      await page.click('#aboutMenuItem');
      assert.equal(await page.isVisible('#aboutDialog'), true);

      // The panel sits in the middle of the backdrop, so the click has to land
      // away from the centre to hit the backdrop itself.
      await page.click('#aboutBackdrop', { position: { x: 6, y: 6 } });

      assert.equal(await page.isVisible('#aboutDialog'), false);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'menuButton');
    }
  },
  {
    name: 'the menu closes on a click outside it',
    async run(page) {
      await page.click('#menuButton');
      assert.equal(await page.isVisible('#menuDropdown'), true);
      assert.equal(await page.getAttribute('#menuButton', 'aria-expanded'), 'true');

      // The settings heading is visible in both panels on every viewport, so
      // the click always lands on something that is not the dropdown.
      await page.click('#settingsHeading');

      assert.equal(await page.isVisible('#menuDropdown'), false);
      assert.equal(await page.getAttribute('#menuButton', 'aria-expanded'), 'false');
    }
  }
];

test('dialog and menu close on outside clicks', async (suite) => {
  const server = await startStaticServer();
  const sessions = await openMatrix();

  suite.after(async () => {
    await closeMatrix(sessions);
    await server.close();
  });

  for (const scenario of SCENARIOS) {
    for (const session of sessions) {
      await suite.test(`${scenario.name} — ${session.name}`, async () => {
        const page = await session.context.newPage();
        const problems = [];
        page.on('pageerror', (error) => problems.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') problems.push(message.text());
        });

        await page.goto(server.url, { waitUntil: 'load' });
        await page.waitForFunction(() => {
          const info = document.getElementById('symbolInfo');
          return Boolean(info && info.textContent.includes('Version'));
        }, { timeout: 10000 });

        try {
          await scenario.run(page, session);
          assert.deepEqual(problems, [], `script errors in ${session.name}`);
        } finally {
          await page.close();
        }
      });
    }
  }
});
