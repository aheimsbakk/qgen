/**
 * Version choice: the smallest symbol that fits the payload at the required
 * error correction level.
 */

import { dataBitLength } from './data-encoder.js';
import { MAX_VERSION, charCountBits, dataCodewordCapacity } from './tables.js';

/**
 * Find the lowest version whose data capacity holds the payload.
 * @param {string} payload
 * @param {'numeric'|'alphanumeric'|'byte'} mode
 * @param {string} level 'L', 'M', 'Q' or 'H'.
 * @returns {number|null} Version 1 to 40, or null when no version fits.
 */
export function selectVersion(payload, mode, level) {
  for (let version = 1; version <= MAX_VERSION; version += 1) {
    const capacityBits = dataCodewordCapacity(version, level) * 8;
    if (dataBitLength(payload, mode, version) <= capacityBits) {
      return version;
    }
  }
  return null;
}

/**
 * Largest payload, in characters, that fits at a level in a single symbol.
 * Used by the interface to explain a capacity rejection.
 * @param {string} level 'L', 'M', 'Q' or 'H'.
 * @param {'numeric'|'alphanumeric'|'byte'} mode
 * @returns {number}
 */
export function maxPayloadLength(level, mode) {
  const capacityBits = dataCodewordCapacity(MAX_VERSION, level) * 8;
  const header = 4 + charCountBitsForMax(mode);
  if (mode === 'numeric') {
    const groups = Math.floor((capacityBits - header) / 10);
    const used = groups * 10;
    const leftover = capacityBits - header - used;
    const extra = leftover >= 7 ? 2 : leftover >= 4 ? 1 : 0;
    return groups * 3 + extra;
  }
  if (mode === 'alphanumeric') {
    const pairs = Math.floor((capacityBits - header) / 11);
    const leftover = capacityBits - header - pairs * 11;
    return pairs * 2 + (leftover >= 6 ? 1 : 0);
  }
  return Math.floor((capacityBits - header) / 8);
}

function charCountBitsForMax(mode) {
  // Version 40 always sits in the top band, so the widest count field applies.
  return mode === 'numeric' ? 14 : mode === 'alphanumeric' ? 13 : 16;
}
