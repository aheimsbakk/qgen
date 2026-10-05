/**
 * Encoding mode choice.
 *
 * The engine writes one segment, so the cheapest mode that can represent the
 * whole payload is also the one that produces the fewest bits: numeric is
 * never wider than alphanumeric, and alphanumeric is never wider than byte.
 */

import { ALPHANUMERIC_EXTRA } from './tables.js';

const NUMERIC_PATTERN = /^[0-9]*$/;
const ALPHANUMERIC_PATTERN = /^[0-9A-Z $%*+\-./:]*$/;

/**
 * Classify a payload and return the mode with the smallest bit cost.
 * @param {string} payload
 * @returns {'numeric'|'alphanumeric'|'byte'}
 */
export function selectMode(payload) {
  if (payload.length === 0) return 'byte';
  if (NUMERIC_PATTERN.test(payload)) return 'numeric';
  if (ALPHANUMERIC_PATTERN.test(payload)) return 'alphanumeric';
  return 'byte';
}

/**
 * Report whether a character belongs to the alphanumeric set.
 * @param {string} character
 * @returns {boolean}
 */
export function isAlphanumericCharacter(character) {
  return ALPHANUMERIC_EXTRA.includes(character)
    || (character >= '0' && character <= '9')
    || (character >= 'A' && character <= 'Z');
}

/**
 * Return the alphanumeric code value for one character.
 * @param {string} character
 * @returns {number} 0 to 44.
 */
export function alphanumericValue(character) {
  if (character >= '0' && character <= '9') return character.charCodeAt(0) - 48;
  if (character >= 'A' && character <= 'Z') return character.charCodeAt(0) - 55;
  const index = ALPHANUMERIC_EXTRA.indexOf(character);
  if (index === -1) {
    throw new RangeError(`Character "${character}" is not in the alphanumeric set`);
  }
  return 36 + index;
}
