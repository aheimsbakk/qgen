/**
 * Mask evaluation: build all eight candidates, score them with the four
 * standard penalty rules, and keep the lowest score.
 *
 * A mask only flips data modules. Function patterns stay intact so a decoder
 * can still find the finders, timing lines, and format information.
 */

/** The eight mask conditions, indexed by mask number. */
export const MASK_CONDITIONS = [
  (row, col) => (row + col) % 2 === 0,
  (row) => row % 2 === 0,
  (_row, col) => col % 3 === 0,
  (row, col) => (row + col) % 3 === 0,
  (row, col) => (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0,
  (row, col) => ((row * col) % 2) + ((row * col) % 3) === 0,
  (row, col) => (((row * col) % 2) + ((row * col) % 3)) % 2 === 0,
  (row, col) => (((row * col) % 3) + ((row + col) % 2)) % 2 === 0
];

/** Apply a mask to the data modules of a matrix in place. */
export function applyMask(matrix, maskIndex) {
  const condition = MASK_CONDITIONS[maskIndex];
  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (matrix.isReserved(row, col)) continue;
      if (condition(row, col)) matrix.flipData(row, col);
    }
  }
}

/** Rule 1: runs of five or more modules of one colour, per row and per column. */
function penaltyForRuns(matrix) {
  let penalty = 0;
  const scanLine = (get) => {
    for (let line = 0; line < matrix.size; line += 1) {
      let runValue = get(line, 0);
      let runLength = 1;
      for (let index = 1; index < matrix.size; index += 1) {
        if (get(line, index) === runValue) {
          runLength += 1;
          continue;
        }
        if (runLength >= 5) penalty += 3 + (runLength - 5);
        runValue = get(line, index);
        runLength = 1;
      }
      if (runLength >= 5) penalty += 3 + (runLength - 5);
    }
  };

  scanLine((row, col) => matrix.isDark(row, col));
  scanLine((col, row) => matrix.isDark(row, col));
  return penalty;
}

/** Rule 2: every 2x2 block of one colour costs 3. */
function penaltyForBlocks(matrix) {
  let penalty = 0;
  for (let row = 0; row < matrix.size - 1; row += 1) {
    for (let col = 0; col < matrix.size - 1; col += 1) {
      const value = matrix.isDark(row, col);
      if (matrix.isDark(row, col + 1) !== value) continue;
      if (matrix.isDark(row + 1, col) !== value) continue;
      if (matrix.isDark(row + 1, col + 1) !== value) continue;
      penalty += 3;
    }
  }
  return penalty;
}

// Finder-like 1:1:3:1:1 pattern with four light modules on at least one side.
const FINDER_LIKE_PATTERN = [1, 0, 1, 1, 1, 0, 1];
const LIGHT_RUN = [0, 0, 0, 0];

function matchesAt(get, start) {
  for (let i = 0; i < FINDER_LIKE_PATTERN.length; i += 1) {
    if (get(start + i) !== FINDER_LIKE_PATTERN[i]) return false;
  }
  return true;
}

function hasLightRunBefore(get, start, limit) {
  for (let i = 0; i < LIGHT_RUN.length; i += 1) {
    const index = start - 1 - i;
    if (index < 0) return true; // Symbol edge counts as the required light zone.
    if (get(index) !== 0) return false;
  }
  return true;
}

function hasLightRunAfter(get, start, limit) {
  const patternEnd = start + FINDER_LIKE_PATTERN.length;
  for (let i = 0; i < LIGHT_RUN.length; i += 1) {
    const index = patternEnd + i;
    if (index >= limit) return true;
    if (get(index) !== 0) return false;
  }
  return true;
}

/** Rule 3: finder-like patterns inside rows and columns cost 40 each. */
function penaltyForFinderLikePatterns(matrix) {
  let penalty = 0;
  const limit = matrix.size;

  const scanLine = (get) => {
    for (let start = 0; start + FINDER_LIKE_PATTERN.length <= limit; start += 1) {
      if (!matchesAt(get, start)) continue;
      const bounded = hasLightRunBefore(get, start, limit)
        || hasLightRunAfter(get, start, limit);
      if (bounded) penalty += 40;
    }
  };

  for (let line = 0; line < limit; line += 1) {
    scanLine((index) => (matrix.isDark(line, index) ? 1 : 0));
    scanLine((index) => (matrix.isDark(index, line) ? 1 : 0));
  }
  return penalty;
}

/** Rule 4: distance of the dark module share from 50 percent. */
function penaltyForBalance(matrix) {
  let dark = 0;
  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (matrix.isDark(row, col)) dark += 1;
    }
  }
  const total = matrix.size * matrix.size;
  const deviation = Math.abs((dark * 100) / total - 50);
  return Math.floor(deviation / 5) * 10;
}

/**
 * Total penalty score for a finished symbol.
 * @param {import('./matrix.js').SymbolMatrix} matrix
 * @returns {number}
 */
export function penaltyScore(matrix) {
  return penaltyForRuns(matrix)
    + penaltyForBlocks(matrix)
    + penaltyForFinderLikePatterns(matrix)
    + penaltyForBalance(matrix);
}

/**
 * Score all eight masks and return the best candidate.
 * @param {import('./matrix.js').SymbolMatrix} matrix Matrix with data placed.
 * @param {string} level 'L', 'M', 'Q' or 'H'.
 * @returns {{maskIndex: number, matrix: import('./matrix.js').SymbolMatrix, score: number}}
 */
export function selectMask(matrix, level) {
  let best = null;

  for (let maskIndex = 0; maskIndex < MASK_CONDITIONS.length; maskIndex += 1) {
    const candidate = matrix.clone();
    applyMask(candidate, maskIndex);
    candidate.writeFormatInfo(level, maskIndex);
    const score = penaltyScore(candidate);
    if (!best || score < best.score) {
      best = { maskIndex, matrix: candidate, score };
    }
  }

  return best;
}
