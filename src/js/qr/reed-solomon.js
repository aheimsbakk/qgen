/**
 * Error correction coding over GF(256).
 *
 * Data codewords are split into the blocks declared by the version table, each
 * block gets its own Reed-Solomon remainder, and the result is interleaved in
 * the order a decoder expects.
 */

import { ecBlocks } from './tables.js';

const PRIMITIVE_POLYNOMIAL = 0x11d;

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

// Log and antilog tables. Values above 255 wrap so multiplication never needs
// a modulo operation.
for (let i = 0; i < 8; i += 1) EXP[i] = 1 << i;
for (let i = 8; i < 256; i += 1) {
  EXP[i] = EXP[i - 4] ^ EXP[i - 5] ^ EXP[i - 6] ^ EXP[i - 8];
}
for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
for (let i = 0; i < 255; i += 1) LOG[EXP[i]] = i;

/** Multiply two field elements. Zero short-circuits because LOG[0] is undefined. */
export function gfMultiply(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** Raise a field element to a power. */
export function gfPow(base, exponent) {
  let result = 1;
  for (let i = 0; i < exponent; i += 1) result = gfMultiply(result, base);
  return result;
}

function polynomialMultiply(left, right) {
  const result = new Uint8Array(left.length + right.length - 1);
  for (let i = 0; i < left.length; i += 1) {
    for (let j = 0; j < right.length; j += 1) {
      result[i + j] ^= gfMultiply(left[i], right[j]);
    }
  }
  return result;
}

/**
 * Generator polynomial of the given degree, highest coefficient first.
 * Built as the product of (x - alpha^i) for i in 0..degree-1.
 * @param {number} degree Number of error correction codewords.
 * @returns {Uint8Array}
 */
export function generatorPolynomial(degree) {
  let polynomial = Uint8Array.from([1]);
  for (let i = 0; i < degree; i += 1) {
    polynomial = polynomialMultiply(polynomial, Uint8Array.from([1, gfPow(2, i)]));
  }
  return polynomial;
}

/**
 * Remainder of the data polynomial divided by the generator polynomial.
 * @param {number[]} dataCodewords
 * @param {number} ecCount
 * @returns {number[]} Error correction codewords, length ecCount.
 */
export function computeErrorCorrection(dataCodewords, ecCount) {
  const generator = generatorPolynomial(ecCount);
  const remainder = new Array(ecCount).fill(0);

  for (const codeword of dataCodewords) {
    const factor = codeword ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    for (let i = 0; i < ecCount; i += 1) {
      remainder[i] ^= gfMultiply(generator[i + 1], factor);
    }
  }

  return remainder;
}

/** Expand the two-group version table into an explicit block list. */
function blockLayout(version, level) {
  const blocks = [];
  for (const group of ecBlocks(version, level)) {
    for (let i = 0; i < group.count; i += 1) {
      blocks.push({ total: group.total, data: group.data, ec: group.total - group.data });
    }
  }
  return blocks;
}

/**
 * Split the data stream into blocks, encode each one, and interleave.
 * Shorter blocks simply drop out of a column once their codewords are used.
 * @param {number[]} dataCodewords
 * @param {number} version 1 to 40.
 * @param {string} level 'L', 'M', 'Q' or 'H'.
 * @returns {number[]} Full codeword sequence for the symbol.
 */
export function encodeDataBlocks(dataCodewords, version, level) {
  const blocks = blockLayout(version, level);

  const dataBlocks = [];
  const ecBlocksOut = [];
  let offset = 0;
  for (const block of blocks) {
    const slice = dataCodewords.slice(offset, offset + block.data);
    if (slice.length !== block.data) {
      throw new RangeError(
        `Block needs ${block.data} data codewords but only ${slice.length} remain`
      );
    }
    offset += block.data;
    dataBlocks.push(slice);
    ecBlocksOut.push(computeErrorCorrection(slice, block.ec));
  }

  const maxData = Math.max(...dataBlocks.map((block) => block.length));
  const maxEc = Math.max(...ecBlocksOut.map((block) => block.length));
  const output = [];

  for (let column = 0; column < maxData; column += 1) {
    for (const block of dataBlocks) {
      if (column < block.length) output.push(block[column]);
    }
  }
  for (let column = 0; column < maxEc; column += 1) {
    for (const block of ecBlocksOut) {
      if (column < block.length) output.push(block[column]);
    }
  }

  return output;
}
