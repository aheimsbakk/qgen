/**
 * Bit and codeword assembly for the symbol data region.
 * Presentation-free: this module knows nothing about versions or error levels.
 */

import { PAD_CODEWORD_A, PAD_CODEWORD_B } from './tables.js';

/** Ordered collection of bits that packs into 8-bit codewords. */
export class BitBuffer {
  #bits = [];

  /**
   * Append a single bit.
   * @param {boolean|number} bit
   */
  putBit(bit) {
    this.#bits.push(bit ? 1 : 0);
  }

  /**
   * Append the low `bitCount` bits of `value`, most significant first.
   * @param {number} value
   * @param {number} bitCount
   */
  put(value, bitCount) {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError(`Cannot encode ${value} as an unsigned bit field`);
    }
    if (bitCount < 32 && value >= 2 ** bitCount) {
      throw new RangeError(`${value} does not fit in ${bitCount} bits`);
    }
    for (let index = bitCount - 1; index >= 0; index -= 1) {
      this.putBit(((value >>> index) & 1) === 1);
    }
  }

  /** Total bits written so far. */
  get bitLength() {
    return this.#bits.length;
  }

  /**
   * Read one stored bit.
   * @param {number} index
   * @returns {number} 0 or 1.
   */
  bitAt(index) {
    return this.#bits[index];
  }

  /**
   * Pack the buffer into codewords, zero-filling an incomplete final byte.
   * @returns {number[]}
   */
  toCodewords() {
    const codewords = [];
    for (let index = 0; index < this.#bits.length; index += 8) {
      let byte = 0;
      for (let offset = 0; offset < 8; offset += 1) {
        byte = (byte << 1) | (this.#bits[index + offset] || 0);
      }
      codewords.push(byte);
    }
    return codewords;
  }
}

/**
 * Extend a codeword list to the required length with the standard terminator
 * and alternating padding bytes already applied by the caller.
 * @param {BitBuffer} buffer
 * @param {number} capacityCodewords Number of data codewords the symbol holds.
 */
export function padToCapacity(buffer, capacityCodewords) {
  const capacityBits = capacityCodewords * 8;
  if (buffer.bitLength > capacityBits) {
    throw new RangeError(
      `Data needs ${buffer.bitLength} bits but the symbol holds ${capacityBits}`
    );
  }

  // A terminator is only written when a full 4-bit indicator still fits.
  if (buffer.bitLength + 4 <= capacityBits) {
    buffer.put(0, 4);
  }

  while (buffer.bitLength % 8 !== 0) {
    buffer.putBit(0);
  }

  let padIndex = 0;
  while (buffer.bitLength < capacityBits) {
    buffer.put(padIndex % 2 === 0 ? PAD_CODEWORD_A : PAD_CODEWORD_B, 8);
    padIndex += 1;
  }
}
