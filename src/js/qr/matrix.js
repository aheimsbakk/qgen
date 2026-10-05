/**
 * Matrix construction: function patterns, reserved areas, and data placement.
 *
 * Reserved cells are marked before data is written so the zigzag path skips
 * them. Format information is written after a mask is chosen because its bits
 * depend on the mask index.
 */

import { ALIGNMENT_POSITIONS, EC_LEVEL_BITS } from './tables.js';
import { bchFormat, bchVersion } from './bch.js';

const FINDER_OFFSETS = [-1, 0, 1, 2, 3, 4, 5, 6, 7];

/** Square module grid with a reservation map for function patterns. */
export class SymbolMatrix {
  /**
   * @param {number} version 1 to 40.
   */
  constructor(version) {
    this.version = version;
    this.size = version * 4 + 17;
    this.modules = new Uint8Array(this.size * this.size);
    this.reserved = new Uint8Array(this.size * this.size);
    this.filled = new Uint8Array(this.size * this.size);
  }

  /** @returns {boolean} true when the module is dark. */
  isDark(row, col) {
    return this.modules[row * this.size + col] === 1;
  }

  /** @returns {boolean} true when the module is a function pattern or reserved. */
  isReserved(row, col) {
    return this.reserved[row * this.size + col] === 1;
  }

  /** Write a function module and mark it reserved. */
  setFunction(row, col, dark) {
    if (row < 0 || col < 0 || row >= this.size || col >= this.size) return;
    const index = row * this.size + col;
    this.modules[index] = dark ? 1 : 0;
    this.reserved[index] = 1;
  }

  /** Flip a data module. Ignored for reserved cells so masks cannot damage them. */
  flipData(row, col) {
    const index = row * this.size + col;
    if (this.reserved[index] === 1) return;
    this.modules[index] ^= 1;
  }

  /** Copy the grid so a mask trial can be discarded. */
  clone() {
    const copy = new SymbolMatrix(this.version);
    copy.modules.set(this.modules);
    copy.reserved.set(this.reserved);
    copy.filled.set(this.filled);
    return copy;
  }

  /** Finder pattern plus its separator ring, clipped to the symbol. */
  placeFinderPattern(top, left) {
    for (const r of FINDER_OFFSETS) {
      for (const c of FINDER_OFFSETS) {
        const row = top + r;
        const col = left + c;
        if (row < 0 || col < 0 || row >= this.size || col >= this.size) continue;
        const insideFinder = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const dark = insideFinder
          && (r === 0 || r === 6 || c === 0 || c === 6
            || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        this.setFunction(row, col, dark);
      }
    }
  }

  /** 5x5 alignment patterns. Centres inside a finder area are skipped. */
  placeAlignmentPatterns() {
    const positions = ALIGNMENT_POSITIONS[this.version - 1];
    for (const row of positions) {
      for (const col of positions) {
        if (this.isReserved(row, col)) continue;
        for (let r = -2; r <= 2; r += 1) {
          for (let c = -2; c <= 2; c += 1) {
            const dark = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
            this.setFunction(row + r, col + c, dark);
          }
        }
      }
    }
  }

  /** Alternating timing lines. Cells already taken by alignment patterns win. */
  placeTimingPatterns() {
    for (let i = 8; i < this.size - 8; i += 1) {
      if (!this.isReserved(i, 6)) this.setFunction(i, 6, i % 2 === 0);
      if (!this.isReserved(6, i)) this.setFunction(6, i, i % 2 === 0);
    }
  }

  /** Reserve the 31 format information cells and the fixed dark module. */
  reserveFormatAreas() {
    for (let i = 0; i < 15; i += 1) {
      this.setFunction(...this.formatVerticalPosition(i), false);
      this.setFunction(...this.formatHorizontalPosition(i), false);
    }
    this.setFunction(this.size - 8, 8, true);
  }

  /** Reserve the two version information blocks for version 7 and above. */
  reserveVersionAreas() {
    if (this.version < 7) return;
    for (let i = 0; i < 18; i += 1) {
      this.setFunction(Math.floor(i / 3), (i % 3) + this.size - 11, false);
      this.setFunction((i % 3) + this.size - 11, Math.floor(i / 3), false);
    }
  }

  formatVerticalPosition(bitIndex) {
    if (bitIndex < 6) return [bitIndex, 8];
    if (bitIndex < 8) return [bitIndex + 1, 8];
    return [this.size - 15 + bitIndex, 8];
  }

  formatHorizontalPosition(bitIndex) {
    if (bitIndex < 8) return [8, this.size - bitIndex - 1];
    if (bitIndex < 9) return [8, 15 - bitIndex];
    return [8, 14 - bitIndex];
  }

  /**
   * Write data codewords down the two-module zigzag, skipping reserved cells.
   * @param {number[]} codewords
   */
  placeData(codewords) {
    let bitIndex = 7;
    let byteIndex = 0;
    let upward = true;

    // Column 6 is the vertical timing pattern. Shifting the pair counter past
    // it keeps every other column pair intact.
    for (let col = this.size - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1;

      for (let step = 0; step < this.size; step += 1) {
        const row = upward ? this.size - 1 - step : step;
        for (const c of [col, col - 1]) {
          const index = row * this.size + c;
          if (this.reserved[index] === 1 || this.filled[index] === 1) continue;
          const codeword = byteIndex < codewords.length ? codewords[byteIndex] : 0;
          this.modules[index] = (codeword >>> bitIndex) & 1;
          this.filled[index] = 1;
          bitIndex -= 1;
          if (bitIndex === -1) {
            byteIndex += 1;
            bitIndex = 7;
          }
        }
      }
      upward = !upward;
    }
  }

  /**
   * Write the 15 format bits: level, mask index, BCH remainder, then the mask
   * pattern that keeps every level distinguishable.
   * @param {string} level 'L', 'M', 'Q' or 'H'.
   * @param {number} maskIndex 0 to 7.
   */
  writeFormatInfo(level, maskIndex) {
    const data = (EC_LEVEL_BITS[level] << 3) | maskIndex;
    const bits = bchFormat(data);
    for (let i = 0; i < 15; i += 1) {
      const bit = (bits >>> i) & 1;
      const [vRow, vCol] = this.formatVerticalPosition(i);
      const [hRow, hCol] = this.formatHorizontalPosition(i);
      this.modules[vRow * this.size + vCol] = bit;
      this.modules[hRow * this.size + hCol] = bit;
    }
  }

  /** Write both version information blocks for version 7 and above. */
  writeVersionInfo() {
    if (this.version < 7) return;
    const bits = bchVersion(this.version);
    for (let i = 0; i < 18; i += 1) {
      const bit = (bits >>> i) & 1;
      const row = Math.floor(i / 3);
      const col = (i % 3) + this.size - 11;
      this.modules[row * this.size + col] = bit;
      this.modules[col * this.size + row] = bit;
    }
  }
}
