/**
 * Browser matrix for the end-to-end suite.
 *
 * The product supports Firefox and WebKit on desktop and phone viewports.
 * Chromium is deliberately absent.
 */

import { firefox, webkit } from 'playwright';

const DESKTOP = { viewport: { width: 1280, height: 900 }, phone: false };
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, phone: true };

export const BROWSER_MATRIX = [
  { name: 'firefox-desktop', engine: 'firefox', options: DESKTOP },
  { name: 'firefox-phone', engine: 'firefox', options: PHONE },
  { name: 'webkit-desktop', engine: 'webkit', options: DESKTOP },
  { name: 'webkit-mobile', engine: 'webkit', options: PHONE }
];

const ENGINES = { firefox, webkit };

/**
 * Launch one browser per engine and one context per matrix entry.
 * Set QGEN_MATRIX to a comma-separated list of entry names to narrow a run.
 * @returns {Promise<Array<{name: string, phone: boolean, browser: import('playwright').Browser, context: import('playwright').BrowserContext}>>}
 */
export async function openMatrix() {
  const requested = (process.env.QGEN_MATRIX ?? '').split(',').map((name) => name.trim()).filter(Boolean);
  const entries = requested.length > 0
    ? BROWSER_MATRIX.filter((entry) => requested.includes(entry.name))
    : BROWSER_MATRIX;

  if (entries.length === 0) {
    throw new Error(`No browser matrix entries match QGEN_MATRIX="${process.env.QGEN_MATRIX}"`);
  }

  const browsers = new Map();
  for (const entry of entries) {
    if (!browsers.has(entry.engine)) {
      browsers.set(entry.engine, await ENGINES[entry.engine].launch());
    }
  }

  const sessions = [];
  for (const entry of entries) {
    const browser = browsers.get(entry.engine);
    const context = await browser.newContext({
      viewport: entry.options.viewport,
      isMobile: entry.options.isMobile ?? false,
      hasTouch: entry.options.hasTouch ?? false
    });
    sessions.push({ name: entry.name, phone: entry.options.phone, browser, context });
  }

  return sessions;
}

/** Close every context and browser opened by `openMatrix`. */
export async function closeMatrix(sessions) {
  const closed = new Set();
  for (const session of sessions) {
    await session.context.close();
    if (!closed.has(session.browser)) {
      closed.add(session.browser);
      await session.browser.close();
    }
  }
}
