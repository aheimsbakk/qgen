/**
 * Segment assembly: mode indicator, character count, payload bits, terminator
 * and padding. One segment per symbol; the mode selector guarantees the mode
 * can carry the whole payload.
 */

import { BitBuffer, padToCapacity } from './bit-buffer.js';
import { alphanumericValue } from './mode-selector.js';
import { MODE_INDICATORS, charCountBits, dataCodewordCapacity } from './tables.js';

/** Number of UTF-8 bytes in a string. */
function utf8Length(text) {
  return new TextEncoder().encode(text).length;
}

/**
 * Bits one payload needs in a given mode at a given version, terminator and
 * padding excluded. Returns a float so callers can compare against a bit budget.
 * @param {string} payload
 * @param {'numeric'|'alphanumeric'|'byte'} mode
 * @param {number} version 1 to 40.
 * @returns {number}
 */
export function dataBitLength(payload, mode, version) {
  const header = 4 + charCountBits(mode, version);
  if (mode === 'numeric') {
    const groups = Math.floor(payload.length / 3);
    const remainder = payload.length % 3;
    const remainderBits = remainder === 0 ? 0 : remainder === 1 ? 4 : 7;
    return header + groups * 10 + remainderBits;
  }
  if (mode === 'alphanumeric') {
    const pairs = Math.floor(payload.length / 2);
    const remainder = payload.length % 2;
    return header + pairs * 11 + (remainder ? 6 : 0);
  }
  return header + utf8Length(payload) * 8;
}

function writeNumeric(buffer, payload) {
  for (let index = 0; index + 3 <= payload.length; index += 3) {
    buffer.put(Number(payload.slice(index, index + 3)), 10);
  }
  const remainder = payload.length % 3;
  if (remainder === 1) {
    buffer.put(Number(payload.slice(-1)), 4);
  } else if (remainder === 2) {
    buffer.put(Number(payload.slice(-2)), 7);
  }
}

function writeAlphanumeric(buffer, payload) {
  for (let index = 0; index + 2 <= payload.length; index += 2) {
    const first = alphanumericValue(payload[index]);
    const second = alphanumericValue(payload[index + 1]);
    buffer.put(first * 45 + second, 11);
  }
  if (payload.length % 2 === 1) {
    buffer.put(alphanumericValue(payload[payload.length - 1]), 6);
  }
}

function writeByte(buffer, payload) {
  for (const byte of new TextEncoder().encode(payload)) {
    buffer.put(byte, 8);
  }
}

/**
 * Write the mode indicator, character count and payload bits for one segment.
 * @param {BitBuffer} buffer
 * @param {string} payload
 * @param {'numeric'|'alphanumeric'|'byte'} mode
 * @param {number} version 1 to 40.
 */
export function writeSegment(buffer, payload, mode, version) {
  buffer.put(MODE_INDICATORS[mode], 4);
  const count = mode === 'byte' ? utf8Length(payload) : payload.length;
  buffer.put(count, charCountBits(mode, version));

  if (mode === 'numeric') writeNumeric(buffer, payload);
  else if (mode === 'alphanumeric') writeAlphanumeric(buffer, payload);
  else writeByte(buffer, payload);
}

/**
 * Build the padded data codeword stream for a payload.
 * @param {string} payload
 * @param {'numeric'|'alphanumeric'|'byte'} mode
 * @param {number} version 1 to 40.
 * @param {string} level 'L', 'M', 'Q' or 'H'.
 * @returns {number[]} Data codewords, length equals the version capacity.
 */
export function buildDataCodewords(payload, mode, version, level) {
  const capacity = dataCodewordCapacity(version, level);
  const buffer = new BitBuffer();
  writeSegment(buffer, payload, mode, version);
  padToCapacity(buffer, capacity);
  return buffer.toCodewords();
}
