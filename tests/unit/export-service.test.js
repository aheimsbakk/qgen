import test from 'node:test';
import assert from 'node:assert/strict';

import { StateStore } from '../../src/js/core/state-store.js';
import { RenderPipeline } from '../../src/js/core/render-pipeline.js';
import { ExportService } from '../../src/js/core/export-service.js';

/**
 * Export service wired to a real store and pipeline, with a canvas stand-in.
 * The stand-in answers `toBlob` so the service can run outside a browser.
 */
function harness() {
  const store = new StateStore();
  const pipeline = new RenderPipeline({ store, paint: () => {}, onResult: () => {} });
  const canvas = {
    toBlob(callback, type) {
      assert.equal(type, 'image/png');
      callback({ kind: 'png-blob' });
    }
  };
  const service = new ExportService({
    store,
    pipeline,
    renderToCanvas: () => canvas
  });
  return { store, pipeline, service };
}

/** Clipboard stand-in that records what the service hands it. */
function installClipboard(writes) {
  class FakeClipboardItem {
    constructor(items) {
      this.items = new Map(Object.entries(items));
    }
  }

  globalThis.ClipboardItem = FakeClipboardItem;
  navigator.clipboard = {
    write: async (items) => {
      writes.push(items);
    }
  };

  return () => {
    delete navigator.clipboard;
    delete globalThis.ClipboardItem;
  };
}

test('export before a valid render explains that there is nothing to export', async () => {
  const { store, service } = harness();
  store.setField('url', '');

  const outcome = await service.copy();
  assert.equal(outcome.ok, false);
  assert.match(outcome.message, /no valid QR code to export yet/);
});

test('copy without a clipboard API points at the file export instead of failing', async () => {
  const { pipeline, service } = harness();
  pipeline.renderNow();

  const outcome = await service.copy();
  assert.equal(outcome.ok, false);
  assert.match(outcome.message, /does not allow copying images/);
  assert.match(outcome.message, /Save PNG/);
});

test('copy hands a PNG item to the clipboard API', async () => {
  const { pipeline, service } = harness();
  pipeline.renderNow();
  const writes = [];
  const restore = installClipboard(writes);

  try {
    const outcome = await service.copy();
    assert.equal(outcome.ok, true);
    assert.equal(writes.length, 1);
    const item = writes[0][0];
    assert.deepEqual([...item.items.keys()], ['image/png']);
  } finally {
    restore();
  }
});

test('a clipboard that throws is reported as a copy failure with a fallback', async () => {
  const { pipeline, service } = harness();
  pipeline.renderNow();
  const restore = installClipboard([]);
  navigator.clipboard = {
    write: async () => {
      throw new Error('permission denied');
    }
  };

  try {
    const outcome = await service.copy();
    assert.equal(outcome.ok, false);
    assert.match(outcome.message, /Copy failed/);
    assert.match(outcome.message, /Use Save PNG instead/);
  } finally {
    restore();
  }
});
