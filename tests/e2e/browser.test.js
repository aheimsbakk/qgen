import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { startStaticServer } from '../helpers/static-server.js';
import { openMatrix, closeMatrix } from '../helpers/browser-matrix.js';
import { decodePngBase64 } from '../helpers/decoder.js';

/** Open the page in one browser and record any script errors. */
async function openPage(server, session) {
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

  return { page, problems };
}

/** Base64 PNG of the live preview canvas. */
async function previewPng(page) {
  return page.evaluate(() => document.getElementById('qrCanvas').toDataURL('image/png').split(',')[1]);
}

/** Phone viewports show one panel at a time; move to the preview panel. */
async function showPreview(session, page) {
  if (!session.phone) return;

  await page.click('#tabPreviewButton');
  assert.equal(
    await page.getAttribute('#mainLayout', 'data-view'),
    'preview',
    `${session.name} must switch to the preview panel when the preview tab is clicked`
  );
}

/** Wait for the preview panel state itself, not the surrounding layout. */
async function waitForPreviewState(page, hidden) {
  await page.waitForFunction(
    (wantHidden) => document.getElementById('canvasContainer').hidden === wantHidden,
    hidden,
    { timeout: 10000 }
  );
}

async function decodedPreview(page, name) {
  return decodePngBase64(await previewPng(page), name);
}

const SCENARIOS = [
  {
    name: 'starts with a scannable code',
    async run(page, session) {
      await waitForPreviewState(page, false);
      assert.match(await page.textContent('#symbolInfo'), /Version \d+/);

      const result = await decodedPreview(page, `browser-${session.name}-default`);
      assert.equal(result.ok, true, result.error);
      assert.equal(result.text, 'https://sanntid.org');
    }
  },
  {
    name: 'switching content type rebuilds the form',
    async run(page, session) {
      await page.selectOption('#schemaTypeSelect', 'wifi');
      await page.waitForSelector('#field-ssid');
      assert.equal(await page.inputValue('#field-ssid'), 'QGen Network');
      await page.waitForTimeout(300);

      const result = await decodedPreview(page, `browser-${session.name}-wifi`);
      assert.equal(result.ok, true, result.error);
      assert.equal(result.text, 'WIFI:T:WPA;S:QGen Network;P:password123;;');
    }
  },
  {
    name: 'typing a new value updates the code',
    async run(page, session) {
      await page.fill('#field-url', 'https://sanntid.org/typed-value');
      await page.waitForTimeout(300);

      const result = await decodedPreview(page, `browser-${session.name}-typed`);
      assert.equal(result.ok, true, result.error);
      assert.equal(result.text, 'https://sanntid.org/typed-value');
    }
  },
  {
    name: 'an empty required field shows the placeholder state',
    async run(page, session) {
      await page.fill('#field-url', '');
      await page.waitForTimeout(300);
      await showPreview(session, page);
      await waitForPreviewState(page, true);

      assert.equal(await page.isVisible('#qrEmptyState'), true);
      assert.equal(await page.isVisible('#canvasContainer'), false);
      assert.equal(
        await page.textContent('#previewStatus'),
        'No QR code yet. Fill in the required fields.'
      );
    }
  },
  {
    name: 'colour changes redraw the code and keep it scannable',
    async run(page, session) {
      const before = await previewPng(page);

      await page.fill('#colorFgInput', '#1b5f9e');
      await page.fill('#colorBgInput', '#f2f6fb');
      await page.waitForTimeout(300);

      assert.notEqual(await previewPng(page), before, 'the drawing did not change');

      const result = await decodedPreview(page, `browser-${session.name}-colours`);
      assert.equal(result.ok, true, `a coloured code must stay scannable: ${result.error}`);
      assert.equal(result.text, 'https://sanntid.org');
    }
  },
  {
    name: 'shape and module size changes redraw the code',
    async run(page) {
      const square = await previewPng(page);

      await page.selectOption('#moduleShapeSelect', 'dots');
      await page.waitForTimeout(300);
      const dots = await previewPng(page);
      assert.notEqual(dots, square, 'dots did not change the drawing');

      await page.selectOption('#moduleShapeSelect', 'v_bars');
      await page.waitForTimeout(300);
      const bars = await previewPng(page);
      assert.notEqual(bars, dots, 'vertical bars did not change the drawing');

      await page.evaluate(() => document.getElementById('dotScaleInput').value = '0.5');
      await page.evaluate(() => document.getElementById('dotScaleInput').dispatchEvent(new Event('input')));
      await page.waitForTimeout(300);
      assert.notEqual(await previewPng(page), bars, 'module size did not change the drawing');

      assert.match(await page.textContent('#symbolInfo'), /Version \d+/);
    }
  },
  {
    name: 'an overlay raises the error level to H',
    async run(page) {
      await page.selectOption('#overlayKindSelect', 'emoji');
      await page.fill('#overlayEmojiInput', '+');
      await page.waitForTimeout(300);

      assert.match(await page.textContent('#symbolInfo'), /Error level H/);
    }
  },
  {
    name: 'the capacity line counts the payload and its limit',
    async run(page) {
      assert.equal(
        await page.textContent('#payloadMeter'),
        'Payload: 19 characters. One QR code at level M holds 2331.'
      );

      await page.fill('#field-url', `https://example.com/${'x'.repeat(2400)}`);
      await page.waitForTimeout(300);

      assert.match(await page.textContent('#payloadMeter'), /^Payload: \d{4,} characters\./);
      assert.equal(await page.getAttribute('#payloadMeter', 'class'), 'payload-meter is-over');
      assert.match(await page.textContent('#qrErrorText'), /holds at most 2331/);
    }
  },
  {
    name: 'the centre size slider moves in one percent steps',
    async run(page) {
      assert.equal(await page.getAttribute('#overlaySizeInput', 'step'), '0.01');

      await page.selectOption('#overlayKindSelect', 'emoji');
      await page.fill('#overlayEmojiInput', '+');
      await page.evaluate(() => {
        const slider = document.getElementById('overlaySizeInput');
        slider.value = '0.21';
        slider.dispatchEvent(new Event('input'));
      });
      await page.waitForTimeout(300);

      // A coarser step makes the browser snap 0.21 back to the nearest notch.
      assert.equal(await page.textContent('#overlaySizeValue'), '21%');
    }
  },
  {
    name: 'the about dialog opens and closes',
    async run(page) {
      await page.click('#menuButton');
      assert.equal(await page.isVisible('#menuDropdown'), true);
      assert.equal(await page.getAttribute('#menuButton', 'aria-expanded'), 'true');

      await page.click('#aboutMenuItem');
      assert.equal(await page.isVisible('#menuDropdown'), false);
      assert.equal(await page.isVisible('#aboutDialog'), true);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'aboutCloseButton');

      await page.keyboard.press('Escape');
      assert.equal(await page.isVisible('#aboutDialog'), false);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'menuButton');
    }
  },
  {
    name: 'export saves a PNG file',
    async run(page, session) {
      // Export controls live in the preview panel, which phone viewports hide
      // until the Preview & Export tab is selected.
      await showPreview(session, page);

      const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
      await page.click('#saveButton');
      const download = await downloadPromise;

      assert.equal(download.suggestedFilename(), 'url-qr.png');
      const bytes = await readFile(await download.path());

      assert.ok(bytes.length > 1000, 'the exported file is too small to be a real image');
      assert.equal(bytes.subarray(1, 4).toString('latin1'), 'PNG');
      assert.equal(bytes.readUInt32BE(16), 1024, 'export must use the selected pixel size');
    }
  },
  {
    name: 'copy writes the PNG to the clipboard',
    async run(page, session) {
      await showPreview(session, page);
      await page.click('#copyButton');

      await page.waitForFunction(
        () => {
          const toast = document.querySelector('.toast');
          return Boolean(toast && toast.textContent.includes('copied to the clipboard'));
        },
        { timeout: 10000 }
      );
    }
  },
  {
    name: 'tabs switch panels on phone viewports',
    phoneOnly: true,
    async run(page) {
      assert.equal(await page.isVisible('#settings-panel'), true);
      assert.equal(await page.isVisible('.panel-preview'), false);

      await page.click('#tabPreviewButton');
      assert.equal(await page.isVisible('#settings-panel'), false);
      assert.equal(await page.isVisible('.panel-preview'), true);

      await page.click('#tabSettingsButton');
      assert.equal(await page.isVisible('#settings-panel'), true);
    }
  }
];

test('browser matrix', async (suite) => {
  const server = await startStaticServer();
  const sessions = await openMatrix();

  suite.after(async () => {
    await closeMatrix(sessions);
    await server.close();
  });

  for (const scenario of SCENARIOS) {
    const applicable = scenario.phoneOnly
      ? sessions.filter((session) => session.phone)
      : sessions;

    for (const session of applicable) {
      await suite.test(`${scenario.name} — ${session.name}`, async () => {
        const { page, problems } = await openPage(server, session);
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
