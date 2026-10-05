/**
 * Render pipeline: validate, build the payload, encode, rasterise.
 *
 * The pipeline owns the debounce timer and the sequence guard. Export actions
 * call `renderNow()` directly and skip the timer.
 */

import { getSchema } from './schema-registry.js';
import { encode, PayloadTooLargeError } from '../qr/encoder.js';

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

/** Pipeline that turns state into a painted symbol. */
export class RenderPipeline {
  /**
   * @param {{store: object, paint: Function, onResult: Function}} deps
   *   `paint(symbol, style, size)` draws the symbol. `onResult(result)` reports
   *   the outcome to the interface layer.
   */
  constructor({ store, paint, onResult }) {
    this.store = store;
    this.paint = paint;
    this.onResult = onResult;
    this.timer = null;
    this.sequence = 0;
    this.lastSymbol = null;
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
    const attempt = ++this.sequence;
    const state = this.store.getState();
    const schema = getSchema(state.schema_type);

    if (!schema) {
      const result = {
        status: 'error',
        message: `Content type "${state.schema_type}" is not available. Reload the page.`,
        errors: []
      };
      this.#publish(attempt, result);
      return result;
    }

    const errors = schema.validate(state.fields);
    if (errors.length > 0) {
      const allRequiredEmpty = schema.fields
        .filter((field) => field.required)
        .every((field) => !state.fields[field.key]);
      const result = {
        status: allRequiredEmpty ? 'empty' : 'invalid',
        errors,
        message: null
      };
      this.#publish(attempt, result);
      return result;
    }

    const payload = schema.buildPayload(state.fields);
    const level = errorLevelFor(state.style);

    try {
      const symbol = encode(payload, { level });
      if (attempt !== this.sequence) return this.lastResult;

      this.paint(symbol, state.style);
      this.lastSymbol = symbol;
      this.store.rememberPayload(payload);

      const result = {
        status: 'ready',
        errors: [],
        message: null,
        symbol: { version: symbol.version, level: symbol.level, maskIndex: symbol.maskIndex, mode: symbol.mode },
        payload
      };
      this.#publish(attempt, result);
      return result;
    } catch (error) {
      const message = error instanceof PayloadTooLargeError
        ? error.message
        : `Could not build the QR code: ${error.message}`;
      const result = { status: 'error', errors: [], message };
      this.#publish(attempt, result);
      return result;
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

  #publish(attempt, result) {
    // A slower attempt that finished after a newer one must not overwrite it.
    if (attempt !== this.sequence) return;
    this.lastResult = result;
    this.onResult(result);
  }
}
