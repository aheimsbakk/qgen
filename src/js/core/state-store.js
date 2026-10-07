/**
 * Sole owner of application state.
 *
 * Every write goes through a command here. Commands validate, clamp, or reject
 * using the rules in state-rules.js. Other modules read through `getState()`
 * and never assign to state fields, so writes stay serialised in one place.
 */

import { SCHEMAS, defaultFields } from './schema-registry.js';
import {
  COLOR_PATHS,
  MODULE_SHAPES,
  MOBILE_VIEWS,
  NUMBER_LIMITS,
  OVERLAY_EMOJI_EXAMPLE,
  OVERLAY_KINDS,
  PREVIEW_STATUSES,
  ValidationError,
  assertBoolean,
  assertColor,
  assertEnum,
  clampNumber
} from './state-rules.js';

// Re-exported so existing imports of ValidationError from this module keep working.
export { ValidationError };

/** Application state container with validated commands. */
export class StateStore {
  #state;
  #subscribers = new Set();

  constructor() {
    this.#state = {
      schema_type: 'url',
      fields: defaultFields('url'),
      style: {
        module_shape: 'square',
        dot_scale: 1.0,
        color_fg: '#000000',
        color_bg: '#FFFFFF',
        color_eye: '#000000',
        inherit_fg: true,
        overlay: {
          kind: 'none',
          content: null,
          color_bg: '#FFFFFF',
          color_fg: '#000000',
          transparent_bg: false,
          size_ratio: 0.2
        }
      },
      export: {
        pixel_size: 1024,
        last_valid_payload: null
      },
      ui: {
        mobile_view: 'settings',
        menu_open: false,
        about_open: false,
        preview_status: 'ready'
      }
    };
  }

  /**
   * Read the live state object. Treat it as read-only.
   * @returns {object}
   */
  getState() {
    return this.#state;
  }

  /**
   * Register a change listener.
   * @param {(state: object) => void} listener
   * @returns {() => void} Call to stop notifications.
   */
  subscribe(listener) {
    this.#subscribers.add(listener);
    return () => this.#subscribers.delete(listener);
  }

  /** Notify every subscriber with the current state. */
  notify() {
    for (const listener of this.#subscribers) {
      listener(this.#state);
    }
  }

  /**
   * Switch content type and fill its defaults so the preview stays valid.
   * @param {string} id
   */
  setSchemaType(id) {
    if (!SCHEMAS.some((schema) => schema.id === id)) {
      throw new ValidationError(`Unknown content type "${id}"`);
    }
    this.#state.schema_type = id;
    this.#state.fields = defaultFields(id);
    this.notify();
  }

  /**
   * Store one field value. Field rules are checked by the render pipeline.
   * @param {string} key
   * @param {string|boolean} value
   */
  setField(key, value) {
    if (typeof value !== 'string' && typeof value !== 'boolean') {
      throw new ValidationError(`Field "${key}" needs text or a checkbox value`);
    }
    if (this.#state.fields[key] === value) return;
    this.#state.fields[key] = value;
    this.notify();
  }

  /**
   * Update a style value. Accepts `overlay.size_ratio` for nested keys.
   * A write that changes nothing does not notify, so a render that writes
   * derived state cannot trigger another render.
   * @param {string} path
   * @param {number|string|boolean} value
   */
  setStyle(path, value) {
    const nested = path.startsWith('overlay.');
    const target = nested ? this.#state.style.overlay : this.#state.style;
    const key = nested ? path.slice('overlay.'.length) : path;

    if (key === 'module_shape') assertEnum(value, MODULE_SHAPES, 'Module shape');
    if (key === 'kind') assertEnum(value, OVERLAY_KINDS, 'Overlay kind');
    if (COLOR_PATHS.includes(path)) assertColor(value, path);

    // Limits are keyed by the full path so nested keys keep their own range.
    const next = path in NUMBER_LIMITS ? clampNumber(path, value) : value;
    if (target[key] === next) return;

    target[key] = next;
    // Content from a previous kind is meaningless for the new one. The emoji
    // kind starts with an example symbol so the preview shows something to edit.
    if (key === 'kind') {
      target.content = next === 'emoji' ? OVERLAY_EMOJI_EXAMPLE : null;
    }
    this.notify();
  }

  /**
   * Update an export setting. `last_valid_payload` is written by the pipeline
   * through `rememberPayload()`.
   * @param {string} key
   * @param {number|string} value
   */
  setExport(key, value) {
    if (!(key in this.#state.export)) {
      throw new ValidationError(`Unknown export setting "${key}"`);
    }
    const next = key === 'pixel_size' ? clampNumber('pixel_size', value) : value;
    if (this.#state.export[key] === next) return;
    this.#state.export[key] = next;
    this.notify();
  }

  /**
   * Record the payload the pipeline last confirmed. Deliberately silent: this
   * value is a result of a render, and notifying would start another render.
   * @param {string|null} payload
   */
  rememberPayload(payload) {
    if (payload !== null && typeof payload !== 'string') {
      throw new ValidationError('The last valid payload must be text or null');
    }
    this.#state.export.last_valid_payload = payload;
  }

  /**
   * Update an interface state value.
   * @param {string} key
   * @param {boolean|string} value
   */
  setUi(key, value) {
    if (!(key in this.#state.ui)) {
      throw new ValidationError(`Unknown interface setting "${key}"`);
    }
    if (key === 'mobile_view') assertEnum(value, MOBILE_VIEWS, 'Mobile view');
    if (key === 'preview_status') assertEnum(value, PREVIEW_STATUSES, 'Preview state');
    if (key === 'menu_open' || key === 'about_open') assertBoolean(value, key);
    if (this.#state.ui[key] === value) return;
    this.#state.ui[key] = value;
    this.notify();
  }
}
