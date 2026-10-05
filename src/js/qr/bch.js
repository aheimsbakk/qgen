/**
 * BCH error correction for the QR format and version information words.
 *
 * Format information is 15 bits: 5 data bits plus a 10-bit BCH remainder,
 * then XOR with a fixed pattern so every level/mask pair differs by at least
 * seven modules. Version information is 18 bits: 6 data bits plus a 12-bit
 * remainder, with no XOR mask.
 */

import { BCH_GENERATOR_FORMAT, BCH_GENERATOR_VERSION, FORMAT_INFO_MASK } from './tables.js';

function bitLength(value) {
  let length = 0;
  while (value !== 0) {
    length += 1;
    value >>>= 1;
  }
  return length;
}

/** Polynomial remainder over GF(2). */
function remainder(value, generator) {
  const generatorDigits = bitLength(generator);
  let result = value;
  while (bitLength(result) - generatorDigits >= 0) {
    result ^= generator << (bitLength(result) - generatorDigits);
  }
  return result;
}

/**
 * 15-bit format information word.
 * @param {number} data Five bits: two level bits then three mask bits.
 * @returns {number}
 */
export function bchFormat(data) {
  const shifted = data << 10;
  return (shifted | remainder(shifted, BCH_GENERATOR_FORMAT)) ^ FORMAT_INFO_MASK;
}

/**
 * 18-bit version information word.
 * @param {number} version 7 to 40.
 * @returns {number}
 */
export function bchVersion(version) {
  const shifted = version << 12;
  return shifted | remainder(shifted, BCH_GENERATOR_VERSION);
}
