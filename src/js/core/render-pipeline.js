/**
 * Render pipeline: validate, build the payload, encode, rasterise.
 *
 * The pipeline owns the debounce timer. Export actions call `renderNow()`
 * directly and skip the timer. Attempts run one at a time: `renderNow()`
 * finishes encoding and painting before it returns, so an older attempt can
 * never overtake a newer one and no stale result reaches the interface.
 */

import { getSchema } from './schema-registry.js';
import { encode, capacityFor, PayloadTooLargeError } from '../qr/encoder.js';
import { selectMode } from '../qr/mode-selector.js';

const DEBOUNCE_MS = 150;

/**
 * Error correction level policy.
 * An overlay removes modules the code needs, so the level rises to H.
 * @param {object} style
 * @returns {'L'|'M'|'Q'|'H'}
 */
export function errorLevelFor(style) {
  return style.overlay.kind !== 'none' && style.overlay.content ? 'H' : 'M';
}

/**
 * Payload length and the largest payload a single code holds at this level.
 * The interface shows these numbers before the user hits the capacity limit.
 * @param {string} payload
 * @param {'L'|'M'|'Q'|'H'} level
 * @returns {{chars: number, limit: number, level: string, mode: string}}
 */
export function payloadMeter(payload, level) {
  const mode = selectMode(payload);
  return { chars: payload.length, limit: capacityFor(level, mode), level, mode };
}

/** Pipeline that turns state into a painted symbol. */
export class RenderPipeline {
  /**
   * @param {{store: object, paint: Function, onResult: Function}} deps
   *   `paint(symbol, style)` draws the symbol. `onResult(result)` reports
   *   the outcome to the interface layer.
   */
  constructor({ store, paint, onResult }) {
    this.store = store;
    this.paint = paint;
    this.onResult = onResult;
    this.timer = null;
  }

  /**
   * Schedule a debounced render. Restart the timer on every change.
   */
  scheduleRender() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.renderNow();
    }, DEBOUNCE_MS);
  }

  /** Stop any pending render. Call on teardown. */
  cancel() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Run one render attempt immediately.
   * @returns {object} The result that was reported to the interface.
   */
  renderNow() {
    const state = this.store.getState();
    const schema = getSchema(state.schema_type);

    if (!schema) {
      return this.#report({
        status: 'error',
        message: `Content type "${state.schema_type}" is not available. Reload the page.`,
        errors: [],
        meter: null
      });
    }

    const level = errorLevelFor(state.style);
    // Build the payload before validating so the meter can count a form that
    // still has a field error. Every builder returns text for known fields.
    const payload = schema.buildPayload(state.fields);
    const meter = typeof payload === 'string' ? payloadMeter(payload, level) : null;

    const errors = schema.validate(state.fields);
    if (errors.length > 0) {
      const allRequiredEmpty = schema.fields
        .filter((field) => field.required)
        .every((field) => !state.fields[field.key]);
      return this.#report({
        status: allRequiredEmpty ? 'empty' : 'invalid',
        errors,
        message: null,
        meter
      });
    }

    try {
      const symbol = encode(payload, { level });
      this.paint(symbol, state.style);
      this.store.rememberPayload(payload);

      return this.#report({
        status: 'ready',
        errors: [],
        message: null,
        symbol: { version: symbol.version, level: symbol.level, maskIndex: symbol.maskIndex, mode: symbol.mode },
        payload,
        meter
      });
    } catch (error) {
      const message = error instanceof PayloadTooLargeError
        ? error.message
        : `Could not build the QR code: ${error.message}`;
      return this.#report({ status: 'error', errors: [], message, meter });
    }
  }

  /**
   * Encode the last valid payload at a new size for export.
   * @param {number} pixelSize
   * @param {Function} paintAtSize Paints the symbol at the requested size.
   * @returns {object|null} Null when nothing valid has been rendered yet.
   */
  buildExport(pixelSize, paintAtSize) {
    const state = this.store.getState();
    const payload = state.export.last_valid_payload;
    if (!payload) return null;

    const level = errorLevelFor(state.style);
    const symbol = encode(payload, { level });
    paintAtSize(symbol, state.style, pixelSize);
    return symbol;
  }

  /** Hand the result to the interface and return it to the caller. */
  #report(result) {
    this.onResult(result);
    return result;
  }
}
