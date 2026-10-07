import test from 'node:test';
import assert from 'node:assert/strict';

import { StateStore, ValidationError } from '../../src/js/core/state-store.js';

test('the store starts on the URL type with a valid payload', () => {
  const store = new StateStore();
  const state = store.getState();
  assert.equal(state.schema_type, 'url');
  assert.equal(state.fields.url, 'https://sanntid.org');
  assert.equal(state.style.overlay.kind, 'none');
  assert.equal(state.export.pixel_size, 1024);
});

test('switching content type replaces the fields with that type defaults', () => {
  const store = new StateStore();
  store.setSchemaType('wifi');
  assert.deepEqual(store.getState().fields, {
    ssid: 'QGen Network',
    password: 'password123',
    auth: 'WPA',
    hidden: false
  });
});

test('an unknown content type is refused', () => {
  const store = new StateStore();
  assert.throws(() => store.setSchemaType('barcode'), ValidationError);
});

test('numbers are clamped into their limits', () => {
  const store = new StateStore();

  store.setStyle('dot_scale', 5);
  assert.equal(store.getState().style.dot_scale, 1.0);
  store.setStyle('dot_scale', -3);
  assert.equal(store.getState().style.dot_scale, 0.1);

  store.setStyle('overlay.size_ratio', 0.9);
  assert.equal(store.getState().style.overlay.size_ratio, 0.35);

  store.setExport('pixel_size', '4096');
  assert.equal(store.getState().export.pixel_size, 2048);
  store.setExport('pixel_size', '1000.7');
  assert.equal(store.getState().export.pixel_size, 1001);
});

test('a value that is not a number is refused', () => {
  const store = new StateStore();
  assert.throws(() => store.setStyle('dot_scale', 'big'), ValidationError);
});

test('colours must be six-digit hex', () => {
  const store = new StateStore();
  store.setStyle('color_fg', '#1A2B3C');
  assert.equal(store.getState().style.color_fg, '#1A2B3C');
  assert.throws(() => store.setStyle('color_fg', 'red'), ValidationError);
  assert.throws(() => store.setStyle('overlay.color_bg', '#12345'), ValidationError);
});

test('enum settings reject values outside the allowed set', () => {
  const store = new StateStore();
  assert.throws(() => store.setStyle('module_shape', 'circles'), ValidationError);
  assert.throws(() => store.setStyle('overlay.kind', 'sticker'), ValidationError);
  assert.throws(() => store.setUi('mobile_view', 'both'), ValidationError);
  assert.throws(() => store.setUi('menu_open', 'yes'), ValidationError);
});

test('changing the overlay kind fills the emoji example or clears content', () => {
  const store = new StateStore();
  store.setStyle('overlay.kind', 'emoji');
  // The example symbol, U+1F642 slightly smiling face.
  assert.equal(store.getState().style.overlay.content, '\u{1F642}');

  store.setStyle('overlay.content', '+');
  assert.equal(store.getState().style.overlay.content, '+');

  store.setStyle('overlay.kind', 'image');
  assert.equal(store.getState().style.overlay.content, null);
});

test('subscribers are notified on every write and can unsubscribe', () => {
  const store = new StateStore();
  let notifications = 0;
  const stop = store.subscribe(() => {
    notifications += 1;
  });

  store.setStyle('dot_scale', 0.5);
  store.setStyle('dot_scale', 0.6);
  assert.equal(notifications, 2);

  stop();
  store.setStyle('dot_scale', 0.7);
  assert.equal(notifications, 2);
});

test('an unknown setting name is refused rather than silently added', () => {
  const store = new StateStore();
  assert.throws(() => store.setExport('colour', '#000000'), ValidationError);
  assert.throws(() => store.setUi('dark_mode', true), ValidationError);
});
