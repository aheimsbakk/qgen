import test from 'node:test';
import assert from 'node:assert/strict';

import { firefox, webkit } from 'playwright';

import { startStaticServer } from '../helpers/static-server.js';

/**
 * Responsive breakpoint guard.
 *
 * BLUEPRINT.md section 11 fixes the switch at 768 px: one pane below it, both
 * panes at it and above. The value drifted to 720 px once before, so both
 * sides of the boundary are checked here rather than trusting the stylesheet.
 */

const WIDTHS = [
  { width: 767, expectSinglePane: true },
  { width: 768, expectSinglePane: false }
];

const ENGINES = { firefox, webkit };

test('layout switches panes at 768 px', async (suite) => {
  const server = await startStaticServer();
  const browsers = new Map();
  for (const [engineName, engine] of Object.entries(ENGINES)) {
    browsers.set(engineName, await engine.launch());
  }

  suite.after(async () => {
    for (const browser of browsers.values()) {
      await browser.close();
    }
    await server.close();
  });

  for (const [engineName, browser] of browsers) {

    for (const { width, expectSinglePane } of WIDTHS) {
      await suite.test(`${engineName} at ${width} px`, async () => {
        const context = await browser.newContext({ viewport: { width, height: 800 } });
        const page = await context.newPage();
        const problems = [];
        page.on('pageerror', (error) => problems.push(error.message));

        try {
          await page.goto(server.url, { waitUntil: 'load' });
          await page.waitForFunction(
            () => document.getElementById('symbolInfo').textContent.includes('Version'),
            { timeout: 10000 }
          );

          const tabStripVisible = await page.isVisible('.tab-strip');
          const settingsVisible = await page.isVisible('#settings-panel');
          const previewVisible = await page.isVisible('.panel-preview');

          assert.equal(
            tabStripVisible,
            expectSinglePane,
            `the tab strip must show only below 768 px (${engineName} at ${width} px)`
          );
          assert.equal(
            previewVisible,
            !expectSinglePane,
            `the preview pane must show only at 768 px and above (${engineName} at ${width} px)`
          );
          assert.equal(settingsVisible, true, `the settings pane must show at ${width} px`);
          assert.deepEqual(problems, [], `script errors in ${engineName} at ${width} px`);
        } finally {
          await context.close();
        }
      });
    }
  }
});
