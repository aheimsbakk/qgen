import test from 'node:test';
import assert from 'node:assert/strict';

import { encode, capacityFor, symbolRows, PayloadTooLargeError } from '../../src/js/qr/encoder.js';
import { bchVersion } from '../../src/js/qr/bch.js';
import { EC_LEVEL_BITS } from '../../src/js/qr/tables.js';
import { readFormatBits, readVersionBits } from '../helpers/qr-inspect.js';

const LEVEL_BY_BITS = new Map(Object.entries(EC_LEVEL_BITS).map(([k, v]) => [v, k]));

/** Read the level and mask back out of a finished symbol. */
function readFormatInfo(symbol) {
  const word = readFormatBits(symbol.matrix);
  const unmasked = word ^ 0b101010000010010;
  const data = (unmasked >> 10) & 0x1f;
  return { level: LEVEL_BY_BITS.get((data >> 3) & 0x3), maskIndex: data & 0x7 };
}

test('alphanumeric payload picks version 1 and mask 0', () => {
  const symbol = encode('HELLO WORLD', { level: 'Q' });
  assert.equal(symbol.version, 1);
  assert.equal(symbol.size, 21);
  assert.equal(symbol.mode, 'alphanumeric');
  assert.equal(symbol.maskIndex, 0);
});

test('a link picks version 2 in byte mode', () => {
  const symbol = encode('https://sanntid.org', { level: 'M' });
  assert.equal(symbol.version, 2);
  assert.equal(symbol.mode, 'byte');
});

test('the symbol reports the level and mask it actually used', () => {
  for (const level of ['L', 'M', 'Q', 'H']) {
    const symbol = encode('https://sanntid.org', { level });
    const readBack = readFormatInfo(symbol);
    assert.equal(readBack.level, level);
    assert.equal(readBack.maskIndex, symbol.maskIndex);
  }
});

test('version information is written and readable from version 7 upward', () => {
  const payload = 'A'.repeat(200);
  const symbol = encode(payload, { level: 'L' });
  assert.ok(symbol.version >= 7, `expected version 7 or higher, got ${symbol.version}`);
  assert.equal(readVersionBits(symbol.matrix), bchVersion(symbol.version));
});

test('finder patterns stay intact after masking', () => {
  const symbol = encode('https://sanntid.org', { level: 'M' });
  const corners = [[0, 0], [0, symbol.size - 7], [symbol.size - 7, 0]];

  for (const [top, left] of corners) {
    for (let r = 0; r < 7; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const inCentre = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        assert.equal(
          symbol.matrix.isDark(top + r, left + c),
          onBorder || inCentre,
          `finder module (${r}, ${c}) is wrong`
        );
      }
    }
  }
});

test('the fixed dark module sits above the bottom-left finder', () => {
  for (const level of ['L', 'H']) {
    const symbol = encode('HELLO WORLD', { level });
    assert.equal(symbol.matrix.isDark(symbol.size - 8, 8), true);
  }
});

test('timing patterns alternate in a version 1 symbol', () => {
  const symbol = encode('HELLO WORLD', { level: 'Q' });
  for (let i = 8; i < symbol.size - 8; i += 1) {
    const expected = i % 2 === 0;
    assert.equal(symbol.matrix.isDark(6, i), expected, `row timing at ${i}`);
    assert.equal(symbol.matrix.isDark(i, 6), expected, `column timing at ${i}`);
  }
});

test('mask selection is deterministic', () => {
  const first = encode('Generated with QGen', { level: 'M' });
  const second = encode('Generated with QGen', { level: 'M' });
  assert.deepEqual(symbolRows(first.matrix), symbolRows(second.matrix));
});

test('capacity limits match the specification values', () => {
  assert.equal(capacityFor('L', 'byte'), 2953);
  assert.equal(capacityFor('H', 'byte'), 1273);
  assert.equal(capacityFor('L', 'numeric'), 7089);
  assert.equal(capacityFor('L', 'alphanumeric'), 4296);
});

test('oversized content is refused with a usable message', () => {
  assert.throws(
    () => encode('a'.repeat(1300), { level: 'H' }),
    (error) => {
      assert.ok(error instanceof PayloadTooLargeError);
      assert.equal(error.level, 'H');
      assert.equal(error.mode, 'byte');
      assert.equal(error.limit, 1273);
      assert.match(error.message, /Shorten the content or lower the level/);
      return true;
    }
  );
});

test('the largest byte payload still encodes at level L', () => {
  const symbol = encode('x'.repeat(2953), { level: 'L' });
  assert.equal(symbol.version, 40);
  assert.equal(symbol.size, 177);
});
