import test from 'node:test';
import assert from 'node:assert/strict';

import { StateStore } from '../../src/js/core/state-store.js';
import { RenderPipeline, errorLevelFor } from '../../src/js/core/render-pipeline.js';

function harness() {
  const store = new StateStore();
  const paints = [];
  const results = [];
  const pipeline = new RenderPipeline({
    store,
    paint: (symbol, style) => paints.push({ symbol, style }),
    onResult: (result) => results.push(result)
  });
  // Same wiring the application uses: every state write schedules a render.
  store.subscribe(() => pipeline.scheduleRender());
  return { store, pipeline, paints, results };
}

function waitFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('a valid payload renders and is remembered for export', () => {
  const { store, pipeline, paints, results } = harness();
  const result = pipeline.renderNow();

  assert.equal(result.status, 'ready');
  assert.equal(paints.length, 1);
  assert.equal(store.getState().export.last_valid_payload, 'https://sanntid.org');
  assert.equal(results.length, 1);
});

test('an empty required field asks for the fields rather than reporting a fault', () => {
  const { store, pipeline, paints } = harness();
  store.setField('url', '');

  const result = pipeline.renderNow();
  assert.equal(result.status, 'empty');
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].fieldKey, 'url');
  assert.equal(paints.length, 0);
});

test('a partly filled form reports invalid and names the field', () => {
  const { store, pipeline } = harness();
  store.setSchemaType('geo');
  store.setField('lat', '95');

  const result = pipeline.renderNow();
  assert.equal(result.status, 'invalid');
  assert.deepEqual(result.errors.map((error) => error.fieldKey), ['lat']);
});

test('a broken edit keeps the last valid payload available for export', () => {
  const { store, pipeline } = harness();
  pipeline.renderNow();

  store.setField('url', '');
  const result = pipeline.renderNow();

  assert.equal(result.status, 'empty');
  assert.equal(store.getState().export.last_valid_payload, 'https://sanntid.org');
});

test('content that cannot fit reports a plain-language fault', () => {
  const { store, pipeline, paints } = harness();
  // Level M byte mode holds 2331 characters, so this payload cannot fit.
  store.setField('url', `https://example.com/${'x'.repeat(2400)}`);

  const result = pipeline.renderNow();
  assert.equal(result.status, 'error');
  assert.match(result.message, /Shorten the content or lower the level/);
  assert.equal(paints.length, 0);
});

test('an overlay raises the error correction level to H', () => {
  const plain = errorLevelFor({ overlay: { kind: 'none', content: null } });
  const withOverlay = errorLevelFor({ overlay: { kind: 'emoji', content: '+' } });
  const overlayWithoutContent = errorLevelFor({ overlay: { kind: 'emoji', content: null } });

  assert.equal(plain, 'M');
  assert.equal(withOverlay, 'H');
  assert.equal(overlayWithoutContent, 'M');
});

test('rapid changes produce one render, not one per keystroke', async () => {
  const { store, pipeline, paints } = harness();

  store.setField('url', 'https://example.com/one');
  store.setField('url', 'https://example.com/two');
  store.setField('url', 'https://example.com/three');
  await waitFor(260);

  assert.equal(paints.length, 1);
  assert.equal(store.getState().export.last_valid_payload, 'https://example.com/three');
});

test('export re-encodes the remembered payload at the requested size', () => {
  const { store, pipeline } = harness();
  pipeline.renderNow();

  let paintedSize = null;
  const symbol = pipeline.buildExport(1024, (rendered, style, pixelSize) => {
    paintedSize = pixelSize;
    assert.equal(style, store.getState().style);
    return rendered;
  });

  assert.equal(paintedSize, 1024);
  assert.equal(symbol.level, 'M');
});

test('export before the first valid render returns nothing', () => {
  const { store, pipeline } = harness();
  store.setField('url', '');
  assert.equal(pipeline.buildExport(1024, () => {}), null);
});
