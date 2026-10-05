/**
 * Symbol engine entry point. Pure computation: no DOM, no canvas, no I/O.
 *
 * Order of work: pick the mode, pick the version, build the data stream,
 * compute error correction, build the matrix, choose the mask.
 */

import { SymbolMatrix } from './matrix.js';
import { buildDataCodewords } from './data-encoder.js';
import { encodeDataBlocks } from './reed-solomon.js';
import { selectMode } from './mode-selector.js';
import { maxPayloadLength, selectVersion } from './version-selector.js';
import { selectMask } from './masking.js';
import { MAX_VERSION } from './tables.js';

/** Raised when the payload cannot fit in one symbol at the requested level. */
export class PayloadTooLargeError extends Error {
  /**
   * @param {string} level 'L', 'M', 'Q' or 'H'.
   * @param {'numeric'|'alphanumeric'|'byte'} mode
   * @param {number} actual Number of characters in the payload.
   * @param {number} limit Maximum characters the level can carry.
   */
  constructor(level, mode, actual, limit) {
    super(
      `Content is ${actual} characters but a single QR code at error correction `
      + `level ${level} holds at most ${limit}. Shorten the content or lower the level.`
    );
    this.name = 'PayloadTooLargeError';
    this.code = 'payload_too_large';
    this.level = level;
    this.mode = mode;
    this.actual = actual;
    this.limit = limit;
  }
}

/** Raised when the engine is asked for something the standard does not define. */
export class SymbolEngineError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SymbolEngineError';
    this.code = 'symbol_engine_error';
  }
}

/**
 * Encode a payload into a finished QR symbol.
 * @param {string} payload Text to encode. Written to the symbol unchanged.
 * @param {{level?: 'L'|'M'|'Q'|'H'}} [options] Error correction level, default M.
 * @returns {{matrix: SymbolMatrix, size: number, version: number, level: string,
 *            maskIndex: number, mode: string, penalty: number}}
 */
export function encode(payload, options = {}) {
  const level = options.level ?? 'M';
  if (!['L', 'M', 'Q', 'H'].includes(level)) {
    throw new SymbolEngineError(`Unknown error correction level "${level}"`);
  }
  if (typeof payload !== 'string') {
    throw new SymbolEngineError('Payload must be a string');
  }

  const mode = selectMode(payload);
  const version = selectVersion(payload, mode, level);
  if (version === null) {
    const limit = maxPayloadLength(level, mode);
    throw new PayloadTooLargeError(level, mode, payload.length, limit);
  }

  const dataCodewords = buildDataCodewords(payload, mode, version, level);
  const codewords = encodeDataBlocks(dataCodewords, version, level);

  const matrix = new SymbolMatrix(version);
  matrix.placeFinderPattern(0, 0);
  matrix.placeFinderPattern(0, matrix.size - 7);
  matrix.placeFinderPattern(matrix.size - 7, 0);
  matrix.placeAlignmentPatterns();
  matrix.placeTimingPatterns();
  matrix.reserveFormatAreas();
  matrix.reserveVersionAreas();
  matrix.placeData(codewords);
  matrix.writeVersionInfo();

  const best = selectMask(matrix, level);
  if (!best) {
    throw new SymbolEngineError('Mask evaluation produced no candidate');
  }

  return {
    matrix: best.matrix,
    size: best.matrix.size,
    version,
    level,
    maskIndex: best.maskIndex,
    mode,
    penalty: best.score
  };
}

/**
 * Largest payload the engine can encode at a level, in characters.
 * @param {'L'|'M'|'Q'|'H'} level
 * @param {'numeric'|'alphanumeric'|'byte'} [mode]
 * @returns {number}
 */
export function capacityFor(level, mode = 'byte') {
  return maxPayloadLength(level, mode);
}

/**
 * Render a symbol grid as text rows. Used by the symbol unit suite.
 * @param {SymbolMatrix} matrix
 * @returns {string[]} One string per row, '#' dark and '.' light.
 */
export function symbolRows(matrix) {
  const rows = [];
  for (let row = 0; row < matrix.size; row += 1) {
    let line = '';
    for (let col = 0; col < matrix.size; col += 1) {
      line += matrix.isDark(row, col) ? '#' : '.';
    }
    rows.push(line);
  }
  return rows;
}

export { MAX_VERSION };
