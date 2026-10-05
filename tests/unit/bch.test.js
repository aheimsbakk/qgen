import test from 'node:test';
import assert from 'node:assert/strict';

import { bchFormat, bchVersion } from '../../src/js/qr/bch.js';
import {
  BCH_GENERATOR_FORMAT,
  BCH_GENERATOR_VERSION,
  EC_LEVEL_BITS,
  FORMAT_INFO_MASK
} from '../../src/js/qr/tables.js';
import { binaryRemainder, hammingDistance } from '../helpers/qr-inspect.js';

const LEVELS = ['L', 'M', 'Q', 'H'];

// Worked example from the QR tutorial: level L (01) with mask 4 (100).
test('format word matches the published worked example', () => {
  assert.equal(bchFormat(0b01100), 0b110011000101111);
});

// Worked example for the (18, 6) Golay code: version 7.
test('version word matches the published worked example', () => {
  assert.equal(bchVersion(7), 0b000111110010010100);
});

test('generator polynomials match the specification values', () => {
  assert.equal(BCH_GENERATOR_FORMAT, 0b10100110111);
  assert.equal(BCH_GENERATOR_VERSION, 0b1111100100101);
  assert.equal(FORMAT_INFO_MASK, 0b101010000010010);
});

test('every format word is a valid BCH codeword', () => {
  for (const level of LEVELS) {
    for (let mask = 0; mask < 8; mask += 1) {
      const data = (EC_LEVEL_BITS[level] << 3) | mask;
      const word = bchFormat(data);
      assert.equal(word & ~0x7fff, 0, `level ${level} mask ${mask} exceeds 15 bits`);
      assert.equal(
        binaryRemainder(word ^ FORMAT_INFO_MASK, BCH_GENERATOR_FORMAT),
        0,
        `level ${level} mask ${mask} is not divisible by the generator`
      );
    }
  }
});

test('the 32 format words differ by at least seven modules', () => {
  const words = [];
  for (const level of LEVELS) {
    for (let mask = 0; mask < 8; mask += 1) {
      words.push(bchFormat((EC_LEVEL_BITS[level] << 3) | mask));
    }
  }

  assert.equal(new Set(words).size, 32);
  for (let i = 0; i < words.length; i += 1) {
    for (let j = i + 1; j < words.length; j += 1) {
      const distance = hammingDistance(words[i], words[j]);
      assert.ok(distance >= 7, `words ${i} and ${j} differ by only ${distance} modules`);
    }
  }
});

test('version words for versions 7 to 40 are valid codewords', () => {
  for (let version = 7; version <= 40; version += 1) {
    const word = bchVersion(version);
    assert.equal(word & ~0x3ffff, 0, `version ${version} exceeds 18 bits`);
    assert.equal(
      binaryRemainder(word, BCH_GENERATOR_VERSION),
      0,
      `version ${version} is not divisible by the generator`
    );
    assert.equal(word >> 12, version, `version ${version} is not recoverable from the word`);
  }
});
