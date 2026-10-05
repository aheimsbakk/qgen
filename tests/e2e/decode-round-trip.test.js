import test from 'node:test';
import assert from 'node:assert/strict';

import { dumpSymbol, decodeDump } from '../helpers/decoder.js';
import { SCHEMAS, defaultFields } from '../../src/js/core/schema-registry.js';

/**
 * Decode round trip.
 *
 * Every payload the application can build is encoded by our engine, drawn to a
 * PNG, and read back by OpenCV. The decoded text must match the payload exactly.
 */

function payloadFor(id) {
  const schema = SCHEMAS.find((schema) => schema.id === id);
  return schema.buildPayload(defaultFields(id));
}

test('every content type decodes back to the same text', async () => {
  for (const schema of SCHEMAS) {
    const payload = payloadFor(schema.id);
    const dump = dumpSymbol(payload, 'M');
    const result = await decodeDump(dump, `roundtrip-${schema.id}`);

    assert.equal(result.ok, true, `${schema.id}: ${result.error}`);
    assert.equal(result.text, payload, `decoded text differs for ${schema.id}`);
  }
});

test('each error correction level decodes', async () => {
  const payload = 'https://sanntid.org/qgen/round-trip';

  for (const level of ['L', 'M', 'Q', 'H']) {
    const dump = dumpSymbol(payload, level);
    const result = await decodeDump(dump, `roundtrip-level-${level}`);
    assert.equal(result.ok, true, `level ${level}: ${result.error}`);
    assert.equal(result.text, payload);
  }
});

test('numeric, alphanumeric, and byte modes all decode', async () => {
  const cases = [
    ['numeric', '0123456789'.repeat(40)],
    ['alphanumeric', 'HELLO WORLD 12345 ABCDE FGHIJ'.repeat(8)],
    ['byte', 'Generated with QGen — round trip check'.repeat(4)]
  ];

  for (const [mode, payload] of cases) {
    const dump = dumpSymbol(payload, 'L');
    assert.equal(dump.mode, mode);
    const result = await decodeDump(dump, `roundtrip-mode-${mode}`);
    assert.equal(result.ok, true, `${mode}: ${result.error}`);
    assert.equal(result.text, payload);
  }
});

test('the largest byte payload decodes at level L', async () => {
  const payload = 'x'.repeat(2953);
  const dump = dumpSymbol(payload, 'L');
  assert.equal(dump.version, 40);

  const result = await decodeDump(dump, 'roundtrip-max-bytes');
  assert.equal(result.ok, true, result.error);
  assert.equal(result.text, payload);
});
