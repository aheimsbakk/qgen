/**
 * Shared inspection helpers for the unit suite.
 *
 * These read values back out of a finished symbol so tests can check what a
 * decoder would actually see, rather than what the encoder intended.
 */

import { gfMultiply } from '../../src/js/qr/reed-solomon.js';

/**
 * Read the 15 format bits from a symbol.
 * @param {import('../../src/js/qr/matrix.js').SymbolMatrix} matrix
 * @returns {number}
 */
export function readFormatBits(matrix) {
  let value = 0;
  for (let i = 0; i < 15; i += 1) {
    const [vRow, vCol] = matrix.formatVerticalPosition(i);
    const [hRow, hCol] = matrix.formatHorizontalPosition(i);
    const vertical = matrix.isDark(vRow, vCol) ? 1 : 0;
    const horizontal = matrix.isDark(hRow, hCol) ? 1 : 0;
    if (vertical !== horizontal) {
      throw new Error(`Format bit ${i} differs between the two copies in the symbol`);
    }
    value |= vertical << i;
  }
  return value;
}

/**
 * Read the 18 version bits from a symbol.
 * @param {import('../../src/js/qr/matrix.js').SymbolMatrix} matrix
 * @returns {number}
 */
export function readVersionBits(matrix) {
  let value = 0;
  for (let i = 0; i < 18; i += 1) {
    const row = Math.floor(i / 3);
    const col = (i % 3) + matrix.size - 11;
    const topRight = matrix.isDark(row, col) ? 1 : 0;
    const bottomLeft = matrix.isDark(col, row) ? 1 : 0;
    if (topRight !== bottomLeft) {
      throw new Error(`Version bit ${i} differs between the two blocks in the symbol`);
    }
    value |= topRight << i;
  }
  return value;
}

/** Binary digit count of a value. */
export function bitLength(value) {
  let length = 0;
  while (value !== 0) {
    length += 1;
    value >>>= 1;
  }
  return length;
}

/**
 * GF(2) remainder, written independently of the production module so tests can
 * confirm the production result instead of trusting it.
 */
export function binaryRemainder(value, generator) {
  const generatorLength = bitLength(generator);
  let remainder = value;
  while (bitLength(remainder) >= generatorLength) {
    remainder ^= generator << (bitLength(remainder) - generatorLength);
  }
  return remainder;
}

/** Count positions where two equal-length bit strings differ. */
export function hammingDistance(a, b) {
  let distance = 0;
  let diff = a ^ b;
  while (diff !== 0) {
    diff &= diff - 1;
    distance += 1;
  }
  return distance;
}

/**
 * Evaluate a polynomial whose coefficients run highest power first.
 * @param {number[]|Uint8Array} coefficients
 * @param {number} x Field element.
 * @returns {number}
 */
export function evaluatePolynomial(coefficients, x) {
  let total = 0;
  for (const coefficient of coefficients) {
    total = gfMultiply(total, x) ^ coefficient;
  }
  return total;
}
